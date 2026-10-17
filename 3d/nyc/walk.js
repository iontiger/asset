/* 뉴욕 거리 산책 (DentPhoto 마을 3D · /asset/3d/nyc/) — ../ride 의 뉴욕 시내 장면(빌딩 · 보도 · 신호등 · 사람들 · 마을 친구 18명 · 물웅덩이 · 블렌더 키트)을
   걷는 배치(walk-city.js)로 두 번(맨해튼 금융가 · 브루클린 덤보) 그리고, 명소(nyc-landmarks.js) · 즐길 거리(nyc-extras.js)를 더한다. 차는 지나가지 않는다.
   - 주인공: 마을에서 고른 그 주인공(hero.js, 마을 원본 그대로 · 계절 소품 · 마을 보상 모자 · 강아지). ?hero=me|wife 로 바꿀 수 있다.
   - 시간: ../ride/city-env.js 를 그대로 쓴다(진행도 p 하나로 봄 → 여름 → 가을 → 겨울, 정오 → 자정 → 정오). 걷는 동안 p 가 돈다(한 바퀴 5분).
   - 조작은 마을과 같다: W · S 앞뒤 · A · D 돌기 · Shift 빠르게 · 땅을 누르면 그곳까지 길을 찾아 걸어감 · 끌어서 둘러보기 · 휠 · B 자전거 · Space 점프 · H 인사 · F 간식 · P 사진.
   - 소리는 마을 설정(asset-village-3d-prefs 의 ambient · sfx · bgm)을 따른다.
   - 더 즐길 거리: 뉴욕 여권 도장 · 마을 친구 심부름(nyc-quest.js) · 스태튼 아일랜드 페리 · 맨해튼 브릿지 지하철 · 덤보 버스커 · 지하철역(nyc-fun.js)
     · 지하철로 가는 타임스스퀘어(nyc-ts.js, 따로 떨어진 동네라 거기 있는 동안 다른 동네는 숨긴다) · 계절 장식(nyc-season.js)
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

// ── 마을 설정 · 고른 주인공 · 다이아몬드 보상(같은 사이트라 마을의 localStorage 를 그대로 읽는다)
const store=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const VP=Object.assign({sfx:false,bgm:false,ambient:true},(()=>{try{return JSON.parse(store('asset-village-3d-prefs')||'{}')}catch(e){return {}}})());
const heroOwner=(()=>{const q=new URLSearchParams(location.search).get('hero');if(q==='me'||q==='wife')return q;return store('asset-village-3d-hero')==='wife'?'wife':'me'})();
const gems=(()=>{try{return JSON.parse(store('asset-village-3d-gems')||'[]').length||0}catch(e){return 0}})();

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
// ── 소리: ../ride 의 RideSound (빗소리 · 천둥 · 보행 신호음 · 재즈) — 켜고 끄기는 마을 설정을 따른다
const sound=new RideSound();RideSound.PLAYLIST=['../ride/fusion-jazz.mp3','../ride/duet-pop-ballad.mp3','../ride/upbeat.mp3'];
sound.muted=!(VP.ambient||VP.sfx||VP.bgm);
const X=NYC_EXTRAS.build({T,scene,YC,sound});
// 지하철로 가는 타임스스퀘어 · 페리 · 맨해튼 브릿지 지하철 · 버스커 · 지하철역 · 계절 장식
const TS=NYC_TS.build({T,scene,YC});AREAS.push({C:TS.C,S:TS.S,ts:true,ride:{pos:0,speed:0,mode:'playing',player:0,branchChoice:'safe',city:TS.C.newState()}});
const FUN=NYC_FUN.build({T,scene,YC,sound,L,TS}),SEA=NYC_SEASON.build({T,scene,YC,C1,C2,S1,S2});
let inTS=false;
function setTS(on){inTS=on;for(const o of [S1.group,S2.group,L.group,X.group,FUN.group,SEA.group])o.visible=!on;TS.group.visible=TS.S.group.visible=on;skySnap=true}
// 덤보 워싱턴 스트리트: 옛 화물 철길이 박힌 화강암 돌길
const cobble=(()=>{const cv=document.createElement('canvas');cv.width=cv.height=256;const x=cv.getContext('2d');x.fillStyle='#4a4644';x.fillRect(0,0,256,256);
 for(let j=0;j<8;j++)for(let i=0;i<6;i++){const o=(j%2)*21,c=88+((i*7+j*13)%5)*9;x.fillStyle=`rgb(${c},${c-4},${c-8})`;const px=i*43+o-4,py=j*32+2;x.beginPath();x.roundRect?x.roundRect(px+2,py+2,38,27,6):x.rect(px+2,py+2,38,27);x.fill();x.fillStyle='rgba(255,255,255,.06)';x.fillRect(px+6,py+5,22,4)}
 const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(14/3.2,14/3.2);t.anisotropy=8;return t})();
function dumboStreet(){const m=S2.asMat;if(!m)return;m.map=cobble;m.normalMap=null;m.color.setScalar(1.1);m.needsUpdate=true}
dumboStreet();
{const rail=new T.MeshStandardMaterial({color:'#5b5b5c',metalness:.8,roughness:.35});for(const dx of [-.75,.75]){const m=new T.Mesh(new T.BoxGeometry(.12,.06,248),rail);m.position.set(845+dx,YC+.05,-(330+580)/2);m.receiveShadow=true;scene.add(m)}}

// ── 주인공(마을 그대로) · 자전거 · 강아지
const HERO=NYC_HERO.make({T,scene,owner:heroOwner,K:.78});
const P={R:0,F:-104,y:YC+.1,yaw:Math.atan2(160,-616),v:0,phase:0,walk:0};   // yaw: 바라보는 방향(-Z 앞) — 처음엔 자유의 여신상 쪽
let riding=false;
const SPD={walk:6.8,run:13.6,bike:18,bikeRun:26};
function groundY(R,F){const C=TS.inArea(R,F)?TS.C:R<500?C1:C2,st=C.onStreet(R,F);if(st)return YC+(st.road?.02:.24);if(L.inArea(R,F))return YC+.12;return null}
const isBlocked=(R,F)=>L.blocked(R,F)||X.blocked(R,F)||FUN.blocked(R,F)||SEA.blocked(R,F)||TS.blocked(R,F);
// 땅 대신 서는 곳(페리 선착장 · 타임스스퀘어 빨간 계단): 그 자리에서는 이 높이만 쓴다
const floorY=(R,F)=>{let y=FUN.walk(R,F);if(y===null)y=TS.walk(R,F);return y===null?groundY(R,F):y};
function standAt(R,F,curY){
 if(isBlocked(R,F))return null;
 const by=L.bridgeWalk(R,F),gy=floorY(R,F);
 if(curY===null||curY===undefined){if(by!==null)return by;return gy}
 const ok=y=>y!==null&&Math.abs(y-curY)<1.1;
 if(ok(by)&&ok(gy))return Math.abs(by-curY)<Math.abs(gy-curY)?by:gy;if(ok(by))return by;if(ok(gy))return gy;return null}
// 높이 힌트에 가까운 층(다리 위 / 아래 땅)
function standNear(R,F,yh){if(isBlocked(R,F))return null;const by=L.bridgeWalk(R,F),gy=floorY(R,F);if(by===null)return gy;if(gy===null)return by;return Math.abs(by-yh)<Math.abs(gy-yh)?by:gy}
function nearestStand(R,F,yh){let y=standNear(R,F,yh);if(y!==null)return {R,F,y};for(let r=1;r<=14;r+=1)for(let i=0;i<20;i++){const a=i/20*Math.PI*2,nR=R+Math.cos(a)*r,nF=F+Math.sin(a)*r;y=standNear(nR,nF,yh);if(y!==null)return {R:nR,F:nF,y}}return null}

// ── 카메라가 빌딩 속으로 들어가지 않게: 빌딩 바닥 칸(20 u 격자)에 빌딩 · 명소 건물을 넣어 두고 사람 → 카메라 선을 따라 확인
const GRID=new Map(),gkey=(i,j)=>i*100003+j;
for(const b of [...S1.blds,...S2.blds,...TS.S.blds].map(b=>[b.r0,b.r1,b.f0,b.f1,YC+b.h*1.25+2]).concat(L.SOLID))for(let i=Math.floor(b[0]/20);i<=Math.floor(b[1]/20);i++)for(let j=Math.floor(b[2]/20);j<=Math.floor(b[3]/20);j++){const k=gkey(i,j);if(!GRID.has(k))GRID.set(k,[]);GRID.get(k).push(b)}
function solid(R,F,y){const l=GRID.get(gkey(Math.floor(R/20),Math.floor(F/20)));if(!l)return false;for(const b of l)if(R>b[0]-.3&&R<b[1]+.3&&F>b[2]-.3&&F<b[3]+.3&&y<b[4])return true;return false}

// ── 길 찾기(마을처럼 땅을 누르면 그곳까지 걸어간다): 1.6 u 칸 A* — 다리 위 · 아래는 높이 층으로 나눈다
const GS=1.6,LAY=y=>Math.max(0,Math.min(63,Math.round((y-YC)/2))),NK=(i,j,l)=>((i+2000)*4001+(j+2000))*64+l;
function heap(){const a=[];return {get size(){return a.length},push(k,f){a.push([f,k]);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p][0]<=a[i][0])break;[a[p],a[i]]=[a[i],a[p]];i=p}},pop(){const top=a[0],l=a.pop();if(a.length){a[0]=l;let i=0;for(;;){const L2=i*2+1,R2=L2+1;let m=i;if(L2<a.length&&a[L2][0]<a[m][0])m=L2;if(R2<a.length&&a[R2][0]<a[m][0])m=R2;if(m===i)break;[a[m],a[i]]=[a[i],a[m]];i=m}}return top[1]}}}
function lineOK(a,b){const d=Math.hypot(b.R-a.R,b.F-a.F),n=Math.max(1,Math.ceil(d/.7));let y=a.y;for(let k=1;k<=n;k++){const t=k/n;y=standAt(a.R+(b.R-a.R)*t,a.F+(b.F-a.F)*t,y);if(y===null)return false}return Math.abs(y-b.y)<1.2}
function findPath(s,goal){const t0=performance.now(),gi=Math.round(goal.R/GS),gj=Math.round(goal.F/GS),cache=new Map(),at=(i,j,y)=>{const k=NK(i,j,LAY(y));if(cache.has(k))return cache.get(k);const v=standAt(i*GS,j*GS,y);cache.set(k,v);return v};
 const H=(i,j)=>{const dx=Math.abs(i-gi),dz=Math.abs(j-gj);return (Math.max(dx,dz)+.4142*Math.min(dx,dz))*1.15};
 const open=heap(),gS=new Map(),par=new Map(),node=new Map(),closed=new Set();
 const si=Math.round(s.R/GS),sj=Math.round(s.F/GS);let sy=at(si,sj,s.y);if(sy===null)sy=s.y;const sk=NK(si,sj,LAY(sy));gS.set(sk,0);node.set(sk,[si,sj,sy]);open.push(sk,H(si,sj));
 let found=null,exp=0;
 while(open.size){const k=open.pop();if(closed.has(k))continue;closed.add(k);const [i,j,y]=node.get(k);if(i===gi&&j===gj&&Math.abs(y-goal.y)<2.2){found=k;break}
  if(++exp>140000||(exp%2000===0&&performance.now()-t0>650))break;const g0=gS.get(k);
  for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const ni=i+di,nj=j+dj,ny=at(ni,nj,y);if(ny===null)continue;if(di&&dj&&(at(i+di,j,y)===null||at(i,j+dj,y)===null))continue;
   const nk=NK(ni,nj,LAY(ny));if(closed.has(nk))continue;const ng=g0+(di&&dj?1.4142:1);if(!gS.has(nk)||ng<gS.get(nk)){gS.set(nk,ng);par.set(nk,k);node.set(nk,[ni,nj,ny]);open.push(nk,ng+H(ni,nj))}}}
 findPath.expanded=exp;findPath.ms=performance.now()-t0;if(found===null)return null;
 const raw=[];for(let k=found;k!==undefined;k=par.get(k)){const [i,j,y]=node.get(k);raw.push({R:i*GS,F:j*GS,y})}raw.reverse();raw.push({R:goal.R,F:goal.F,y:goal.y});
 // 줄 당기기: 곧게 걸어갈 수 있는 가장 먼 점까지 건너뛴다
 const out=[];let cur={R:s.R,F:s.F,y:s.y},i=0;while(i<raw.length-1){let j=Math.min(raw.length-1,i+70);while(j>i+1&&!lineOK(cur,raw[j]))j--;out.push(raw[j]);cur=raw[j];i=j}
 return out}
let route=[],stuckT=0;
const ring=new T.Mesh(new T.TorusGeometry(.7,.08,6,32),new T.MeshBasicMaterial({color:'#fff4bf',transparent:true,opacity:.95,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.visible=false;ring.renderOrder=3;scene.add(ring);
let routeLine=null;
function drawRoute(){if(routeLine){scene.remove(routeLine);routeLine.geometry.dispose();routeLine.material.dispose();routeLine=null}
 if(!route.length){ring.visible=false;return}const e=route[route.length-1];ring.position.set(e.R,e.y+.12,-e.F);ring.visible=true;
 const pts=[new T.Vector3(P.R,P.y+.14,-P.F),...route.map(q=>new T.Vector3(q.R,q.y+.14,-q.F))];routeLine=new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:'#fff4bf',transparent:true,opacity:.85,depthWrite:false}));routeLine.renderOrder=3;scene.add(routeLine)}
function clearRoute(){route=[];drawRoute()}
function travelTo(R,F,yh){const end=nearestStand(R,F,yh===undefined?P.y:yh);if(!end){toast('걸어갈 수 있는 길을 눌러 주세요',2.2);return false}
 if(Math.hypot(end.R-P.R,end.F-P.F)<1.2){clearRoute();return true}
 const path=findPath({R:P.R,F:P.F,y:P.y},end);if(!path||!path.length){toast('그곳까지 이어진 길을 찾지 못했어요. 가까운 곳을 눌러 보세요',2.8);return false}
 route=path;stuckT=0;drawRoute();return true}
function arrive(){clearRoute()}

// ── 카메라(마을처럼 주인공 뒤 · 끌어서 돌리기 · 휠 · 두 손가락으로 멀리/가까이)
const cam={yaw:P.yaw,pitch:.2,dist:touch?10:9,look:new T.Vector3(),pos:new T.Vector3()};
const ptrs=new Map();let down=null,pinch=0;
const ray=new T.Raycaster(),ndc=new T.Vector2();
const shown=o=>{for(;o;o=o.parent)if(!o.visible)return false;return true};
function pickAt(cx,cy){const r=canvas.getBoundingClientRect();ndc.set((cx-r.left)/r.width*2-1,-(cy-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);ray.far=900;
 const hits=ray.intersectObjects(inTS?[TS.S.group,TS.group]:onFerry?[FUN.group,L.group]:[S1.group,S2.group,L.group,X.group,FUN.group,SEA.group],true);for(const h of hits){const o=h.object;if(!shown(o)||o.isPoints||o.isLine||o.isSprite)continue;if(o.material&&o.material.transparent&&o.material.opacity<.3)continue;return h.point}return null}
canvas.addEventListener('pointerdown',e=>{ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});if(ptrs.size===2){const p=[...ptrs.values()];pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(down)down.moved=true}
 down={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,moved:ptrs.size>1};try{canvas.setPointerCapture(e.pointerId)}catch(err){}});
canvas.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(ptrs.size===2){const p=[...ptrs.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);cam.dist=Math.max(3.5,Math.min(34,cam.dist*(pinch/Math.max(20,d))));pinch=d;return}
 if(!down)return;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)down.moved=true;
 if(down.moved){cam.yaw+=(e.clientX-down.lx)*.006;cam.pitch=Math.max(-.12,Math.min(1.25,cam.pitch-(e.clientY-down.ly)*.004));cam.dragT=.6}down.lx=e.clientX;down.ly=e.clientY});
canvas.addEventListener('pointerup',e=>{ptrs.delete(e.pointerId);if(down&&!down.moved&&started&&!photoOn&&!metroOn){const p=pickAt(e.clientX,e.clientY);if(p){if(onFerry){const l=FUN.ferry.toLocal(p.x,-p.z,p.y);if(FUN.ferry.free(l.x,l.z))deckGoal=l}else if(nearCart&&Math.hypot(p.x-nearCart.R,-p.z-nearCart.F)<2.6){buySnack();}else travelTo(p.x,-p.z,p.y)}}if(!ptrs.size)down=null});
canvas.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId);down=null});
canvas.addEventListener('wheel',e=>{cam.dist=Math.max(3.5,Math.min(34,cam.dist*(1+Math.sign(e.deltaY)*.1)));e.preventDefault()},{passive:false});
canvas.addEventListener('contextmenu',e=>e.preventDefault());

// ── 키보드(마을과 같다)
const keys=new Set();
addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;const k=e.key.toLowerCase(),c=e.code;
 if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
 if(!started)return;
 if(k==='escape'){if(metroOn){if(!$('metro').classList.contains('ride'))closeMetro()}else if(quest.talking)quest.closeTalk();else if(photoOn)togglePhoto();else clearRoute();return}
 if(metroOn)return;
 if(c==='KeyP'||k==='p'){if(!e.repeat)togglePhoto();return}
 if(photoOn)return;
 keys.add(k);
 if(e.repeat)return;
 if(c==='KeyB'||k==='b')toggleBike();else if(c==='Space'||k===' ')doJump();else if(c==='KeyH'||k==='h')doWave();else if(c==='KeyF'||k==='f')doAct()});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>{keys.clear();ptrs.clear();down=null});

// ── 자전거 · 점프 · 인사 · 간식
function toggleBike(on){if(onFerry&&on!==false){toast('배 위에서는 걸어 다녀요',2);return}riding=on===undefined?!riding:on;HERO.bike.g.visible=riding;$('bike').classList.toggle('on',riding);dress();if(riding)HERO.st.jump=0;
 if(!sound.muted){sound.chime&&sound.chime(1318);setTimeout(()=>sound.chime&&sound.chime(1318),170)}toast(riding?'<b>🚲 자전거를 타요</b>B 키나 🚲 버튼으로 내려요 · Shift 로 더 빠르게':'자전거에서 내렸어요',riding?3:1.8)}
function doJump(){if(riding)return;HERO.jump()}
function doWave(){if(riding)return;HERO.wave();const near=nearNpc();if(near)toast(`<b>👋 ${near}</b>반갑게 손을 흔들어 줘요`,2.4)}
const NPCS=S1.npc?S1.npc.npcs:[];
function nearFriend(r=9){if(inTS||onFerry)return null;let best=null,bd=r;for(const n of NPCS){if(!n.o.visible)continue;const p=n.o.position,d=Math.hypot(p.x-P.R,p.z+P.F);if(d<bd){bd=d;best=n}}return best}
function nearNpc(){const n=nearFriend();return n?n.name:null}
let held=null,heldT=0,nearCart=null;
function buySnack(){if(!nearCart||riding)return;const kind=X.cartKind(nearCart,E),[ic,nm,sub]=X.NAMES[kind];
 if(held){held.parent&&held.parent.remove(held)}held=X.snack(kind);held.userData.kind=kind;held.position.set(0,-.12,.08);HERO.hand().add(held);HERO.st.hold=true;const bag=quest.bought(kind);heldT=bag?1e9:40;
 sound.chime&&sound.chime(988);toast(bag?`<b>🛍 ${ic} ${nm} 포장!</b>심부름 친구에게 손에 들고 가서 건네줘요 (지도 🎁)`:`<b>${ic} ${nm}</b>${sub}`,bag?4:3.2)}
function dropSnack(){if(held){held.parent&&held.parent.remove(held);held=null}HERO.st.hold=false}
function dress(){HERO.dress({season:E.season,wet:E.rain>.3,riding,gems,wear:VP,nycap:!!(quest&&quest.capOn)})}
// 덤보 버스커에게 동전
function tossCoin(){if(riding){toast('자전거에서 내려서 넣어 줘요',2);return}const from=new T.Vector3();HERO.hand().getWorldPosition(from);FUN.busker.toss(from);HERO.wave();if(!quest.coin())toast('<b>🎷 땡큐!</b>버스커가 신나게 한 곡 더 불어 줘요',3)}

// ── 스태튼 아일랜드 페리: 선착장에서 F → 갑판(배 기준 좌표 deck)을 걷는다. 끝나면 선착장에 내려 준다
let onFerry=false,deckGoal=null,lastRot=0,ferryLib=false;const deck={x:0,z:0,yaw:0};
function boardFerry(){const f=FUN.ferry;if(!f.canBoard())return;if(riding)toggleBike(false);clearRoute();
 if(!f.board(()=>{if(onFerry)leaveFerry()}))return;onFerry=true;ferryLib=false;deckGoal=null;lastRot=f.rot;
 const l=f.pierEnd(),sg=l.z>0?1:-1;deck.x=0;deck.z=sg*30.5;deck.yaw=sg>0?0:Math.PI;P.v=0;HERO.dog.init=false;
 toast('<b>⛴ 스태튼 아일랜드 페리</b>뱃고동! 곧 출발해요 · 갑판을 걸어 다니며 자유의 여신상을 구경해요',5)}
function leaveFerry(){onFerry=false;deckGoal=null;const b=FUN.ferry.BOARD;P.R=b.R;P.F=b.F+8;P.y=P.ty=FUN.ferry.PIER.y;cam.yaw=P.yaw=0;P.v=0;snapCam=true;HERO.dog.init=false;toast('<b>⚓ 배터리 파크 선착장</b>페리에서 내렸어요 · 또 타려면 선착장 끝에서 F',3.5)}
function stepFerry(dt,fw,top){const f=FUN.ferry,r=f.rot;cam.yaw+=r-lastRot;lastRot=r;
 let lx=0,lz=0,want=0;
 if(fw){deckGoal=null;const mvx=-Math.sin(cam.yaw)*fw,mvz=-Math.cos(cam.yaw)*fw;lx=mvx*Math.cos(r)-mvz*Math.sin(r);lz=mvx*Math.sin(r)+mvz*Math.cos(r);want=Math.min(top,SPD.walk)}
 else if(deckGoal){const dx=deckGoal.x-deck.x,dz=deckGoal.z-deck.z,d=Math.hypot(dx,dz);if(d<.3)deckGoal=null;else{lx=dx/d;lz=dz/d;want=Math.min(SPD.walk,Math.max(1.5,d*3))}}
 P.v+=(want-P.v)*Math.min(1,dt*(want>P.v?6:9));let moved=false;
 if(P.v>.05&&(lx||lz)){const ty=Math.atan2(-lx,-lz);let d=ty-deck.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));deck.yaw+=d*Math.min(1,dt*12);
  const sx=lx*P.v*dt,sz=lz*P.v*dt;if(f.free(deck.x+sx,deck.z+sz)){deck.x+=sx;deck.z+=sz;moved=true}else if(f.free(deck.x+sx,deck.z)){deck.x+=sx;moved=true}else if(f.free(deck.x,deck.z+sz)){deck.z+=sz;moved=true}else{P.v*=.5;deckGoal=null}}
 const w=f.toWorld(deck.x,deck.z);P.R=w.R;P.F=w.F;P.y=P.ty=w.y;P.yaw=deck.yaw+r;
 if(f.nearLiberty&&!ferryLib){ferryLib=true;if(!quest.liberty())toast('<b>🗽 자유의 여신상!</b>가장 가까이 왔어요 · 📷 사진 찍기 좋은 곳',5)}
 return moved}

// ── 지하철: 입구에서 F → 행선지 고르기 → 덜컹덜컹 → 그 역 입구 앞으로
let metroOn=false;
function openMetro(s){metroOn=true;clearRoute();keys.clear();const m=$('metro');m.className='metro';m.hidden=false;$('mt-here').textContent='🚇 '+s.name;$('mt-here-en').textContent=s.en;
 const box=$('mt-dests');box.innerHTML='';for(const d of FUN.stations){if(d===s)continue;const b=document.createElement('button');b.type='button';b.className='mt-dest';b.innerHTML=`<span class="bul">${bullets(d)}</span><b>${d.name}</b><small>${d.sub}</small>`;b.onclick=()=>rideMetro(s,d);box.appendChild(b)}
 sound.chime&&sound.chime(740)}
const bullets=d=>d.lines.map(([t,c,dk])=>`<i style="background:${c};color:${dk?'#111':'#fff'}">${t}</i>`).join('');
function closeMetro(){metroOn=false;$('metro').hidden=true;FUN.extraRumble=0}
$('mt-cancel').onclick=closeMetro;
function rideMetro(from,to){const m=$('metro');m.className='metro ride';$('mt-next').textContent=`다음 역은 ${to.name}입니다`;$('mt-next-en').textContent=`This stop is ${to.en}`;$('mt-line').innerHTML=bullets(to);
 FUN.extraRumble=.7;if(!sound.muted&&sound.chime){sound.chime(659);setTimeout(()=>sound.chime(523),260)}
 setTimeout(()=>arriveStation(to),1800);
 setTimeout(()=>{m.classList.add('out');FUN.extraRumble=0;if(!sound.muted&&sound.chime){sound.chime(784);setTimeout(()=>sound.chime(659),300)}},3500);
 setTimeout(()=>{closeMetro();m.classList.remove('out','ride');toast(`<b>🚇 ${to.name}</b>${to.id==='ts'?'전광판이 번쩍번쩍! 빨간 계단에 올라가 봐요':to.sub}`,4)},4200)}
function arriveStation(s){onFerry=false;P.R=s.exit.R;P.F=s.exit.F;const y=standAt(P.R,P.F,null);P.y=P.ty=y===null?YC+.24:y;P.v=0;cam.yaw=P.yaw=s.exit.yaw;cam.pitch=.18;skySnap=true;snapCam=true;here=null;HERO.dog.init=false;setTS(TS.inArea(P.R,P.F))}

// ── 아래 가운데 단추: 지금 할 수 있는 일(마을 친구 · 간식 · 버스커 · 페리 · 지하철). F 와 같다
let act=null;
function findAct(){if(!started||photoOn||metroOn||onFerry)return null;
 const fr=nearFriend(3.8);if(fr)return {id:'npc:'+fr.name,label:`💬 ${fr.name}에게 말 걸기`,run:()=>quest.talk(fr)};
 if(nearCart){const k=X.cartKind(nearCart,E),[ic,nm]=X.NAMES[k];return {id:'cart:'+k,label:`${ic} ${nm} 사기`,run:buySnack}}
 if(FUN.busker.near<4.6)return {id:'busk',label:'🪙 버스커에게 동전 넣기',run:tossCoin};
 const b=FUN.ferry.BOARD;if(Math.hypot(P.R-b.R,P.F-b.F)<5)return FUN.ferry.canBoard()?{id:'ferry',label:'⛴ 스태튼 아일랜드 페리 타기',run:boardFerry}:{id:'ferry-wait',label:'⛴ 페리가 돌아오고 있어요',run:null};
 for(const s of FUN.stations)if(Math.hypot(P.R-s.act.R,P.F-s.act.F)<2.8)return {id:'st:'+s.id,label:`🚇 ${s.name} · 지하철 타기`,run:()=>openMetro(s)};
 return null}
function doAct(){if(act&&act.run)act.run()}

// ── 시간 · 계절 (../ride/city-env.js 그대로) · 날씨 효과
const CYCLE=300;let envP=.03,E=CITY_ENV.env(envP);
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
const lampPos=[...S1.lampPos,...S2.lampPos,...TS.S.lampPos];
const bolt=$('lightning');let boltT=0,boltWait=3,skySnap=true;
setTS(false);
const nightCol={hs:new T.Color('#fff5dc'),hg:new T.Color('#7f8a86'),ns:new T.Color('#6f86c4'),ng:new T.Color('#1c2236')};
const NOTES=[['summer',e=>e.season==='summer','☀️ 여름 · 해가 기울어요'],['rain',e=>e.rain>.35,'⛈ 여름 소나기! 우산을 펼쳐요'],['fw',e=>X.fireworks.on,'🎆 이스트강 불꽃놀이! 브루클린 브릿지에서 보면 가장 예뻐요'],['night',e=>e.dark>.6&&e.rain<.2,'🌙 한밤의 뉴욕 · 다리에 불빛 목걸이가 켜졌어요'],
 ['autumn',e=>e.season==='autumn','🍂 가을 · 낙엽 지는 거리 · 덤보 카트에선 꿀땅콩을 팔아요'],['dawn',e=>e.p>.6&&e.dusk>.5,'🌅 해가 떠요'],['winter',e=>e.season==='winter'&&e.snow<.2,'❄️ 겨울 · 증권거래소 앞에 크리스마스 트리가 섰어요'],['snow',e=>e.snow>.35,'🌨 함박눈! 거리가 하얘져요'],['spring',e=>e.p<.1&&e.p>.02,'🌸 다시 봄 · 벚꽃 날리는 한낮']];
const noted=new Set();
// 고화질 후처리(PC) · 블렌더 뉴욕 키트(빌딩 앞면 · 소품 · 사람)
let post=null;if(window.RIDE_POST&&RIDE_POST.quality()==='high')try{post=RIDE_POST.make(renderer,scene,camera,{adaptive:!/[?&]q=high/.test(location.search)})}catch(e){console.warn('후처리 없이 그려요',e)}
let kitDone=false;
const kit=window.NYC_ASSETS&&window.CITY_REAL?NYC_ASSETS.load(T,KIT,{small:!post}).then(A=>{for(const a of AREAS){const r=a.S.upgrade(A,renderer);if(r)console.info('NYC kit',r.faces,'faces',r.swapped.join(','))}dumboStreet();if(A._env)L.setEnv(A._env);kitDone=true}).catch(e=>console.warn('NYC 키트 없이 그려요',e)):Promise.resolve();
NYC_ASSETS.loadPeople(T,KIT).then(geo=>{if(L.people)L.people.useKit(geo)}).catch(()=>{});
let chirpT=0;

// ── 뉴욕 여권(도장) · 마을 친구 심부름 · 마을 보상 (nyc-quest.js)
let toastT=0;function toast(html,sec=4){const t=$('toast');t.innerHTML=html;t.classList.add('show');toastT=sec}
const quest=NYC_QUEST.make({T,scene,pois:L.pois,npcs:NPCS,toast,sound,onTeleport:id=>teleport(id),
 onFind:name=>{const n=NPCS.find(q=>q.name===name);if(!n)return;if(inTS){toast('맨해튼(월스트리트 쪽)에 있어요 · 🚇 지하철로 돌아가요',3);return}if(onFerry){toast('배에서 내린 뒤에 찾아가요',2.4);return}const p=n.o.position;if(travelTo(p.x,-p.z,YC+.24))toast(`<b>${quest.FRIENDS[name][0]} ${name}</b>찾아가는 중 · 지도에 ❗ 표시`,2.6)},
 onCap:()=>dress(),heldKind:()=>held?held.userData.kind:null,takeHeld:()=>dropSnack()});
$('spots-toggle').onclick=()=>{const c=$('spots').classList.toggle('closed');$('spots-toggle').setAttribute('aria-expanded',String(!c))};
if(touch||innerWidth<700)$('spots').classList.add('closed');
function teleport(id){const p=L.pois.find(q=>q.id===id);if(!p)return;clearRoute();onFerry=false;if(metroOn)return;
 const [R,F]=p.tp,y=standAt(R,F,null);P.R=R;P.F=F;P.y=P.ty=y===null?YC:y;P.v=0;const dx=p.look[0]-R,dz=-(p.look[1]-F);cam.yaw=P.yaw=Math.atan2(-dx,-dz);cam.pitch=.16;cam.dist=Math.max(cam.dist,10);skySnap=true;snapCam=true;here=null;HERO.dog.init=false;setTS(false)}
let here=null;
function checkPois(){let near=null;if(!inTS&&!onFerry)for(const p of L.pois)if(Math.hypot(P.R-p.R,P.F-p.F)<p.r){near=p;break}
 if(near&&near!==here){const st=quest.stamp(near,E);toast(`<b>${near.icon} ${near.name}</b>${st?'🛂 여권에 도장 쾅! · ':''}${near.sub}`,4.5)}
 here=near;for(const li of $('spot-list').children)li.classList.toggle('here',!!near&&li.dataset.id===near.id)}
function streetName(C,R,F){let best=null,bd=1e9;for(const s of C.segs){const t=Math.max(0,Math.min(s.len,(R-s.a[0])*s.dir[0]+(F-s.a[1])*s.dir[1])),x=s.a[0]+s.dir[0]*t,z=s.a[1]+s.dir[1]*t,d=Math.hypot(R-x,F-z);if(d<bd){bd=d;best=s.name}}
 for(const cs of C.crossStreets){const a=C.segPoint(cs.k,cs.d,cs.from),b=C.segPoint(cs.k,cs.d,cs.to),dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz),t=Math.max(0,Math.min(l,((R-a[0])*dx+(F-a[1])*dz)/l)),d=Math.hypot(R-a[0]-dx/l*t,F-a[1]-dz/l*t);if(d<bd-2){bd=d;best=cs.name}}return best}
function areaName(){const R=P.R,F=P.F;if(onFerry)return FUN.ferry.state==='sail'?'⛴ 스태튼 아일랜드 페리 · 뉴욕항':'⛴ 페리 · 곧 출발해요';
 if(inTS)return TS.walk(R,F)!==null?'🎭 타임스스퀘어 · 빨간 계단':'🎭 타임스스퀘어 · '+streetName(TS.C,R,F);
 if(R>=FUN.ferry.PIER.R0&&R<=FUN.ferry.PIER.R1&&F<-119)return '⛴ 화이트홀 페리 선착장';
 if(L.bridgeWalk(R,F)!==null&&R>250&&R<800&&P.y>YC+1)return R<330?'🌉 브루클린 브릿지 · 맨해튼 쪽':R>700?'🌉 브루클린 브릿지 · 브루클린 쪽':'🌉 브루클린 브릿지 · 이스트강 위';
 if(F<-14&&R<335)return '🌳 배터리 파크';if(R<335&&F<16&&Math.abs(R)<34)return '🌳 볼링 그린';if(R>690&&R<746&&F>350)return '🌳 브루클린 브릿지 파크';if(F>586&&R>690)return '🌊 덤보 강가';
 return (R<500?'🗽 맨해튼 · ':'🧱 덤보 · ')+streetName(R<500?C1:C2,R,F)}

// ── 사진 모드(P) · 찰칵 저장
let photoOn=false;
function togglePhoto(){photoOn=document.body.classList.toggle('photo');$('photo').classList.toggle('on',photoOn);keys.clear();if(photoOn)toast('📷 사진 모드 · 📸 로 저장하고 P 나 Esc 로 돌아와요',2.2)}
function savePhoto(){render(0);let url;try{url=renderer.domElement.toDataURL('image/png')}catch(e){toast('사진을 저장하지 못했어요',2);return}
 const d=new Date(),pad=n=>String(n).padStart(2,'0'),a=document.createElement('a');a.href=url;a.download=`nyc-walk-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.png`;document.body.appendChild(a);a.click();a.remove();
 const fl=$('flash');fl.classList.remove('go');void fl.offsetWidth;fl.classList.add('go');sound.chime&&sound.chime(1568);
 setTimeout(()=>{if(quest.photo(photoPlace())&&photoOn)togglePhoto()},500)}
// 사진을 찍은 곳(심부름): 타임스스퀘어 · 페리(여신상 앞) · 브루클린 브릿지 위 · 덤보 워싱턴 스트리트
function photoPlace(){if(inTS)return 'ts';if(onFerry)return FUN.ferry.nearLiberty?'liberty':'ferry';if(L.bridgeWalk(P.R,P.F)!==null&&P.y>YC+1)return 'bridge';if(P.R>805&&P.R<880&&P.F>380&&P.F<600)return 'dumbo';return null}
$('photo').onclick=togglePhoto;$('shutter').onclick=savePhoto;
// ── 오른쪽 아래 단추(마을과 같다): 🚲 자전거 · ＋ · － · ◎ 뒤에서 보기
$('bike').onclick=()=>{if(started)toggleBike()};$('zin').onclick=()=>{cam.dist=Math.max(3.5,cam.dist*.8)};$('zout').onclick=()=>{cam.dist=Math.min(34,cam.dist*1.25)};$('recenter').onclick=()=>{cam.yaw=P.yaw;cam.pitch=.2;cam.dist=touch?10:9};
$('act').onclick=()=>doAct();
// 마을에서 열었으면 ✕ 로 돌아가기
function goHome(){try{window.parent.postMessage({dpNyc:'close'},'*')}catch(e){}}
if(embedded){$('home').hidden=false;$('home2').hidden=false;$('home').onclick=goHome;$('home2').onclick=goHome}

// ── 지도(오른쪽 아래): 땅 · 길 · 다리 · 나. 누르면 그곳으로 걸어간다
const mm=$('minimap'),mx=mm.getContext('2d'),MMS=520;
function drawMap(){const W=mm.width,H=mm.height,k=W/MMS,cx=W/2,cy=H/2,toX=R=>cx+(R-P.R)*k,toY=F=>cy-(F-P.F)*k,inMap=(x,y)=>x>-10&&x<W+10&&y>-10&&y<H+10;
 const rect=(a,b,c,d)=>mx.fillRect(toX(a),toY(d),(b-a)*k,(d-c)*k),icon=(t,R,F,sz=18)=>{const x=toX(R),y=toY(F);if(inMap(x,y)){mx.font=sz+'px sans-serif';mx.fillText(t,x,y)}};
 mx.textAlign='center';mx.textBaseline='middle';
 if(inTS){mx.fillStyle='#8f918c';mx.fillRect(0,0,W,H);mx.fillStyle='#b9b7ae';const B=TS.C.BB;rect(B.r0,B.r1,B.f0,B.f1);
  mx.fillStyle='#ffffff';for(const s of TS.C.streets){if(s.axis==='F')rect(s.c-5,s.c+5,s.lo-5,s.hi+5);else rect(s.lo-5,s.hi+5,s.c-5,s.c+5)}
  mx.fillStyle='#d42a2a';const St=TS.ST;rect(St.R0,St.R1,St.booth,St.F1);icon('🎭',TS.TX-20,TS.TF+18,22)}
 else{mx.fillStyle='#6f98ad';mx.fillRect(0,0,W,H);mx.fillStyle='#d9d5c9';
 rect(-430,330,-124,960);rect(-650,1450,950,2700);rect(690,1750,-420,612);rect(-1400,-880,-500,1100);
 mx.fillStyle='#9cc27e';rect(-200,330,-112,-22);rect(698,745,352,586);rect(-100,-50,146,196);
 mx.fillStyle='#ffffff';for(const C of [C1,C2])for(const s of C.streets){if(s.axis==='F')rect(s.c-5,s.c+5,s.lo-5,s.hi+5);else rect(s.lo-5,s.hi+5,s.c-5,s.c+5)}
 const pr=FUN.ferry.PIER;mx.fillStyle='#d9d5c9';rect(pr.R0,pr.R1,pr.F0,pr.F1);
 mx.strokeStyle='#8a6a48';mx.lineWidth=4;mx.beginPath();mx.moveTo(toX(240),toY(330));mx.lineTo(toX(805),toY(330));mx.stroke();
 mx.strokeStyle='#5d7380';mx.beginPath();mx.moveTo(toX(845-.8*480),toY(650+.6*480));mx.lineTo(toX(845+.8*185),toY(650-.6*185));mx.stroke();
 mx.fillStyle='#2f8a4f';const lb=L.LIB;mx.beginPath();mx.arc(toX(lb.R),toY(lb.F),5,0,7);mx.fill();
 {const b=FUN.ferry.boat.position;mx.save();mx.translate(toX(b.x),toY(-b.z));mx.rotate(-FUN.ferry.rot);mx.fillStyle='#ee7d1f';mx.fillRect(-9*k,-34*k,18*k,68*k);mx.restore()}}
 if(route.length){mx.strokeStyle='#e0a400';mx.lineWidth=3;mx.setLineDash([6,5]);mx.beginPath();mx.moveTo(cx,cy);for(const q of route)mx.lineTo(toX(q.R),toY(q.F));mx.stroke();mx.setLineDash([])}
 if(!inTS){for(const p of L.pois)icon(p.icon,p.R,p.F,20);for(const c of X.carts)icon(X.NAMES[X.cartKind(c,E)][0],c.R,c.F,15);icon('⛴',FUN.ferry.BOARD.R,FUN.ferry.BOARD.F+5,17);icon('🎷',FUN.busker.R,FUN.busker.F,15)
  const hk=held?held.userData.kind:null;for(const e of quest.ERRANDS){const st=quest.state.errands[e.id];if(st==='done')continue;const n=NPCS.find(q=>q.name===e.who);if(!n)continue;const give=st==='taken'&&e.buy&&e.buy.includes(hk);if(st==='taken'&&!give)continue;icon(give?'🎁':'❗',n.o.position.x,-n.o.position.z,give?16:15)}}
 for(const st of FUN.stations)icon('🚇',st.R,st.F,15);
 mx.save();mx.translate(cx,cy);mx.rotate(-P.yaw);mx.fillStyle='#d2483c';mx.strokeStyle='#fff';mx.lineWidth=3;mx.beginPath();mx.moveTo(0,-12);mx.lineTo(8,8);mx.lineTo(0,4);mx.lineTo(-8,8);mx.closePath();mx.stroke();mx.fill();mx.restore()}
mm.addEventListener('click',e=>{if(!started||photoOn)return;const r=mm.getBoundingClientRect(),k=mm.width/MMS,x=(e.clientX-r.left)/r.width*mm.width,y=(e.clientY-r.top)/r.height*mm.height,R=P.R+(x-mm.width/2)/k,F=P.F-(y-mm.height/2)/k;travelTo(R,F,P.y)});

// ── 시작
let started=false,snapCam=true;
const startBtn=$('start');
$('hero-face').textContent=heroOwner==='wife'?'👧':'👦';
Promise.race([kit,new Promise(r=>setTimeout(r,12000))]).then(()=>{startBtn.disabled=false;startBtn.textContent='산책 시작하기 ↗'});
startBtn.onclick=async()=>{if(started)return;started=true;$('overlay').classList.add('hidden');try{canvas.focus&&canvas.focus()}catch(e){}
 if(!sound.muted){try{await sound.unlock();if(VP.bgm)sound.musicStart()}catch(e){}}
 toast(touch?'<b>🗽 배터리 파크</b>땅을 누르면 그곳으로 걸어가요 · 화면을 끌면 둘러봐요 · 🚲 로 자전거':'<b>🗽 배터리 파크</b>방향키로 걷고 땅을 누르면 그곳으로 걸어가요 · B 자전거 · 바다 건너 자유의 여신상이 보여요',5.5)};

// ── 매 프레임
const clock=new T.Clock();let time=0,frame=0;
const fwd=new T.Vector3();
function step(dt){time+=dt;
 // 시간
 if(started)envP=(envP+dt/CYCLE)%1;E=CITY_ENV.env(envP);
 if(frame%15===0)dress();
 // 걷기 입력 — 마을처럼 W · S 앞뒤, A · D 는 방향을 돌리며(혼자 누르면 앞으로) 걷는다
 let turn=0,fw=0;
 if(started&&!photoOn&&!metroOn){turn=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);fw=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0)}
 if(turn&&!fw)fw=1;
 if(turn)cam.yaw-=turn*dt*2.35;
 const fast=keys.has('shift'),top=riding?(fast?SPD.bikeRun:SPD.bike):(fast?SPD.run:SPD.walk);
 let moved=false;
 if(onFerry)moved=stepFerry(dt,fw,top);else{
 let mvx=0,mvz=0,want=0;
 if(fw){if(route.length)clearRoute();mvx=-Math.sin(cam.yaw)*fw;mvz=-Math.cos(cam.yaw)*fw;want=top}
 else if(route.length){const q=route[0],dR=q.R-P.R,dF=q.F-P.F,d=Math.hypot(dR,dF);
  if(d<.35){route.shift();if(!route.length)arrive();else drawRoute()}else{mvx=dR/d;mvz=-dF/d;want=Math.min(top,Math.max(2.2,d*3+(route.length>1?top:0)))}}
 P.v+=(want-P.v)*Math.min(1,dt*(want>P.v?6:9));
 if(P.v>.05&&(mvx||mvz)){const ty=Math.atan2(-mvx,-mvz);let d=ty-P.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));P.yaw+=d*Math.min(1,dt*12);
  let sx=mvx*P.v*dt,sz=mvz*P.v*dt;if(route.length){const q=route[0],dd=Math.hypot(q.R-P.R,q.F-P.F),l=Math.hypot(sx,sz);if(l>dd){sx*=dd/l;sz*=dd/l}}
  const tryMove=(R,F)=>{const y=standAt(R,F,P.y);if(y===null)return false;P.R=R;P.F=F;P.ty=y;return true};
  if(tryMove(P.R+sx,P.F-sz)||tryMove(P.R+sx,P.F)||tryMove(P.R,P.F-sz)){moved=true;stuckT=0}else{P.v*=.5;if(route.length&&(stuckT+=dt)>.8){clearRoute();toast('길이 막혔어요. 다른 곳을 눌러 보세요',2)}}
  if(route.length&&!(down&&down.moved)){let d2=P.yaw-cam.yaw;d2=Math.atan2(Math.sin(d2),Math.cos(d2));cam.yaw+=d2*Math.min(1,dt*2.8)}}
 else{const y=standAt(P.R,P.F,P.y);if(y!==null)P.ty=y}
 if(P.ty!==undefined)P.y+=(P.ty-P.y)*Math.min(1,dt*14)}
 {const now=!onFerry&&TS.inArea(P.R,P.F);if(now!==inTS)setTS(now)}
 // 주인공 그리기(마을과 같은 걸음 · 자전거 자세)
 const ang=P.yaw+Math.PI,sa=Math.sin(ang),ca=Math.cos(ang),K=HERO.K;
 if(riding){const b=HERO.bike;b.g.position.set(P.R,P.y,-P.F);b.g.rotation.y=ang;const dd=moved?P.v*dt:0;b.wheels.forEach(w=>{w.rotation.x+=dd/(.42*K)});b.crank+=dd/(.9*K);b.cranks.forEach(c=>{c.rotation.x=b.crank});
  HERO.root.position.set(P.R+sa*-.22*K,P.y+.53*K,-P.F+ca*-.22*K);HERO.root.rotation.y=ang;P.walk=0;HERO.ride(b.crank,time,dt);if(held)held.visible=false}
 else{HERO.root.position.set(P.R,P.y+.03,-P.F);HERO.root.rotation.y=ang;P.walk+=((moved&&P.v>.4?1:0)-P.walk)*Math.min(1,dt*8);P.phase+=dt*(4.5+P.v*.9)*P.walk;HERO.walk(P.phase,P.walk,time,dt);if(held)held.visible=true}
 HERO.shadow.position.set(P.R,P.y+.05,-P.F);
 HERO.updateDog(dt,time,P.R,-P.F,ang,riding,onFerry?()=>P.y:(x,z,y)=>standAt(x,-z,y));
 if(held&&(heldT-=dt)<=0)dropSnack();
 // 간식 카트 가까이
 {let nc=null;if(!inTS&&!onFerry)for(const c of X.carts)if(Math.hypot(c.R-P.R,c.F-P.F)<4.2){nc=c;break}nearCart=nc;
  if(frame%4===0){const a2=findAct(),id=a2?a2.id:'';if(id!==(act?act.id:'')){const el=$('act');if(a2){el.innerHTML=`<kbd>F</kbd> ${a2.label}`;el.hidden=false;el.disabled=!a2.run}else el.hidden=true}act=a2}
  if(quest.talking){const n=NPCS.find(q=>q.name===quest.talking);if(!n||Math.hypot(n.o.position.x-P.R,n.o.position.z+P.F)>7)quest.closeTalk()}}
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
 {const fN=inTS?Math.min(E.fogNear*2,90):E.fogNear*2,fF=inTS?Math.min(Math.max(160,E.fogFar*2),430):Math.max(160,E.fogFar*2);scene.fog.near+=(fN-scene.fog.near)*skyK;scene.fog.far+=(fF-scene.fog.far)*skyK}
 // 동네 장면(신호 · 사람 · 비둘기 · 마을 친구 · 날씨 재질) · 명소 · 즐길 거리
 const me=new T.Vector3(P.R,P.y,-P.F);
 for(const a of AREAS){if(!!a.ts!==inTS)continue;a.C.updateLights(a.ride.city,dt);a.ride.pos=a.C.nearestU(P.R,P.F);a.S.setWinK(post&&post.on?1:.6);a.S.update(time,dt,a.ride,E,me)}
 if(inTS)TS.update(time,dt,E,me);else{L.update(time,dt,E,camera,me);X.update(time,dt,E,camera.position);SEA.update(time,dt,E,me)}
 FUN.update(time,dt,E,me,started);quest.update(time,me,inTS||onFerry);
 ring.scale.setScalar(1+Math.sin(time*4)*.12);
 // 가로등 불빛(가까운 4개)
 if(n>.01){const near=lampPos.map(q=>[q,q.distanceToSquared(me)]).sort((a,b)=>a[1]-b[1]).slice(0,4);lampLights.forEach((l,i)=>{l.position.copy(near[i][0]);l.intensity=n*40})}else lampLights.forEach(l=>l.intensity=0);
 // 눈 · 비 · 꽃잎/낙엽 · 별 · 번개
 const c=camera.position;camera.getWorldDirection(fwd);
 {const sa2=E.snow;snowfall.visible=sa2>.01;$('frost').style.opacity=(sa2*.7).toFixed(3);if(snowfall.visible){snowMat.opacity=.95*sa2;for(let i=0;i<FLAKES;i++){const h=((i*.618-time*(2.4+(i%5)*.35))%14+14)%14,x=Math.sin(i*12.9898)*.5,z=Math.cos(i*78.233)*.5;snowPos[i*3]=c.x+fwd.x*14+x*44+Math.sin(time*.8+i)*.6-h*.4;snowPos[i*3+1]=c.y-6+h*1.15;snowPos[i*3+2]=c.z+fwd.z*14+z*44+Math.cos(time*.6+i*.7)*.6}snowGeo.attributes.position.needsUpdate=true}}
 {const rn=E.rain;rainfall.visible=rn>.01;sound.rain&&sound.rain(started?rn:0);if(rainfall.visible){rainMat.opacity=.5*rn;for(let i=0;i<DROPS;i++){const h=((i*.618-time*(24+(i%5)*3))%20+20)%20,x=c.x+fwd.x*12+Math.sin(i*12.9898)*26,z=c.z+fwd.z*12+Math.cos(i*78.233)*26,y=c.y-7+h,k2=i*6;rainPos[k2]=x;rainPos[k2+1]=y;rainPos[k2+2]=z;rainPos[k2+3]=x-.12;rainPos[k2+4]=y-1.25;rainPos[k2+5]=z+.05}rainGeo.attributes.position.needsUpdate=true}
  if(rn>.6&&started){boltWait-=dt;if(boltWait<=0){boltT=1;boltWait=3+Math.random()*5;setTimeout(()=>sound.thunder&&sound.thunder(),300+Math.random()*900)}}boltT=Math.max(0,boltT-dt*3.2);bolt.style.opacity=(boltT*(.55+.45*Math.sin(time*70))*.7).toFixed(3)}
 {const leaf=E.leaves>E.petals,amtP=Math.max(E.petals,E.leaves);petals.visible=!snowfall.visible&&E.rain<.1&&amtP>.02;petals.material.color.set(leaf?'#d8742c':'#f5c5cb');petals.material.size=leaf?.24:.14;petals.material.opacity=.85*amtP;
  if(petals.visible){for(let i=0;i<PET;i++){petalPos[i*3]=me.x+Math.sin(i*54.1+time*.15)*25;petalPos[i*3+1]=me.y+((i*.73-time*.23)%12+12)%12;petalPos[i*3+2]=me.z+Math.cos(i*3.1+time*.03)*30}petalGeo.attributes.position.needsUpdate=true}}
 {const sv=E.stars;stars.visible=moon.visible=sv>.01;if(sv>.01){stars.position.copy(camera.position);stars.material.opacity=sv*.9;moon.material.opacity=sv}}
 if(started)for(const [k2,ok,msg] of NOTES)if(!noted.has(k2)&&ok(E)){noted.add(k2);if(toastT<=0)toast(msg,3.5);break}
 if(E.p<.02)noted.clear();
 // 보행 신호음
 if(started&&(S1.walk||S2.walk)&&(chirpT-=dt)<=0){chirpT=1;sound.chirp&&sound.chirp()}
 sound.musicSync&&sound.musicSync({mode:started?'playing':'paused'});
 if(toastT>0){toastT-=dt;if(toastT<=0)$('toast').classList.remove('show')}
 if(started)checkPois();
 if(frame%6===0){$('area').textContent=areaName();$('clock').textContent=`${E.dark>.5?'🌙':E.dusk>.4?'🌅':E.icon} ${CITY_ENV.clock(E.hour)} · ${E.seasonName}${E.rain>.3?' · 소나기':E.snow>.3?' · 함박눈':''}${X.fireworks.on?' · 불꽃놀이':''}`}
 if(frame%3===0)drawMap();
 frame++}
function render(dt){const S=inTS?TS.S:P.R>520?S2:S1;if(S.wet)S.wet.render(renderer,scene,camera,!!(post&&post.on));
 if(post&&post.on)post.render(dt,E);else renderer.render(scene,camera)}
let paused=false;
function tick(){const dt=Math.min(.05,clock.getDelta());if(!paused){step(dt);render(dt)}requestAnimationFrame(tick)}
requestAnimationFrame(tick);
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();if(post)post.setSize()});
window.nycDebug={TS,FUN,SEA,quest,openMetro,rideMetro,closeMetro,boardFerry,leaveFerry,tossCoin,doAct,setTS,deck,NPCS,get act(){return act},get inTS(){return inTS},get onFerry(){return onFerry},get metroOn(){return metroOn},P,cam,C1,C2,S1,S2,L,X,HERO,scene,camera,renderer,T,step,teleport,travelTo,findPath,toggleBike,buySnack,togglePhoto,savePhoto,get route(){return route},get riding(){return riding},get E(){return E},setP(p){envP=p;E=CITY_ENV.env(p);skySnap=true;dress()},get envP(){return envP},start:()=>startBtn.onclick(),snap(){snapCam=true;skySnap=true},standAt,get post(){return post},kit,get kitDone(){return kitDone},keys,pause(v){paused=v},frame(n=1,dt=.05){for(let i=0;i<n;i++)step(dt);render(dt)}};
})();
