/* ═══════ 마을 달력 — 15초마다 한 달, 3분이면 1년 ═══════
   달마다 계절 날씨: 12 · 1 · 2월 폭설(들판 · 나무 · 지붕 · 목표봉이 눈에 덮인다), 7월 장마, 6 · 8월 쨍쨍, 봄 · 가을 맑음.
   - 시작 달 = 실제 이번 달. 시간은 실제 흐른 시간으로 센다 (느린 휴대폰도 15초에 한 달). 탭을 숨기면 멈춘다.
   - 공포 · 탐욕 지수 날씨는 쓰지 않는다 (build.py 가 불러오기를 뺐다).
   - 눈 · 비 알갱이는 GPU 에서 카메라를 따라다니는 상자 안에서만 돈다 (CPU 반복 없음).
   - 색 · 눈 덮임 · 안개는 realismTick(렌더 직전) 을 감싸서 매 프레임 부드럽게 따라간다. */
'use strict';
(function(){
const MONTH_SEC=15;
// s 계절, snow · rain · cloud · sun = 목표 세기(0~1), w 날씨 글, t 기온
const MONTHS=[
 {s:'winter',snow:1,w:'❄️ 폭설',t:-9},{s:'winter',snow:.95,w:'❄️ 폭설',t:-6},{s:'spring',w:'🌤 맑음 · 눈이 녹아요',t:6},
 {s:'spring',w:'🌸 맑음',t:14},{s:'spring',cloud:.3,w:'🌼 산들바람',t:19},{s:'summer',sun:1,w:'☀️ 쨍쨍',t:28},
 {s:'summer',rain:1,w:'🌧 장마',t:27},{s:'summer',sun:1,w:'☀️ 쨍쨍 · 폭염',t:33},{s:'autumn',w:'🍂 맑음',t:24},
 {s:'autumn',cloud:.25,w:'🍁 단풍',t:16},{s:'autumn',rain:.5,w:'🌦 가을비',t:8},{s:'winter',snow:1,w:'❄️ 폭설',t:-3}];
const SEASON_ICON={spring:'🌸',summer:'☀️',autumn:'🍁',winter:'❄️'};
const now0=new Date(),Y0=now0.getFullYear();
const GT={t:now0.getMonth()*MONTH_SEC+.01,m:-1,last:performance.now()};
const monthIdx=()=>Math.floor(GT.t/MONTH_SEC)%12;
const W={snow:0,rain:0,cloud:0,sun:0,cover:0,wet:0};
const SNOWCOV={value:0};
prefs.season=true;prefs.realTime=true;
seasonOf=function(){return MONTHS[monthIdx()].s};
seasonTag=function(){return ' · '+(monthIdx()+1)+'월 '+SEASON_NAME[seasonOf()]};
window.gameDateText=function(){const m=monthIdx(),y=Y0+Math.floor(GT.t/MONTH_SEC/12);return `${y}년 ${m+1}월 · ${SEASON_NAME[MONTHS[m].s]} ${MONTHS[m].w}`};
window.gameMonth=()=>({m:monthIdx(),year:Y0+Math.floor(GT.t/MONTH_SEC/12),frac:(GT.t/MONTH_SEC)%1,...MONTHS[monthIdx()]});
// 낮 · 밤: 7달(105초)에 한 바퀴 — 12와 서로소라 해마다 같은 달이 늘 밤이 되지는 않는다. 낮을 65%로 늘린다
const DAY=MONTH_SEC*7;realClock=function(){const p=(GT.t/DAY+.35)%1,w=p<.65?p/.65*.6+.2:(p-.65)/.35*.4+.8;return (w%1)*dayNightCycle};
// 광장 날씨판 — 공포 · 탐욕 지수 대신 마을 달력
setWeather=function(){};
drawWeatherBoard=function(){if(!weatherBoardCtx)return;const x=weatherBoardCtx,Wd=512,H=256,m=monthIdx(),M=MONTHS[m],F='-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif';x.fillStyle='#fbf6e8';x.fillRect(0,0,Wd,H);x.fillStyle={spring:'#e98aa6',summer:'#e9a93a',autumn:'#c8743a',winter:'#6f9cc9'}[M.s];x.fillRect(0,0,Wd,18);x.textAlign='center';x.textBaseline='middle';x.fillStyle='#56756a';x.font=`700 30px ${F}`;x.fillText('DentPhoto 마을 날씨',Wd/2,60);x.fillStyle='#213e3c';x.font=`900 92px ${F}`;x.fillText((m+1)+'월',130,166);x.font=`800 40px ${F}`;x.fillText(M.w.replace(/^\S+\s/,''),350,150,300);x.font=`700 32px ${F}`;x.fillStyle='#71817c';x.fillText(M.t+'°C',350,204);weatherBoardTex.needsUpdate=true};

/* ── 눈 덮임 셰이더 — 나무 잎 · 들판 · 지붕의 위쪽 면에 눈 (목표봉은 등산로가 묻히지 않게 따로 색칠) ── */
const SNOW_GLSL=`{vec3 sN=inverseTransformDirection(normal,viewMatrix);vec3 sW=cameraPosition+(vec4(-vViewPosition,0.)*viewMatrix).xyz;
float sn=.5+.5*sin(sW.x*.83+2.*sin(sW.z*.61))*sin(sW.z*.97+1.7*sin(sW.x*.53));
float sc=uSnowCov*smoothstep(.05,.55,sN.y+(sn-.5)*.5+uSnowCov*.25);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.94,.96,.99)*(.94+.06*sn),sc);roughnessFactor=mix(roughnessFactor,.85,sc);}`;
function snowify(m){if(!m||m.userData.snowy||!m.isMeshStandardMaterial)return;m.userData.snowy=true;const prev=m.onBeforeCompile,pk=m.customProgramCacheKey;
  m.onBeforeCompile=function(sh,r){if(prev)prev.call(this,sh,r);sh.uniforms.uSnowCov=SNOWCOV;sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uSnowCov;').replace('#include <emissivemap_fragment>',SNOW_GLSL+'\n#include <emissivemap_fragment>')};
  m.customProgramCacheKey=function(){return (pk?pk.call(this):'')+'|snow'};m.needsUpdate=true}
const PAL_KEYS=['#79a566','#8bb575','#9abe7c','#9fbb7c','#5e8d63','#78a375'],FOLIAGE=['#79a566','#8bb575','#9abe7c','#507b59','#5e8d63','#78a375'],ROOFS=['#617f70','#bc795a','#386b5c','#4b8774','#7e8470'];
function snowifyAll(){[...FOLIAGE,'#9fbb7c',...ROOFS].forEach(k=>snowify(matCache.get(k)));snowify(terrain.material)}
snowifyAll();
let flowerBeds=[];function findBeds(){flowerBeds=[];scene.traverse(o=>{if(o.isInstancedMesh&&o.geometry&&o.geometry.type==='IcosahedronGeometry'&&o.geometry.parameters&&o.geometry.parameters.radius===.15)flowerBeds.push(o)})}
findBeds();
const _rv=rebuildVillage;rebuildVillage=function(){_rv.apply(this,arguments);try{snowifyAll();findBeds()}catch(e){console.error(e)}};

/* ── 계절 색 — 원래는 달이 바뀌면 한 번에 바뀌지만, 여기서는 매 프레임 조금씩 따라간다 ── */
const _tc=new THREE.Color(),_gc=new THREE.Color();
const _rs=realismSeason;realismSeason=function(){_gc.copy(grassMat.color);_rs();grassMat.color.copy(_gc)};
// 같은 계절 · 같은 눈 높이면 다시 칠하지 않는다 (산 정점 4만 개를 15초마다 다시 올리면 휴대폰이 끊긴다)
let seasonKey='';
applySeason=function(){const s=seasonOf(),m=monthIdx();window.gameSnowAt=m===0||m===1?-6:m===11?6:m===2?22:null;const key=s+'|'+window.gameSnowAt;if(key===seasonKey)return;seasonKey=key;realismSeason();coastSeason(s);
  _tc.copy(terrain.material.color);terrain.material.color.set((SEASON_COLORS[s]||{})['#9fbb7c']||'#9fbb7c');try{mtnRecolor()}catch(e){console.error(e)}terrain.material.color.copy(_tc)};

/* ── 눈 · 비 알갱이 (GPU) ── */
const touch=matchMedia('(hover:none)').matches;
const SN=touch?1600:3400,BOX=new THREE.Vector3(44,26,44);let gustAt=0;
function boxGeo(n,perDrop){const pos=new Float32Array(n*perDrop*3),rr=new Float32Array(n*perDrop),end=new Float32Array(n*perDrop);for(let i=0;i<n;i++){const x=Math.random()*BOX.x,y=Math.random()*BOX.y,z=Math.random()*BOX.z,r=Math.random();for(let j=0;j<perDrop;j++){const k=i*perDrop+j;pos[k*3]=x;pos[k*3+1]=y;pos[k*3+2]=z;rr[k]=r;end[k]=j}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('aR',new THREE.BufferAttribute(rr,1));g.setAttribute('aEnd',new THREE.BufferAttribute(end,1));g.boundingSphere=new THREE.Sphere(new THREE.Vector3(),1e6);return g}
const SU={uT:{value:0},uC:{value:new THREE.Vector3()},uBox:{value:BOX},uWind:{value:new THREE.Vector2(3.4*.35,1.2*.35)},uGust:{value:new THREE.Vector2()},uFall:{value:2.4},uSize:{value:.3},uScale:{value:400},uAmt:{value:0},uCol:{value:new THREE.Color(1,1,1)},uMap:{value:dotTex}};
const snowLayer=new THREE.Points(boxGeo(SN,1),new THREE.ShaderMaterial({uniforms:SU,transparent:true,depthWrite:false,
  vertexShader:`uniform float uT,uFall,uSize,uScale;uniform vec3 uC,uBox;uniform vec2 uWind,uGust;attribute float aR;varying float vA;
  void main(){float t=uT*(.7+.6*aR);vec3 p=position;p.y-=t*uFall;p.xz+=uWind*t+uGust*(.7+.6*aR)+vec2(sin(uT*1.3+aR*40.),cos(uT*1.1+aR*31.))*.8;
  vec3 o=uC-uBox*.5;p=o+mod(p-o,uBox);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;float d=-mv.z;
  gl_PointSize=min(uSize*(.55+.9*aR)*uScale/max(d,.1),30.);vA=smoothstep(.5,2.,d)*(1.-smoothstep(uBox.x*.32,uBox.x*.5,d));}`,
  fragmentShader:`uniform sampler2D uMap;uniform vec3 uCol;uniform float uAmt;varying float vA;void main(){float a=texture2D(uMap,gl_PointCoord).a*vA*uAmt;if(a<.02)discard;gl_FragColor=vec4(uCol,a);}`}));
const RN=touch?1200:2600,RU={uT:{value:0},uC:{value:new THREE.Vector3()},uBox:{value:BOX},uWind:{value:new THREE.Vector2()},uAmt:{value:0},uCol:{value:new THREE.Color('#b9cfdc')}};
const rainLayer=new THREE.LineSegments(boxGeo(RN,2),new THREE.ShaderMaterial({uniforms:RU,transparent:true,depthWrite:false,
  vertexShader:`uniform float uT;uniform vec3 uC,uBox;uniform vec2 uWind;attribute float aR,aEnd;varying float vA;
  void main(){float t=uT*(1.+.4*aR);vec3 p=position;p.y-=t*19.;p.xz+=uWind*t;vec3 o=uC-uBox*.5;p=o+mod(p-o,uBox);p+=aEnd*vec3(uWind.x*.045,-.95,uWind.y*.045);
  vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;float d=-mv.z;vA=smoothstep(.5,2.,d)*(1.-smoothstep(uBox.x*.3,uBox.x*.5,d))*(.55+.45*aEnd);}`,
  fragmentShader:`uniform vec3 uCol;uniform float uAmt;varying float vA;void main(){float a=vA*uAmt*.5;if(a<.02)discard;gl_FragColor=vec4(uCol,a);}`}));
[snowLayer,rainLayer].forEach(o=>{o.frustumCulled=false;o.userData.noAO=true;o.userData.world=true;o.layers.set(1);o.visible=false;scene.add(o)});camera.layers.enable(1);
const _dbs=new THREE.Vector2();

/* ── 매 프레임 (렌더 직전) ── */
const _rt=realismTick,_fc=new THREE.Color(),SNOW_FOG=new THREE.Color('#e6ecf1'),RAIN_FOG=new THREE.Color('#7d8a90');let lastMode='',lastSeason='',lastBadge='',wasPaused=false;
function badge(){const m=monthIdx(),M=MONTHS[m],el=$('#ghDate');if(!el)return;const y=Y0+Math.floor(GT.t/MONTH_SEC/12),t=`📅 ${y}년 ${m+1}월 · ${M.w}`;if(t!==lastBadge){lastBadge=t;el.textContent=t;el.title=gameDateText()+` · ${M.t}°C · 15초마다 한 달`;el.dataset.season=M.s}const bar=$('#ghDateBar');if(bar)bar.style.width=((GT.t/MONTH_SEC)%1*100).toFixed(1)+'%'}
realismTick=function(dt){_rt(dt);try{
  const now=performance.now(),real=Math.min(.25,(now-GT.last)/1000);GT.last=now;if(!document.hidden&&!GT.hold)GT.t+=real;
  const m=monthIdx(),M=MONTHS[m];
  if(m!==GT.m){const first=GT.m<0;GT.m=m;drawWeatherBoard();if(first)applySeason();else setTimeout(applySeason,60);
    if(GT.quiet){GT.quiet=false}else if(!first&&M.s!==lastSeason)toast({winter:'❄️ 겨울이 왔어요 — 폭설이 쏟아져요!',spring:'🌸 봄이에요 — 눈이 녹고 꽃이 펴요',summer:'☀️ 여름이에요 — 햇볕이 쨍쨍, 7월엔 장마!',autumn:'🍁 가을이에요 — 단풍이 들어요'}[M.s]);lastSeason=M.s}
  badge();
  const k=1-Math.exp(-real/2.2),gust=.82+.18*Math.sin(time*.5)*Math.sin(time*1.7);
  W.snow+=((M.snow||0)*gust-W.snow)*k;W.rain+=((M.rain||0)-W.rain)*k;W.cloud+=((M.cloud||0)-W.cloud)*k;W.sun+=((M.sun||0)-W.sun)*k;
  W.cover=Math.max(0,Math.min(1,W.cover+(W.snow>.2?W.snow*.16:-(m===2?.07:.3))*real));
  W.wet+=((W.rain>.2?1:0)-W.wet)*(1-Math.exp(-real/4));
  const mode=W.snow>.15?'snow':W.rain>.15?'rain':W.cloud>.15?'clouds':'neutral';weatherMode=mode;weatherIntensity=Math.max(W.snow,W.rain,W.cloud*.6);
  if(mode!==lastMode){lastMode=mode;try{dressChibis()}catch{}if(cloudGroup)cloudGroup.traverse(o=>{if(o.isMesh)o.material.color.set(mode==='snow'?'#d3d9dd':mode==='rain'?'#6f7a7e':'#f4f6f7')})}
  const pal=SEASON_COLORS[M.s]||{};PAL_KEYS.forEach(key=>{const mm=matCache.get(key);if(mm){_tc.set(pal[key]||key);if(key==='#9fbb7c')_tc.multiplyScalar(1-.14*W.wet);mm.color.lerp(_tc,k)}});
  grassMat.color.lerp(_tc.set(GRASS_SEASON[M.s]),k);terrain.material.roughness=.97-.4*W.wet;
  SNOWCOV.value=W.cover;COAST.snow.value=Math.max(W.cover,M.s==='winter'?.6:0);
  flowerBeds.forEach(b=>b.visible=W.cover<.35);
  if(snowPoints)snowPoints.visible=false;if(rainPoints)rainPoints.visible=false;
  // 알갱이
  const light=prefs.light;renderer.getDrawingBufferSize(_dbs);SU.uScale.value=_dbs.y*.5;
  SU.uT.value=time%3000;SU.uC.value.copy(camera.position);{const gd=Math.max(0,Math.min(.1,time-gustAt));gustAt=time;const u=SU.uGust.value;u.x=(u.x+3.4*W.snow*gust*1.2*gd)%BOX.x;u.y=(u.y+1.2*W.snow*gust*1.2*gd)%BOX.z}SU.uAmt.value=Math.min(1,W.snow*1.5);SU.uCol.value.setScalar(.4+.6*FX.day);
  snowLayer.geometry.setDrawRange(0,Math.floor(SN*Math.min(1,W.snow*1.15)*(light?.5:1)));snowLayer.visible=W.snow>.02;
  RU.uT.value=time%3000;RU.uC.value.copy(camera.position);RU.uWind.value.set(1.6,.6);RU.uAmt.value=Math.min(1,W.rain*1.4);RU.uCol.value.set('#b9cfdc').multiplyScalar(.45+.55*FX.day);
  rainLayer.geometry.setDrawRange(0,2*Math.floor(RN*Math.min(1,W.rain*1.1)*(light?.5:1)));rainLayer.visible=W.rain>.02;
  // 폭설 · 장대비 — 걸을 때는 하얗게(회색으로) 뿌옇게, 위에서 볼 때는 살짝만
  const walk=cameraMode==='walking'||cameraMode==='entering'||window.dpYachtOn,b=W.snow*(walk?.9:.28)+W.rain*(walk?.45:.15);
  if(b>.01){scene.fog.near=THREE.MathUtils.lerp(scene.fog.near,6,b);scene.fog.far=THREE.MathUtils.lerp(scene.fog.far,walk?80:260,b);
    _fc.copy(W.rain>W.snow?RAIN_FOG:SNOW_FOG).multiplyScalar(.25+.75*FX.day);scene.fog.color.lerp(_fc,Math.min(1,b*1.1));if(scene.background&&scene.background.isColor)scene.background.copy(scene.fog.color)}
  if(skyMesh)skyMesh.visible=FX.level>=1&&b<.5;
  if(W.sun>.01){sun.intensity*=1+.3*W.sun;renderer.toneMappingExposure=(FX.level>=1?1.02:1.18)*(1+.08*W.sun);if(skyMesh&&skyMesh.material.uniforms){const su=skyMesh.material.uniforms;if(su.turbidity)su.turbidity.value=THREE.MathUtils.lerp(su.turbidity.value,2.2,W.sun)}}
  else renderer.toneMappingExposure=FX.level>=1?1.02:1.18;
  if(W.snow>.3||W.rain>.3)cloudGroup.visible=true;
}catch(e){console.error(e)}};
// 요트를 타는 동안: 화창한 4월 한낮으로 고정하고 시간을 멈춘다 (내리면 타기 전 시각으로 돌아간다)
// 417.375 = 4월(3번 달) 안이면서 하루 주기(105초)의 정오 — (t/105+.35)%1 = .325
function holdSpring(){if(GT.hold)return;GT.saved=GT.t;GT.hold=true;GT.quiet=monthIdx()!==3;GT.t=417.375;W.snow=W.rain=W.cloud=W.sun=0;W.cover=0;W.wet=0;SNOWCOV.value=0}
function release(){if(!GT.hold)return;GT.hold=false;GT.quiet=Math.floor(GT.saved/MONTH_SEC)%12!==monthIdx();GT.t=GT.saved}
window.dpSeason={GT,W,MONTHS,MONTH_SEC,holdSpring,release};
applySeason();drawWeatherBoard();
const _uw=updateWeather;updateWeather=function(){const wi=weatherIntensity;weatherIntensity=0;try{return _uw.apply(this,arguments)}finally{weatherIntensity=wi}};
})();
