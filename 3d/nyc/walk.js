/* 뉴욕 거리 산책 (DentPhoto 마을 3D · /asset/3d/nyc/) — ../ride 의 뉴욕 시내 장면(빌딩 · 보도 · 신호등 · 사람들 · 마을 친구 18명 · 물웅덩이 · 블렌더 키트)을
   걷는 배치(walk-city.js)로 두 번(맨해튼 금융가 · 브루클린 덤보) 그리고, 명소(nyc-landmarks.js)를 더한다. 차는 지나가지 않는다.
   - 시간: ../ride/city-env.js 를 그대로 쓴다(진행도 p 하나로 봄 → 여름 → 가을 → 겨울, 정오 → 자정 → 정오). 걷는 동안 시간이 흘러 p 가 돈다(한 바퀴 10분, ⏩ 5배).
   - 조작: WASD · 화살표(카메라 기준) · Shift 달리기 · 마우스 끌기 · 휠 · G 혼자 걷기 · T 시간 빠르게 · H 사진 모드. 터치: 왼쪽 아래 막대 · 화면 끌기.
   - 마을(3d/src/nyc.js)에서 iframe 으로 열면 ✕ 로 postMessage {dpNyc:'close'}. 시험용 window.nycDebug */
'use strict';
(()=>{
const T=THREE,$=id=>document.getElementById(id),embedded=window.parent!==window,canvas=$('game');
const touch=matchMedia('(pointer:coarse)').matches;if(touch)document.body.classList.add('touch');
let renderer;
try{renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'})}catch(e){document.querySelector('.welcome h2').textContent='3D 화면을 열 수 없어요.';document.querySelector('.welcome p').textContent='WebGL 을 지원하는 브라우저에서 하드웨어 가속을 켜고 다시 열어 주세요.';return}
renderer.setPixelRatio(Math.min(devicePixelRatio,touch?1.5:1.75));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();scene.background=new T.Color('#b9d3e6');scene.fog=new T.Fog('#c9d8e2',140,860);
const camera=new T.PerspectiveCamera(58,innerWidth/innerHeight,.15,4200);
const hemi=new T.HemisphereLight('#fff5dc','#7f8a86',2.3);scene.add(hemi);
const sun=new T.DirectionalLight('#fff0cf',3.2);sun.castShadow=true;sun.shadow.mapSize.set(touch?1024:2048,touch?1024:2048);Object.assign(sun.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:1,far:420});sun.shadow.bias=-.0003;sun.shadow.normalBias=.04;scene.add(sun,sun.target);
const YC=3.8;

// ── 두 동네: 맨해튼 금융가(배터리 파크 → 브로드웨이 → 월스트리트 → 브루클린 브릿지 입구) · 브루클린 덤보(다리 끝 → 워싱턴 스트리트 → 워터 스트리트 → 공원)
const KIT='../ride/nyc/';
const C1=NYC_WALK_CITY.make({V:[[0,16],[0,170],[190,170],[190,330],[245,330]],names:['BROADWAY','WALL ST','WATER ST','PEARL ST'],
 lights:[{k:0,d:61},{k:1,d:52},{k:2,d:56}],crossStreets:[{k:0,d:75,from:-60,to:60,name:'EXCHANGE PL'},{k:1,d:66,from:-75,to:90,name:'BROAD ST · NASSAU ST'},{k:2,d:70,from:-60,to:60,name:'JOHN ST'}],
 BB:{r0:-200,r1:330,f0:-22,f1:440},EXCL:[],NOB:[[-34,34,-22,16],[30,61,114,161],[78,110,179,210],[-102,-49.5,144,198],[-190,-140,315,365],[212,335,306,354]],
 vents:[[0,110],[1,120],[2,40]],stacks:[[1,150],[2,110]]});
const C2=NYC_WALK_CITY.make({V:[[805,330],[845,330],[845,540],[755,540]],names:['CADMAN PLAZA','WASHINGTON ST','WATER ST'],
 lights:[{k:1,d:76}],crossStreets:[{k:1,d:90,from:-50,to:60,name:'FRONT ST'}],
 BB:{r0:700,r1:1010,f0:296,f1:600},EXCL:[[690,745.5,350,612],[690,1010,590,612]],NOB:[[690,812,300,360],[880,1010,512,600]],
 vents:[[1,150]],stacks:[[1,40]],npc:false,brick:24,noCenter:true});
for(const C of [C1,C2])C.kitBase=KIT;
const S1=CITY_SCENE.build({T,scene,C:C1}),S2=CITY_SCENE.build({T,scene,C:C2});
S1.group.visible=S2.group.visible=true;
const AREAS=[{C:C1,S:S1,ride:{pos:0,speed:0,mode:'playing',player:0,branchChoice:'safe',city:C1.newState()}},{C:C2,S:S2,ride:{pos:0,speed:0,mode:'playing',player:0,branchChoice:'safe',city:C2.newState()}}];
const L=NYC_LANDMARKS.build({T,scene,YC});
// 덤보 워싱턴 스트리트: 옛 화물 철길이 박힌 화강암 돌길
const cobble=(()=>{const cv=document.createElement('canvas');cv.width=cv.height=256;const x=cv.getContext('2d');x.fillStyle='#4a4644';x.fillRect(0,0,256,256);
 for(let j=0;j<8;j++)for(let i=0;i<6;i++){const o=(j%2)*21,c=88+((i*7+j*13)%5)*9;x.fillStyle=`rgb(${c},${c-4},${c-8})`;const px=i*43+o-4,py=j*32+2;x.beginPath();x.roundRect?x.roundRect(px+2,py+2,38,27,6):x.rect(px+2,py+2,38,27);x.fill();x.fillStyle='rgba(255,255,255,.06)';x.fillRect(px+6,py+5,22,4)}
 const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(14/3.2,14/3.2);t.anisotropy=8;return t})();
function dumboStreet(){const m=S2.asMat;if(!m)return;m.map=cobble;m.normalMap=null;m.color.setScalar(1.1);m.needsUpdate=true}
dumboStreet();
{const rail=new T.MeshStandardMaterial({color:'#5b5b5c',metalness:.8,roughness:.35});for(const dx of [-.75,.75]){const m=new T.Mesh(new T.BoxGeometry(.12,.06,248),rail);m.position.set(845+dx,YC+.05,-(330+580)/2);m.receiveShadow=true;scene.add(m)}}

// ── 나: 빨간 점퍼에 작은 배낭
const ME=CITY_PEOPLE.make({T,g:scene,max:1}),meLook={top:'#d2483c',leg:'#2a3a52',skin:'#f1c7a5',hair:'#2b1d14',long:false,coat:false,h:1.02,ph:0};
const pack=new T.Mesh(new T.BoxGeometry(.38,.48,.2),new T.MeshStandardMaterial({color:'#f2c14e',roughness:.7}));pack.castShadow=true;scene.add(pack);
const P={R:0,F:-104,y:YC+.1,yaw:Math.atan2(160,-616),v:0,wp:0};   // yaw: 바라보는 방향(-Z 앞) — 처음엔 자유의 여신상 쪽
function standAt(R,F,curY){
 if(L.blocked(R,F))return null;
 const by=L.bridgeWalk(R,F);let gy=null;
 const st=R<500?C1.onStreet(R,F):C2.onStreet(R,F);if(st)gy=YC+(st.road?.02:.24);else if(L.inArea(R,F))gy=YC+.12;
 if(curY===null||curY===undefined){if(by!==null)return by;return gy}
 const ok=y=>y!==null&&Math.abs(y-curY)<1.1;
 if(ok(by)&&ok(gy))return Math.abs(by-curY)<Math.abs(gy-curY)?by:gy;if(ok(by))return by;if(ok(gy))return gy;return null}

// ── 카메라가 빌딩 속으로 들어가지 않게: 빌딩 바닥 칸(20 u 격자)에 빌딩 · 명소 건물을 넣어 두고 사람 → 카메라 선을 따라 확인
const GRID=new Map(),gkey=(i,j)=>i*100003+j;
for(const b of [...S1.blds,...S2.blds].map(b=>[b.r0,b.r1,b.f0,b.f1,YC+b.h*1.25+2]).concat(L.SOLID))for(let i=Math.floor(b[0]/20);i<=Math.floor(b[1]/20);i++)for(let j=Math.floor(b[2]/20);j<=Math.floor(b[3]/20);j++){const k=gkey(i,j);if(!GRID.has(k))GRID.set(k,[]);GRID.get(k).push(b)}
function solid(R,F,y){const l=GRID.get(gkey(Math.floor(R/20),Math.floor(F/20)));if(!l)return false;for(const b of l)if(R>b[0]-.3&&R<b[1]+.3&&F>b[2]-.3&&F<b[3]+.3&&y<b[4])return true;return false}
// ── 카메라(사람 뒤 · 끌어서 돌리기 · 휠로 멀리/가까이)
const cam={yaw:P.yaw,pitch:.2,dist:touch?10:9,drag:0,look:new T.Vector3(),pos:new T.Vector3()};
let dragging=null;
canvas.addEventListener('pointerdown',e=>{if(stick.id===e.pointerId)return;dragging={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!dragging||dragging.id!==e.pointerId)return;const dx=e.clientX-dragging.x,dy=e.clientY-dragging.y;dragging.x=e.clientX;dragging.y=e.clientY;cam.yaw-=dx*.0055;cam.pitch=Math.max(-.12,Math.min(1.25,cam.pitch+dy*.004));cam.drag=1.6});
canvas.addEventListener('pointerup',e=>{if(dragging&&dragging.id===e.pointerId)dragging=null});canvas.addEventListener('pointercancel',()=>dragging=null);
canvas.addEventListener('wheel',e=>{cam.dist=Math.max(3.5,Math.min(34,cam.dist*(1+Math.sign(e.deltaY)*.1)));e.preventDefault()},{passive:false});
// ── 키보드 · 터치 막대
const keys=new Set();let run=false;
addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys.add(k);if(started){if(k==='g')toggleTour();if(k==='t')toggleSpeed();if(k==='h')togglePhoto()}if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault()});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());
const stick={id:null,x:0,y:0,cx:0,cy:0,el:$('stick'),knob:$('stick-knob')};
stick.el.addEventListener('pointerdown',e=>{stick.id=e.pointerId;const r=stick.el.getBoundingClientRect();stick.cx=r.left+r.width/2;stick.cy=r.top+r.height/2;stick.el.setPointerCapture(e.pointerId);moveStick(e);e.stopPropagation()});
stick.el.addEventListener('pointermove',e=>{if(e.pointerId===stick.id)moveStick(e)});
const endStick=e=>{if(e.pointerId!==stick.id)return;stick.id=null;stick.x=stick.y=0;stick.knob.style.transform=''};stick.el.addEventListener('pointerup',endStick);stick.el.addEventListener('pointercancel',endStick);
function moveStick(e){let dx=e.clientX-stick.cx,dy=e.clientY-stick.cy;const l=Math.hypot(dx,dy),m=46;if(l>m){dx*=m/l;dy*=m/l}stick.x=dx/m;stick.y=dy/m;stick.knob.style.transform=`translate(${dx}px,${dy}px)`}
$('run').addEventListener('click',()=>{run=!run;$('run').classList.toggle('on',run)});

// ── 시간 · 계절 (../ride/city-env.js 그대로) · 날씨 효과
const CYCLE=600;let envP=.03,tSpeed=1,E=CITY_ENV.env(envP);
const flakeTex=(()=>{const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d'),g=x.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.45,'rgba(255,255,255,.85)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,32,32);return new T.CanvasTexture(c)})();
const FLAKES=1500,snowPos=new Float32Array(FLAKES*3),snowGeo=new T.BufferGeometry();snowGeo.setAttribute('position',new T.BufferAttribute(snowPos,3));
const snowMat=new T.PointsMaterial({color:'#ffffff',map:flakeTex,size:.26,transparent:true,opacity:0,depthWrite:false,fog:false}),snowfall=new T.Points(snowGeo,snowMat);snowfall.frustumCulled=false;snowfall.visible=false;scene.add(snowfall);
const DROPS=1300,rainPos=new Float32Array(DROPS*6),rainGeo=new T.BufferGeometry();rainGeo.setAttribute('position',new T.BufferAttribute(rainPos,3));
const rainMat=new T.LineBasicMaterial({color:'#c3d0dd',transparent:true,opacity:0,depthWrite:false}),rainfall=new T.LineSegments(rainGeo,rainMat);rainfall.frustumCulled=false;rainfall.visible=false;scene.add(rainfall);
const PET=220,petalPos=new Float32Array(PET*3),petalGeo=new T.BufferGeometry();petalGeo.setAttribute('position',new T.BufferAttribute(petalPos,3));const petals=new T.Points(petalGeo,new T.PointsMaterial({color:'#f5c5cb',size:.14,transparent:true,opacity:.8}));petals.frustumCulled=false;scene.add(petals);
const STARN=700,starPos=new Float32Array(STARN*3);for(let i=0;i<STARN;i++){const a=Math.sin(i*91.7)*1e4%1*Math.PI*2,y=.08+Math.abs(Math.sin(i*12.9898)*43758.5453%1)*.92,r=Math.sqrt(1-y*y);starPos.set([Math.cos(a)*r,y,Math.sin(a)*r],i*3)}
const starGeo=new T.BufferGeometry();starGeo.setAttribute('position',new T.BufferAttribute(starPos,3));const stars=new T.Points(starGeo,new T.PointsMaterial({color:'#ffffff',size:1.7,sizeAttenuation:false,transparent:true,opacity:0,depthWrite:false,fog:false}));stars.scale.setScalar(3000);stars.frustumCulled=false;stars.visible=false;scene.add(stars);
const moon=new T.Mesh(new T.SphereGeometry(40,24,16),new T.MeshBasicMaterial({color:'#f4f0da',transparent:true,opacity:0,fog:false,depthWrite:false}));moon.visible=false;scene.add(moon);
const lampLights=[0,1,2,3].map(()=>{const l=new T.PointLight('#ffcf80',0,30,1.4);scene.add(l);return l});
const lampPos=[...S1.lampPos,...S2.lampPos];
const bolt=$('lightning');let boltT=0,boltWait=3,skySnap=true;
const nightCol={hs:new T.Color('#fff5dc'),hg:new T.Color('#7f8a86'),ns:new T.Color('#6f86c4'),ng:new T.Color('#1c2236')};
const NOTES=[['summer',e=>e.season==='summer','☀️ 여름 · 해가 기울어요'],['rain',e=>e.rain>.35,'⛈ 여름 소나기! 우산 쓴 사람들이 많아졌어요'],['night',e=>e.dark>.6&&e.rain<.2,'🌙 한밤의 뉴욕 · 다리에 불빛 목걸이가 켜졌어요'],
 ['autumn',e=>e.season==='autumn','🍂 가을 · 낙엽 지는 새벽 거리'],['dawn',e=>e.p>.6&&e.dusk>.5,'🌅 해가 떠요'],['winter',e=>e.season==='winter'&&e.snow<.2,'❄️ 겨울 아침'],['snow',e=>e.snow>.35,'🌨 함박눈! 거리가 하얘져요'],['spring',e=>e.p<.1&&e.p>.02,'🌸 다시 봄 · 벚꽃 날리는 한낮']];
const noted=new Set();
// 고화질 후처리(PC) · 블렌더 뉴욕 키트(빌딩 앞면 · 소품 · 사람)
let post=null;if(window.RIDE_POST&&RIDE_POST.quality()==='high')try{post=RIDE_POST.make(renderer,scene,camera,{adaptive:!/[?&]q=high/.test(location.search)})}catch(e){console.warn('후처리 없이 그려요',e)}
let kitDone=false;
const kit=window.NYC_ASSETS&&window.CITY_REAL?NYC_ASSETS.load(T,KIT,{small:!post}).then(A=>{for(const a of AREAS){const r=a.S.upgrade(A,renderer);if(r)console.info('NYC kit',r.faces,'faces',r.swapped.join(','))}dumboStreet();if(A._env)L.setEnv(A._env);kitDone=true}).catch(e=>console.warn('NYC 키트 없이 그려요',e)):Promise.resolve();
NYC_ASSETS.loadPeople(T,KIT).then(geo=>{ME.useKit(geo);if(L.people)L.people.useKit(geo)}).catch(()=>{});

// ── 소리: ../ride 의 RideSound (빗소리 · 천둥 · 보행 신호음 · 재즈)
const sound=new RideSound();RideSound.PLAYLIST=['../ride/fusion-jazz.mp3','../ride/duet-pop-ballad.mp3','../ride/upbeat.mp3'];
$('sound').onclick=async()=>{const m=await sound.toggle();$('sound').textContent=m?'🔇':'🔊';$('sound').title=m?'소리 켜기':'소리 끄기'};
let chirpT=0;

// ── 명소 목록 · 안내
const SAVE='asset-nyc-walk-v1';let visited=new Set();try{visited=new Set(JSON.parse(localStorage.getItem(SAVE)||'[]'))}catch(e){}
const list=$('spot-list');
function drawSpots(){list.innerHTML='';for(const p of L.pois){const li=document.createElement('li');li.dataset.id=p.id;li.className=visited.has(p.id)?'done':'';li.innerHTML=`<span class="ic">${p.icon}</span><span class="nm">${p.name}</span><button type="button">가기</button>`;li.querySelector('button').onclick=()=>teleport(p.id);list.appendChild(li)}$('spots-count').textContent=`${visited.size} / ${L.pois.length}`}
drawSpots();
$('spots-toggle').onclick=()=>{const c=$('spots').classList.toggle('closed');$('spots-toggle').setAttribute('aria-expanded',String(!c))};
if(touch)$('spots').classList.add('closed');
let toastT=0;function toast(html,sec=4){const t=$('toast');t.innerHTML=html;t.classList.add('show');toastT=sec}
function teleport(id){const p=L.pois.find(q=>q.id===id);if(!p)return;tour.on=false;$('tour').classList.remove('on');
 const [R,F]=p.tp,y=standAt(R,F,null);P.R=R;P.F=F;P.y=P.ty=y===null?YC:y;P.v=0;const dx=p.look[0]-R,dz=-(p.look[1]-F);cam.yaw=P.yaw=Math.atan2(-dx,-dz);cam.pitch=.16;cam.dist=Math.max(cam.dist,10);skySnap=true;snapCam=true;here=null}
let here=null;
function checkPois(){let near=null;for(const p of L.pois)if(Math.hypot(P.R-p.R,P.F-p.F)<p.r){near=p;break}
 if(near&&near!==here){if(!visited.has(near.id)){visited.add(near.id);try{localStorage.setItem(SAVE,JSON.stringify([...visited]))}catch(e){}drawSpots();sound.chime&&sound.chime(880);
   if(visited.size===L.pois.length)setTimeout(()=>toast('<b>🎉 뉴욕 명소 9곳을 모두 걸어 봤어요!</b>시간이 흐르는 뉴욕을 계속 산책해 보세요',6),4800)}
  toast(`<b>${near.icon} ${near.name}</b>${near.sub}`,4.5)}
 here=near;for(const li of list.children)li.classList.toggle('here',!!near&&li.dataset.id===near.id)}
function areaName(){const R=P.R,F=P.F;if(L.bridgeWalk(R,F)!==null&&R>250&&R<800)return R<330?'🌉 브루클린 브릿지 · 맨해튼 쪽':R>700?'🌉 브루클린 브릿지 · 브루클린 쪽':'🌉 브루클린 브릿지 · 이스트강 위';
 if(F<-14&&R<335)return '🌳 배터리 파크';if(R<335&&F<16&&Math.abs(R)<34)return '🌳 볼링 그린';if(R>690&&R<746&&F>350)return '🌳 브루클린 브릿지 파크';if(F>586&&R>690)return '🌊 덤보 강가';
 const C=R<500?C1:C2;let best=null,bd=1e9;for(const s of C.segs){const t=Math.max(0,Math.min(s.len,(R-s.a[0])*s.dir[0]+(F-s.a[1])*s.dir[1])),x=s.a[0]+s.dir[0]*t,z=s.a[1]+s.dir[1]*t,d=Math.hypot(R-x,F-z);if(d<bd){bd=d;best=s.name}}
 for(const cs of C.crossStreets){const a=C.segPoint(cs.k,cs.d,cs.from),b=C.segPoint(cs.k,cs.d,cs.to),dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz),t=Math.max(0,Math.min(l,((R-a[0])*dx+(F-a[1])*dz)/l)),d=Math.hypot(R-a[0]-dx/l*t,F-a[1]-dz/l*t);if(d<bd-2){bd=d;best=cs.name}}
 return (R<500?'🗽 맨해튼 · ':'🧱 덤보 · ')+best}

// ── 혼자 걷기(G): 둘러볼 길을 따라 천천히
const tour={on:false,i:0};
function toggleTour(){tour.on=!tour.on;$('tour').classList.toggle('on',tour.on);if(tour.on){let best=0,bd=1e9;L.tour.forEach((q,i)=>{const d=Math.hypot(q[0]-P.R,q[1]-P.F);if(d<bd){bd=d;best=i}});tour.i=best;toast('<b>🚶 혼자 걷기</b>배터리 파크 → 황소 → 월스트리트 → 브루클린 브릿지 → 덤보 순서로 걸어요. 방향키를 누르면 멈춰요',4)}else toast('혼자 걷기를 멈췄어요',2)}
function toggleSpeed(){tSpeed=tSpeed===1?6:1;$('speed').classList.toggle('on',tSpeed>1);toast(tSpeed>1?'⏩ 시간이 6배 빨리 흘러요':'▶ 시간이 원래 빠르기로 흘러요',2)}
function togglePhoto(){const on=document.body.classList.toggle('photo');$('photo').classList.toggle('on',on);if(on)toast('📷 사진 모드 · H 로 돌아와요',1.6)}
$('tour').onclick=toggleTour;$('speed').onclick=toggleSpeed;$('photo').onclick=togglePhoto;
// 마을에서 열었으면 ✕ 로 돌아가기
function goHome(){try{window.parent.postMessage({dpNyc:'close'},'*')}catch(e){}}
if(embedded){$('home').hidden=false;$('home2').hidden=false;$('home').onclick=goHome;$('home2').onclick=goHome}

// ── 지도(오른쪽 아래): 땅 · 길 · 다리 · 나
const mm=$('minimap'),mx=mm.getContext('2d');
function drawMap(){const W=mm.width,H=mm.height,k=W/520,cx=W/2,cy=H/2,toX=R=>cx+(R-P.R)*k,toY=F=>cy-(F-P.F)*k;
 mx.fillStyle='#6f98ad';mx.fillRect(0,0,W,H);mx.fillStyle='#d9d5c9';
 const rect=(a,b,c,d)=>mx.fillRect(toX(a),toY(d),(b-a)*k,(d-c)*k);
 rect(-430,330,-124,960);rect(-650,1450,950,2700);rect(690,1750,-420,612);rect(-1400,-880,-500,1100);
 mx.fillStyle='#9cc27e';rect(-200,330,-112,-22);rect(698,745,352,586);rect(-100,-50,146,196);
 mx.fillStyle='#ffffff';for(const C of [C1,C2])for(const s of C.streets){if(s.axis==='F')rect(s.c-5,s.c+5,s.lo-5,s.hi+5);else rect(s.lo-5,s.hi+5,s.c-5,s.c+5)}
 mx.strokeStyle='#8a6a48';mx.lineWidth=4;mx.beginPath();mx.moveTo(toX(240),toY(330));mx.lineTo(toX(805),toY(330));mx.stroke();
 mx.strokeStyle='#5d7380';mx.beginPath();mx.moveTo(toX(845-.8*480),toY(650+.6*480));mx.lineTo(toX(845+.8*185),toY(650-.6*185));mx.stroke();
 mx.fillStyle='#2f8a4f';const lb=L.LIB;mx.beginPath();mx.arc(toX(lb.R),toY(lb.F),5,0,7);mx.fill();
 mx.font='bold 20px sans-serif';mx.textAlign='center';mx.textBaseline='middle';for(const p of L.pois){const x=toX(p.R),y=toY(p.F);if(x>-10&&x<W+10&&y>-10&&y<H+10)mx.fillText(p.icon,x,y)}
 mx.save();mx.translate(cx,cy);mx.rotate(-P.yaw);mx.fillStyle='#d2483c';mx.strokeStyle='#fff';mx.lineWidth=3;mx.beginPath();mx.moveTo(0,-12);mx.lineTo(8,8);mx.lineTo(0,4);mx.lineTo(-8,8);mx.closePath();mx.stroke();mx.fill();mx.restore()}

// ── 시작
let started=false,snapCam=true;
const startBtn=$('start');
Promise.race([kit,new Promise(r=>setTimeout(r,12000))]).then(()=>{startBtn.disabled=false;startBtn.textContent='산책 시작하기 ↗'});
startBtn.onclick=async()=>{if(started)return;started=true;$('overlay').classList.add('hidden');try{await sound.unlock();sound.musicStart()}catch(e){}
 toast(touch?'<b>🗽 배터리 파크</b>왼쪽 아래 동그라미를 밀면 걸어요 · 화면을 끌면 둘러봐요':'<b>🗽 배터리 파크</b>WASD · 방향키로 걷고, 마우스로 끌어 둘러봐요. 바다 건너 자유의 여신상이 보여요',5.5)};

// ── 매 프레임
const clock=new T.Clock();let time=0,frame=0;
const v3=new T.Vector3(),fwd=new T.Vector3();
function step(dt){time+=dt;
 // 시간
 if(started)envP=(envP+dt*tSpeed/CYCLE)%1;E=CITY_ENV.env(envP);
 // 걷기 입력 (카메라 기준)
 let ix=0,iz=0;
 if(keys.has('w')||keys.has('arrowup'))iz+=1;if(keys.has('s')||keys.has('arrowdown'))iz-=1;if(keys.has('a')||keys.has('arrowleft'))ix-=1;if(keys.has('d')||keys.has('arrowright'))ix+=1;
 if(stick.id!==null){ix+=stick.x;iz-=stick.y}
 if(!started){ix=iz=0}
 if((ix||iz)&&tour.on){tour.on=false;$('tour').classList.remove('on')}
 let mvx=0,mvz=0;   // 월드 이동 방향(x, z)
 if(ix||iz){const l=Math.min(1,Math.hypot(ix,iz)),a=Math.atan2(ix,iz);const dirA=cam.yaw-a;mvx=-Math.sin(dirA)*l;mvz=-Math.cos(dirA)*l}
 else if(tour.on){const q=L.tour[tour.i],dR=q[0]-P.R,dF=q[1]-P.F,d=Math.hypot(dR,dF);if(d<1.6){tour.i++;if(tour.i>=L.tour.length){tour.on=false;$('tour').classList.remove('on');toast('<b>🌆 산책 끝!</b>브루클린 브릿지 파크에서 맨해튼을 바라봐요',5)}}else{mvx=dR/d*.62;mvz=-dF/d*.62}}
 const running=keys.has('shift')||run,want=Math.hypot(mvx,mvz)*(running?7.6:3.4);
 P.v+=(want-P.v)*Math.min(1,dt*6);
 if(P.v>.05&&(mvx||mvz)){const ty=Math.atan2(-mvx,-mvz);let d=ty-P.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));P.yaw+=d*Math.min(1,dt*9);
  const l=Math.hypot(mvx,mvz),sx=mvx/l*P.v*dt,sz=mvz/l*P.v*dt;
  const tryMove=(R,F)=>{const y=standAt(R,F,P.y);if(y===null)return false;P.R=R;P.F=F;P.ty=y;return true};
  if(!tryMove(P.R+sx,P.F-sz)&&!tryMove(P.R+sx,P.F)&&!tryMove(P.R,P.F-sz))P.v*=.5;
  if(tour.on||cam.drag<=0){let d2=P.yaw-cam.yaw;d2=Math.atan2(Math.sin(d2),Math.cos(d2));cam.yaw+=d2*Math.min(1,dt*(tour.on?1.6:.9))}}
 else{const y=standAt(P.R,P.F,P.y);if(y!==null)P.ty=y}
 if(P.ty!==undefined)P.y+=(P.ty-P.y)*Math.min(1,dt*14);
 cam.drag=Math.max(0,cam.drag-dt);
 // 나 그리기
 const amt=Math.min(1.2,P.v/3.4);P.wp+=dt*(P.v>.1?3.2+P.v*1.55:0);
 ME.begin();ME.person(P.R,P.y,-P.F,P.yaw,P.wp,amt,meLook);ME.end();
 v3.set(0,1.58,.24).applyAxisAngle(new T.Vector3(0,1,0),P.yaw);pack.position.set(P.R+v3.x,P.y+v3.y,-P.F+v3.z);pack.rotation.y=P.yaw;
 // 카메라
 const tgt=new T.Vector3(P.R,P.y+2.1,-P.F),cp=Math.cos(cam.pitch);
 const goal=new T.Vector3(tgt.x+Math.sin(cam.yaw)*cp*cam.dist,tgt.y+Math.sin(cam.pitch)*cam.dist+.4,tgt.z+Math.cos(cam.yaw)*cp*cam.dist);
 goal.y=Math.max(goal.y,P.y+.6);
 {const dx=goal.x-tgt.x,dy=goal.y-tgt.y,dz=goal.z-tgt.z,D=Math.hypot(dx,dy,dz);let hit=D;for(let t=.8;t<D;t+=.45){if(solid(tgt.x+dx*t/D,-(tgt.z+dz*t/D),tgt.y+dy*t/D)){hit=t;break}}
  const want=Math.max(1.4,hit-.7);cam.cd=cam.cd===undefined||snapCam?want:want<cam.cd?want:cam.cd+(want-cam.cd)*Math.min(1,dt*2.5);goal.set(tgt.x+dx*cam.cd/D,tgt.y+dy*cam.cd/D,tgt.z+dz*cam.cd/D)}
 const k=snapCam?1:1-Math.exp(-dt*8);snapCam=false;cam.pos.lerp(goal,k);cam.look.lerp(tgt,k);camera.position.copy(cam.pos);camera.lookAt(cam.look);
 // 해 · 달 · 하늘 · 안개
 {let el=E.elev,a=E.az;if(el<0){el=-el;a+=Math.PI}el=Math.max(el,.2);const d=new T.Vector3(Math.cos(a)*Math.cos(el),Math.sin(el),Math.sin(a)*Math.cos(el));sun.position.copy(tgt).addScaledVector(d,200);sun.target.position.copy(tgt);sun.target.updateMatrixWorld();
  if(E.elev<0)moon.position.copy(camera.position).addScaledVector(d,2600)}
 const n=E.dark;hemi.color.copy(nightCol.hs).lerp(nightCol.ns,n);hemi.groundColor.copy(nightCol.hg).lerp(nightCol.ng,n);hemi.intensity=E.hemiI+boltT*5;sun.intensity=E.sunI;sun.color.set(E.sunColor);
 const skyK=skySnap?1:1-Math.exp(-dt*3);skySnap=false;scene.background.lerp(new T.Color(E.sky),skyK);scene.fog.color.lerp(new T.Color(E.fog),skyK);
 scene.fog.near+=(E.fogNear*2-scene.fog.near)*skyK;scene.fog.far+=(Math.max(160,E.fogFar*2)-scene.fog.far)*skyK;
 // 동네 장면(신호 · 사람 · 비둘기 · 마을 친구 · 날씨 재질)
 const me=new T.Vector3(P.R,P.y,-P.F);
 for(const a of AREAS){a.C.updateLights(a.ride.city,dt);a.ride.pos=a.C.nearestU(P.R,P.F);a.S.setWinK(post&&post.on?1:.6);a.S.update(time,dt,a.ride,E,me)}
 L.update(time,dt,E,camera,me);
 // 가로등 불빛(가까운 4개)
 if(n>.01){const near=lampPos.map(q=>[q,q.distanceToSquared(me)]).sort((a,b)=>a[1]-b[1]).slice(0,4);lampLights.forEach((l,i)=>{l.position.copy(near[i][0]);l.intensity=n*40})}else lampLights.forEach(l=>l.intensity=0);
 // 눈 · 비 · 꽃잎/낙엽 · 별 · 번개
 const c=camera.position;camera.getWorldDirection(fwd);
 {const sa=E.snow;snowfall.visible=sa>.01;$('frost').style.opacity=(sa*.7).toFixed(3);if(snowfall.visible){snowMat.opacity=.95*sa;for(let i=0;i<FLAKES;i++){const h=((i*.618-time*(2.4+(i%5)*.35))%14+14)%14,x=Math.sin(i*12.9898)*.5,z=Math.cos(i*78.233)*.5;snowPos[i*3]=c.x+fwd.x*14+x*44+Math.sin(time*.8+i)*.6-h*.4;snowPos[i*3+1]=c.y-6+h*1.15;snowPos[i*3+2]=c.z+fwd.z*14+z*44+Math.cos(time*.6+i*.7)*.6}snowGeo.attributes.position.needsUpdate=true}}
 {const rn=E.rain;rainfall.visible=rn>.01;sound.rain&&sound.rain(started?rn:0);if(rainfall.visible){rainMat.opacity=.5*rn;for(let i=0;i<DROPS;i++){const h=((i*.618-time*(24+(i%5)*3))%20+20)%20,x=c.x+fwd.x*12+Math.sin(i*12.9898)*26,z=c.z+fwd.z*12+Math.cos(i*78.233)*26,y=c.y-7+h,k=i*6;rainPos[k]=x;rainPos[k+1]=y;rainPos[k+2]=z;rainPos[k+3]=x-.12;rainPos[k+4]=y-1.25;rainPos[k+5]=z+.05}rainGeo.attributes.position.needsUpdate=true}
  if(rn>.6&&started){boltWait-=dt;if(boltWait<=0){boltT=1;boltWait=3+Math.random()*5;setTimeout(()=>sound.thunder&&sound.thunder(),300+Math.random()*900)}}boltT=Math.max(0,boltT-dt*3.2);bolt.style.opacity=(boltT*(.55+.45*Math.sin(time*70))*.7).toFixed(3)}
 {const leaf=E.leaves>E.petals,amtP=Math.max(E.petals,E.leaves);petals.visible=!snowfall.visible&&E.rain<.1&&amtP>.02;petals.material.color.set(leaf?'#d8742c':'#f5c5cb');petals.material.size=leaf?.24:.14;petals.material.opacity=.85*amtP;
  if(petals.visible){for(let i=0;i<PET;i++){petalPos[i*3]=me.x+Math.sin(i*54.1+time*.15)*25;petalPos[i*3+1]=me.y+((i*.73-time*.23)%12+12)%12;petalPos[i*3+2]=me.z+Math.cos(i*3.1+time*.03)*30}petalGeo.attributes.position.needsUpdate=true}}
 {const sv=E.stars;stars.visible=moon.visible=sv>.01;if(sv>.01){stars.position.copy(camera.position);stars.material.opacity=sv*.9;moon.material.opacity=sv}}
 if(started)for(const [k,ok,msg] of NOTES)if(!noted.has(k)&&ok(E)){noted.add(k);if(toastT<=0)toast(msg,3.5);break}
 if(E.p<.02)noted.clear();
 // 보행 신호음
 if(started&&(S1.walk||S2.walk)&&(chirpT-=dt)<=0){chirpT=1;sound.chirp&&sound.chirp()}
 sound.musicSync&&sound.musicSync({mode:started?'playing':'paused'});
 if(toastT>0){toastT-=dt;if(toastT<=0)$('toast').classList.remove('show')}
 if(started)checkPois();
 if(frame%6===0){$('area').textContent=areaName();$('clock').textContent=`${E.dark>.5?'🌙':E.dusk>.4?'🌅':E.icon} ${CITY_ENV.clock(E.hour)} · ${E.seasonName}${E.rain>.3?' · 소나기':E.snow>.3?' · 함박눈':''}`}
 if(frame%3===0)drawMap();
 frame++}
function render(dt){const inB=P.R>520,S=inB?S2:S1;if(S.wet)S.wet.render(renderer,scene,camera,!!(post&&post.on));
 if(post&&post.on)post.render(dt,E);else renderer.render(scene,camera)}
let paused=false;
function tick(){const dt=Math.min(.05,clock.getDelta());if(!paused){step(dt);render(dt)}requestAnimationFrame(tick)}
requestAnimationFrame(tick);
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();if(post)post.setSize()});
window.nycDebug={P,cam,C1,C2,S1,S2,L,scene,camera,renderer,T,step,teleport,get E(){return E},setP(p){envP=p;skySnap=true},get envP(){return envP},start:()=>startBtn.onclick(),snap(){snapCam=true;skySnap=true},standAt,get post(){return post},kit,get kitDone(){return kitDone},tour,pause(v){paused=v},frame(n=1,dt=.05){for(let i=0;i<n;i++)step(dt);render(dt)}};
})();
