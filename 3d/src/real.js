/* ═══════ 실사 화질 — 사진 재질 · 하늘빛(HDRI) · 선명한 그림자 · 물 · 구름 · 빛줄기 ═══════
   도움말의 "🎞️ 실사 화질" 줄로 켜고 끈다(컴퓨터는 켜짐, 휴대폰은 꺼짐으로 시작 · 기기에 기억). 가볍게 모드면 쓰지 않는다.
   켜면 3d/assets/real/ 의 사진 무늬(잔디 · 돌길 · 회벽 · 나무 · 돌 · 모래 · 물결)와 공원 하늘빛(.hdr)을 받아서
   - 재질: 코드로 그린 무늬 대신 사진 무늬를 입힌다(재질 색 · 계절 색은 그대로, 결만 사진). 해안 모래 · 바위에도 사진 무늬.
   - 빛: 땅 · 지평선 쪽 주변광을 실제 공원 사진의 빛으로(하늘은 지금 시각의 하늘 그대로), 그림자 지도는 4배 촘촘하게.
   - 화면: 미니어처 초점 흐림을 끄고, 사진 같은 색 대비(AgX) · 옅은 필름 입자 · 해를 볼 때 빛줄기.
   - 물 · 하늘: 사진 물결로 바다 · 호수 반사를 또렷하게, 하늘에는 바람 따라 흐르는 구름층(날씨 · 시각에 맞춰).
   캐릭터 모양은 건드리지 않는다. 끄면 원래 무늬 · 설정으로 돌아간다. 사진 출처는 3d/assets/real/CREDITS.md. */
'use strict';
(function(){
if(typeof FXA==='undefined'||!FXA)return;
const KEY='asset-village-3d-real',BASE='assets/real/';
const coarse=matchMedia('(pointer:coarse)').matches||innerWidth<760;
const CFG={tm:'aces',exp:1,sat:.97,macro:1};
const R={on:false,loaded:false,loading:false,active:false,tex:null,hdr:null};
try{const v=localStorage.getItem(KEY);if(v!==null)R.on=v==='1'}catch{}
const maxAniso=Math.min(8,renderer.capabilities.getMaxAnisotropy?renderer.capabilities.getMaxAnisotropy():4);

/* ── 사진 무늬 받기 ── */
const LOOKS={grass:.42,paving:.9,plaster:1,wood:1,stone:.75};   // 사진 한 장이 덮는 넓이(원래 무늬 대비 반복 배율)
function loadImg(name){return new Promise((ok,no)=>{const im=new Image();im.decoding='async';im.onload=()=>ok(im);im.onerror=no;im.src=BASE+name})}
function mk(im,srgb,rep){const t=new THREE.Texture(im);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=maxAniso;if(rep)t.repeat.copy(rep);t.needsUpdate=true;return t}
async function load(){if(R.loaded||R.loading)return;R.loading=true;hud();
  try{const names=[];Object.keys(LOOKS).forEach(k=>names.push(k+'_c.jpg',k+'_n.jpg'));names.push('sand_c.jpg','water_n.jpg');
    const ims=await Promise.all(names.map(loadImg)),I={};names.forEach((n,i)=>I[n]=ims[i]);
    const T={swap:new Map(),back:new Map()};
    for(const [k,f] of Object.entries(LOOKS)){const rep=TEX[k].repeat.clone().multiplyScalar(f),c=mk(I[k+'_c.jpg'],true,rep),n=mk(I[k+'_n.jpg'],false,rep);T.swap.set(TEX[k],c);T.swap.set(NRM[k],n);T.back.set(c,TEX[k]);T.back.set(n,NRM[k])}
    T.sand=mk(I['sand_c.jpg'],true);T.rock=T.swap.get(TEX.stone);T.rockN=T.swap.get(NRM.stone);
    T.lake=mk(I['water_n.jpg'],false);T.sea=mk(I['water_n.jpg'],false);T.sea.repeat.set(1300,1300);
    R.tex=T;
    await loadHdr();
    R.loaded=true}catch(e){console.error('실사 화질 자료를 받지 못했어요',e);toast('실사 화질 자료를 받지 못했어요 — 잠시 뒤 다시 켜 보세요');R.on=false}
  R.loading=false;apply()}
function loadHdr(){return new Promise(ok=>{if(!window.dpRGBELoader)return ok();new dpRGBELoader().load(BASE+'sky_park_1k.hdr',t=>{t.mapping=THREE.EquirectangularReflectionMapping;t.minFilter=t.magFilter=THREE.LinearFilter;t.generateMipmaps=false;
    // 아래쪽(땅) 밝기를 재서 원래 땅빛(#6f8a5a 정도)에 맞춘다
    try{const d=t.image.data,w=t.image.width,h=t.image.height,half=d.constructor===Uint16Array,g=half?(v=>THREE.DataUtils.fromHalfFloat(v)):(v=>v);let s=0,n=0;for(let y=Math.floor(h*.55);y<h;y+=4)for(let x=0;x<w;x+=4){const i=(y*w+x)*4;s+=g(d[i])*.2126+g(d[i+1])*.7152+g(d[i+2])*.0722;n++}
      // flipY 로 올리므로 데이터의 아래쪽 줄이 땅 — 그래도 혹시 모르니 위 · 아래 중 어두운 쪽을 땅으로 본다
      let s2=0,n2=0;for(let y=0;y<h*.45;y+=4)for(let x=0;x<w;x+=4){const i=(y*w+x)*4;s2+=g(d[i])*.2126+g(d[i+1])*.7152+g(d[i+2])*.0722;n2++}
      const low=Math.min(s/n,s2/n2);ENV.U.uGain.value=.16/Math.max(.01,low)}catch(e){ENV.U.uGain.value=1}
    ENV.U.uHdr.value=t;R.hdr=t;ok()},undefined,e=>{console.error(e);ok()})})}

/* ── 하늘빛(환경광) — 원래 하늘 상자 위에 공원 사진을 겹친다: 땅 · 지평선은 사진, 위쪽 하늘은 지금 시각의 하늘 ── */
const ENV={U:{uHdr:{value:null},uGain:{value:1},uTint:{value:new THREE.Color(1,1,1)},uUp:{value:.14},uDown:{value:1}}};
ENV.mesh=new THREE.Mesh(new THREE.SphereGeometry(1,48,24),new THREE.ShaderMaterial({uniforms:ENV.U,side:THREE.BackSide,depthWrite:false,depthTest:false,transparent:true,
  vertexShader:'varying vec3 vDir;void main(){vDir=(modelMatrix*vec4(position,0.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`uniform sampler2D uHdr;uniform float uGain,uUp,uDown;uniform vec3 uTint;varying vec3 vDir;
  void main(){vec3 d=normalize(vDir);vec2 uv=vec2(atan(d.z,d.x)*.15915494+.5,asin(clamp(d.y,-1.,1.))*.31830989+.5);
    vec3 c=min(texture2D(uHdr,uv).rgb,vec3(4.))*uGain*uTint;float w=mix(uDown,uUp,smoothstep(-.03,.22,d.y));gl_FragColor=vec4(c,w);}`}));
ENV.mesh.scale.setScalar(100);ENV.mesh.renderOrder=5;ENV.mesh.visible=false;ENV.mesh.frustumCulled=false;if(envScene)envScene.add(ENV.mesh);
const _tint=new THREE.Color();
const _re=refreshEnv;refreshEnv=function(force){const on=R.active&&!!R.hdr;ENV.mesh.visible=on;if(envGround)envGround.visible=!on;
  if(on){const sky=scene.fog.color,mx=Math.max(sky.r,sky.g,sky.b,.001);_tint.setRGB(sky.r/mx,sky.g/mx,sky.b/mx);ENV.U.uTint.value.setRGB(1,1,1).lerp(_tint,.35).multiplyScalar(.06+.94*FX.day)}
  return _re(force)};

/* ── 해안 모래 · 바위에도 사진 무늬 (땅 재질의 해안 셰이더에 덧붙인다) ── */
const SH={uMacro:{value:1},uReal:{value:0},uSandTex:{value:null},uRockTex:{value:null}};
(function(){const m=terrain.material,prev=m.onBeforeCompile,pk=m.customProgramCacheKey;
  m.onBeforeCompile=function(sh,r){if(prev)prev.call(this,sh,r);Object.assign(sh.uniforms,SH);
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uReal;\nuniform float uMacro;\nfloat rh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat rn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(rh(i),rh(i+vec2(1.,0.)),f.x),mix(rh(i+vec2(0.,1.)),rh(i+vec2(1.,1.)),f.x),f.y);}\nuniform sampler2D uSandTex;\nuniform sampler2D uRockTex;\nvec3 realTri(sampler2D t,vec3 p,float s){vec3 n=abs(normalize(cross(dFdx(p),dFdy(p))));n=pow(n,vec3(4.));n/=n.x+n.y+n.z;return texture2D(t,p.zy*s).rgb*n.x+texture2D(t,p.xz*s).rgb*n.y+texture2D(t,p.xy*s).rgb*n.z;}')
      .replace('#include <map_fragment>','#include <map_fragment>\nif(uReal>.5){float mA=rn(vSw.xz*.045)*.6+rn(vSw.xz*.13)*.3+rn(vSw.xz*.5)*.1;float mB=rn(vSw.xz*.021+7.3);diffuseColor.rgb*=mix(vec3(1.),mix(vec3(.8,.84,.78),vec3(1.1,1.06,.9),mA)*mix(vec3(1.),vec3(1.08,1.,.8),smoothstep(.55,.85,mB)*.8),uMacro);}')
      .replace('vec3 rk=uRock*(.8+.3*gn)','vec3 rk=uRock*mix(.8+.3*gn,1.12*dot(realTri(uRockTex,vSw,.16),vec3(.3333)),uReal)')
      .replace('vec3 sd=uSand*(.94+.09*gn)','vec3 sd=uSand*mix(.94+.09*gn,1.04*dot(uReal>.5?texture2D(uSandTex,vSw.xz*.22).rgb:vec3(1.),vec3(.3333)),uReal)')};
  m.customProgramCacheKey=function(){return (pk?pk.call(this):'')+'|real'};m.needsUpdate=true})();

/* ── 재질 무늬 바꾸기 — 같은 무늬를 쓰는 재질을 모두 찾아 사진 무늬로(끄면 원래대로) ── */
function swapMaps(to){const map=to?R.tex.swap:R.tex.back,seen=new Set();
  const fix=m=>{if(!m||seen.has(m))return;seen.add(m);if(m.map&&map.has(m.map))m.map=map.get(m.map);if(m.normalMap&&map.has(m.normalMap))m.normalMap=map.get(m.normalMap)};
  if(typeof matCache!=='undefined')matCache.forEach(fix);
  scene.traverse(o=>{if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(fix)})}
const _dm=dressMat;dressMat=function(c,m){const r=_dm(c,m);if(R.active&&R.tex){if(m.map&&R.tex.swap.has(m.map))m.map=R.tex.swap.get(m.map);if(m.normalMap&&R.tex.swap.has(m.normalMap))m.normalMap=R.tex.swap.get(m.normalMap)}return r};

/* ── 물 — 사진 물결 · 더 매끈한 바다(하늘이 또렷하게 비친다) ── */
const OCEAN0={rough:ocean.material.roughness,ns:ocean.material.normalScale.clone(),env:ocean.material.envMapIntensity};
let LAKE0=null;
function dressWater(on){const om=ocean.material;
  if(on){om.normalMap=R.tex.sea;om.roughness=.1;om.normalScale.set(.55,.55);om.envMapIntensity=1.35}
  else{om.normalMap=oceanN;om.roughness=OCEAN0.rough;om.normalScale.copy(OCEAN0.ns);om.envMapIntensity=OCEAN0.env}
  if(water){const u=water.material.uniforms;if(!LAKE0)LAKE0={n:u.normalSampler.value,d:u.distortionScale.value,s:u.size.value};
    if(on){u.normalSampler.value=R.tex.lake;u.distortionScale.value=2.6;u.size.value=1.3}else{u.normalSampler.value=LAKE0.n;u.distortionScale.value=LAKE0.d;u.size.value=LAKE0.s}}}

/* ── 구름층 — 바람 따라 흐르는 뭉게구름(카메라 위 높은 하늘, 날씨 · 시각 · 해 방향에 맞춰 빛깔) ── */
const CU={uT:{value:0},uCov:{value:.4},uSun:{value:new THREE.Vector3()},uLit:{value:new THREE.Color()},uShade:{value:new THREE.Color()},uCam:{value:new THREE.Vector3()},uFar:{value:2600},uFade:{value:0}};
const clouds=new THREE.Mesh(new THREE.PlaneGeometry(6000,6000),new THREE.ShaderMaterial({uniforms:CU,transparent:true,depthWrite:false,fog:false,side:THREE.DoubleSide,
  vertexShader:'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
  fragmentShader:`uniform float uT,uCov,uFar,uFade;uniform vec3 uSun,uLit,uShade,uCam;varying vec3 vW;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
  float fbm(vec2 p){float a=.5,s=0.;mat2 r=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<6;i++){s+=a*n(p);p=r*p+vec2(3.1,1.7);a*=.5;}return s;}
  float dens(vec2 p){float b=fbm(p*.35+vec2(uT*.004,0.));float d=fbm(p+vec2(uT*.012,uT*.005))*.65+b*.55;float lo=.84-.5*uCov;return smoothstep(lo,lo+.2,d);}
  void main(){vec2 p=vW.xz*.0026;float d=dens(p);if(d<.004)discard;
    vec2 sd=normalize(uSun.xz+vec2(1e-4))*.09;float d2=dens(p+sd);
    float lit=clamp(.62+(d-d2)*2.4-d*.28,0.,1.);vec3 c=mix(uShade,uLit,lit);
    float dist=length(vW.xz-uCam.xz);float fade=1.-smoothstep(uFar*.35,uFar,dist);
    gl_FragColor=vec4(c,d*fade*uFade);}`}));
clouds.rotation.x=-Math.PI/2;clouds.frustumCulled=false;clouds.renderOrder=-.5;clouds.visible=false;clouds.userData.noAO=true;scene.add(clouds);
const _dawn=new THREE.Color('#ffb487'),_noon=new THREE.Color('#ffffff'),_nightC=new THREE.Color('#1a2238'),_sh=new THREE.Color();
function cloudTick(dt){const W=window.dpSeason?dpSeason.W:{cloud:0,rain:0,snow:0,sun:0};const skyOn=!!skyMesh&&skyMesh.visible;
  const want=R.active&&skyOn?1:0;CU.uFade.value+=(want-CU.uFade.value)*Math.min(1,dt*1.5);clouds.visible=CU.uFade.value>.01;if(!clouds.visible)return;
  CU.uT.value=time%100000;CU.uCov.value=Math.max(.18,Math.min(.95,.48+.4*W.cloud+.45*Math.max(W.rain,W.snow)-.2*W.sun));
  CU.uSun.value.copy(SUN_DIR);CU.uCam.value.copy(camera.position);clouds.position.set(camera.position.x,Math.max(230,camera.position.y+160),camera.position.z);
  const day=FX.day,el=Math.max(0,SUN_DIR.y),warm=1-Math.min(1,el/.35),gloom=Math.max(W.rain,W.snow*.8,W.cloud*.5);
  CU.uLit.value.copy(_noon).lerp(_dawn,warm*.8).lerp(_nightC,1-day).multiplyScalar((.25+2.3*day)*(1-.5*gloom));
  _sh.set('#8792a6').lerp(_nightC,1-day);CU.uShade.value.copy(_sh).multiplyScalar((.2+1.05*day)*(1-.4*gloom))}

/* ── 빛줄기 · 사진 색감 — 블룸 다음, 원래 색 보정 앞에 끼운다 ── */
const RaysShader={uniforms:{tDiffuse:{value:null},uSun:{value:new THREE.Vector2(.5,.5)},uRay:{value:0},uAsp:{value:1},uTh:{value:1.15},uCol:{value:new THREE.Color('#ffe7c2')},uGrain:{value:.025},uT:{value:0},uSat:{value:.94}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`uniform sampler2D tDiffuse;uniform vec2 uSun;uniform float uRay,uAsp,uTh,uGrain,uT,uSat;uniform vec3 uCol;varying vec2 vUv;
  float hs(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  void main(){vec3 col=texture2D(tDiffuse,vUv).rgb;
    if(uRay>.001){vec2 st=(uSun-vUv)/48.;vec2 p=vUv+st*hs(vUv*913.+uT);float il=1.;vec3 acc=vec3(0.);
      for(int i=0;i<48;i++){p+=st;vec2 q=clamp(p,vec2(.001),vec2(.999));vec3 s=texture2D(tDiffuse,q).rgb;float l=dot(s,vec3(.2126,.7152,.0722));acc+=min(s,vec3(8.))*smoothstep(uTh,uTh*2.,l)*il;il*=.955;}
      float r=length((vUv-uSun)*vec2(uAsp,1.));col+=acc/48.*uCol*uRay*(1.-smoothstep(.0,1.1,r));}
    float l=dot(col,vec3(.2126,.7152,.0722));col=max(mix(vec3(l),col,uSat),0.);
    col*=1.+(hs(vUv*vec2(1731.,977.)+fract(uT*.61))-.5)*uGrain;
    gl_FragColor=vec4(col,1.);}`};
let rayPass=null;
function ensurePass(){if(rayPass||!composer||!gradePass)return;rayPass=new FXA.ShaderPass(RaysShader);const i=composer.passes.indexOf(gradePass);composer.insertPass(rayPass,i<0?composer.passes.length-1:i);rayPass.enabled=false}
const _sp=new THREE.Vector3(),_cd=new THREE.Vector3();
function rayTick(){if(!rayPass)return;rayPass.enabled=R.active;if(!R.active)return;const U=rayPass.uniforms;U.uT.value=(time%100)*1.7;U.uAsp.value=innerWidth/innerHeight;
  const W=window.dpSeason?dpSeason.W:{rain:0,snow:0,cloud:0};camera.getWorldDirection(_cd);const face=_cd.dot(SUN_DIR);
  _sp.copy(camera.position).addScaledVector(SUN_DIR,800).project(camera);const ok=face>0&&SUN_DIR.y>-.02&&!(skyMesh&&!skyMesh.visible);
  U.uSun.value.set(_sp.x*.5+.5,_sp.y*.5+.5);const off=Math.max(0,Math.max(Math.abs(_sp.x),Math.abs(_sp.y))-1);
  const want=ok?Math.max(0,1-off*1.2)*THREE.MathUtils.smoothstep(face,.15,.6)*Math.min(1,SUN_DIR.y*6+.3)*(1-.85*Math.max(W.rain,W.snow,W.cloud*.6))*.85:0;U.uRay.value+=(want-U.uRay.value)*.08;
  U.uCol.value.set('#ffe7c2').lerp(_dawn,Math.max(0,1-SUN_DIR.y/.3)*.8)}

/* ── 켜기 · 끄기 ── */
const SHADOW0=sun.shadow.mapSize.x;
function setShadow(n){if(sun.shadow.mapSize.x===n)return;sun.shadow.mapSize.set(n,n);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}renderer.shadowMap.needsUpdate=true}
function apply(){const can=R.on&&R.loaded&&FX.level>=1&&!!composer;if(can)ensurePass();
  if(can===R.active){hud();return}R.active=can;
  swapMaps(can);dressWater(can);SH.uReal.value=can?1:0;SH.uSandTex.value=R.tex.sand;SH.uRockTex.value=R.tex.rock;
  setShadow(can&&!coarse?4096:SHADOW0);
  renderer.toneMapping=can&&CFG.tm==='agx'?THREE.AgXToneMapping:THREE.ACESFilmicToneMapping;
  if(!can){clouds.visible=false;CU.uFade.value=0;if(rayPass)rayPass.enabled=false}
  refreshEnv(true);hud()}
function set(on){R.on=on;try{localStorage.setItem(KEY,on?'1':'0')}catch{}if(on&&!R.loaded)load();else apply()}

// 원래 효과 설정이 바뀌면(가볍게 모드 · 느린 기기) 다시 맞춘다
const _af=applyFx;applyFx=function(){_af();try{apply()}catch(e){console.error(e)}};
// 미니어처 초점 흐림 끄기 · 바다 물결 흐르기
const _rt=realismTick;realismTick=function(dt){_rt(dt);try{if(!R.active)return;
  if(gradePass){gradePass.uniforms.uAmount.value=0;gradePass.uniforms.uVig.value=.26}
  R.tex.sea.offset.set(oceanN.offset.x*.62,oceanN.offset.y*.62);
  renderer.toneMappingExposure*=CFG.exp;if(rayPass)rayPass.uniforms.uSat.value=CFG.sat;SH.uMacro.value=CFG.macro}catch(e){console.error(e)}};
// 그릴 때만: 만화 구름 덩어리는 숨기고(구름층이 대신), 빛줄기 · 구름을 맞춘다
const _rs=renderScene;renderScene=function(){if(!R.active)return _rs();const cg=typeof cloudGroup!=='undefined'&&cloudGroup;const was=cg?cg.visible:false;if(cg)cg.visible=false;try{rayTick()}catch(e){console.error(e)}
  try{return _rs()}finally{if(cg)cg.visible=was}};
let lastT=performance.now();
const _ue=updateExtras;updateExtras=function(dt){_ue(dt);try{const now=performance.now(),rdt=Math.min(.1,(now-lastT)/1000);lastT=now;cloudTick(rdt);
  // 실사: 해는 조금 세게 · 주변광은 조금 약하게 — 그림자가 사진처럼 또렷해진다(밤낮 계산이 매 프레임 새로 정한 값에 곱한다)
  if(R.active){sun.intensity*=1.15;hemi.intensity*=.7}}catch(e){console.error(e)}};

/* ── 도움말 한 줄 ── */
$('#ghTip').insertAdjacentHTML('beforebegin','<div class="gh-row" id="ghRealRow"><span><b>🎞️ 실사 화질</b><small id="ghReal"></small></span><button class="gh-btn soft" id="ghRealBtn">켜기</button></div>');
$('#ghRealBtn').onclick=()=>{set(!R.on);toast(R.on?'🎞️ 실사 화질을 켰어요 — 사진 재질 · 하늘빛 · 구름 · 빛줄기':'실사 화질을 껐어요 — 원래 동화풍 화면이에요')};
function hud(){const el=$('#ghReal'),b=$('#ghRealBtn');if(!el)return;
  el.textContent=FX.level<1?'가볍게 모드에서는 쓰지 않아요':R.loading?'사진 재질을 받는 중…':R.active?'켜짐 · 사진 재질 · 구름 · 빛줄기':R.on?'켜는 중…':'꺼짐 · 동화풍 화면';
  b.textContent=R.on?'끄기':'켜기'}
hud();
if(R.on)setTimeout(load,400);
window.dpReal={R,CFG,set,apply,ENV,CU,clouds,SH,get pass(){return rayPass}};
})();
