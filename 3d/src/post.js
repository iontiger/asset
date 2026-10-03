/* ═══════ 우편배달 — '바람을 따라' (DentPhoto Village Rides) ═══════
   마을 북동쪽 'DentPhoto 우체국' 문 앞에 가면 전용 게임 화면이 열린다. 게임은 따로 된 페이지 3d/ride/
   (Three.js 오토바이 주행 · 21.6km · 편지 80통 · 갈림길은 협곡 헤어핀이 기본 · 목표봉 · 개울)를 전체 화면 iframe 으로 띄운다.
   - 게임 중에는 마을 renderScene 을 건너뛰고(그리기 쉼), 키 입력은 iframe 이 받는다.
   - 게임 쪽에서 postMessage {dpRide:'close'|'finish'} 로 알려 온다. 기록은 같은 출처 localStorage 'dentphoto-record-v1'.
   - 시험용 window.dpPost (open · close · frame · DOOR) */
'use strict';
(function(){
const beep=(f,d=0,l=.1,w='triangle',v=.04)=>{try{if(playLoud())tone(f,d,l,w,v)}catch{}};
const V3=THREE.Vector3;
const SM=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.8,metalness:0},o||{}));

/* ═══ 1. 배달 오토바이 + 우편배달부 (마을 우체국 앞에 세워 둔 것과 게임에서 타는 것) ═══ */
function beamM(p,a,b,r,m){const A=new V3(...a),B=new V3(...b),d=B.clone().sub(A),L=d.length();const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,L,8),m);o.position.copy(A).addScaledVector(d,.5);o.quaternion.setFromUnitVectors(new V3(0,1,0),d.normalize());o.castShadow=true;p.add(o);return o}
function makeBike(){
  const g=new THREE.Group(),lean=new THREE.Group();g.add(lean);
  const red=SM('#d8442f',{roughness:.42}),dk=SM('#2c2c33',{roughness:.65}),chrome=SM('#dfe3e8',{roughness:.25,metalness:.6}),
    seat=SM('#3a2a22'),wood=SM('#cf9452'),woodD=SM('#9a6532'),parcel=SM('#eadcae'),parcel2=SM('#d9b98a'),twine=SM('#8a5a2c'),
    blue=SM('#3d6fb8'),navy=SM('#28406e'),skin=SM('#f3c9a2'),hair=SM('#c8662e'),bag=SM('#8b5a32'),scarfM=SM('#e2483a'),white=SM('#fbf7ee'),
    lamp=SM('#fff6d8',{emissive:'#ffe9a8',emissiveIntensity:.8}),tail=SM('#ff4a3a',{emissive:'#ff2a1a',emissiveIntensity:.9});
  const B=(w,h,d,m,x,y,z,p=lean)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o};
  const S=(r,m,x,y,z,sx=1,sy=1,sz=1,p=lean,det=1)=>{const o=new THREE.Mesh(new THREE.IcosahedronGeometry(r,det),m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;p.add(o);return o};
  const C=(rt,rb,h,m,x,y,z,p=lean,n=12)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,n),m);o.position.set(x,y,z);o.castShadow=true;p.add(o);return o};
  const wheels=[];
  for(const z of [.76,-.74]){const w=new THREE.Group();w.position.set(0,.37,z);lean.add(w);const t=new THREE.Mesh(new THREE.TorusGeometry(.29,.1,8,20),dk);t.rotation.y=Math.PI/2;t.castShadow=true;w.add(t);
    const hb=C(.15,.15,.22,chrome,0,0,0,w,10);hb.rotation.z=Math.PI/2;for(let k=0;k<3;k++)B(.03,.5,.03,chrome,0,0,0,w).rotation.x=k*Math.PI/3;wheels.push(w)}
  // 앞 포크 · 흙받이 · 전조등 · 핸들
  beamM(lean,[.1,.37,.76],[.1,1.08,.52],.035,chrome);beamM(lean,[-.1,.37,.76],[-.1,1.08,.52],.035,chrome);
  B(.26,.07,.46,red,0,.74,.8).rotation.x=.25;
  C(.13,.15,.14,chrome,0,1.02,.66,lean,14).rotation.x=Math.PI/2;C(.11,.11,.03,lamp,0,1.02,.735,lean,14).rotation.x=Math.PI/2;
  B(.86,.05,.05,chrome,0,1.13,.5);for(const x of [-.42,.42])B(.08,.07,.14,dk,x,1.13,.5);
  // 몸통 · 안장 · 엔진 · 배기관 · 뒤 흙받이
  S(.3,red,0,.86,.22,1,.82,1.7);B(.36,.12,.62,seat,0,1.0,-.24);B(.3,.3,.42,dk,0,.52,0);
  C(.06,.08,.9,chrome,.24,.48,-.32,lean,8).rotation.x=Math.PI/2-.1;
  B(.3,.07,.5,red,0,.76,-.78).rotation.x=-.18;
  // 짐받이 · 나무 상자 · 소포 · 편지 다발 (참고 그림처럼 높이 쌓았다)
  B(.62,.04,.74,chrome,0,1.02,-.66);
  B(.6,.38,.58,wood,0,1.23,-.64);for(const y of [1.1,1.3])B(.64,.05,.62,woodD,0,y,-.64);for(const x of [-.31,.31])B(.04,.4,.62,woodD,x,1.23,-.64);
  {const r=.12;B(.5,.3,.44,parcel,.02,1.57,-.62).rotation.y=r;B(.52,.31,.05,twine,.02,1.57,-.62).rotation.y=r;B(.05,.31,.46,twine,.02,1.57,-.62).rotation.y=r}
  {const r=-.2;B(.36,.24,.3,parcel2,-.05,1.84,-.6).rotation.y=r;B(.37,.05,.31,twine,-.05,1.86,-.6).rotation.y=r}
  B(.3,.12,.22,white,.12,2.02,-.58).rotation.y=.3;
  B(.16,.08,.04,tail,0,.98,-1.03);
  // 우편배달부 — 몸을 숙이고 핸들을 꽉 잡는다
  const rider=new THREE.Group();lean.add(rider);
  for(const s of [-1,1]){B(.17,.17,.44,navy,s*.17,1.04,.02,rider);B(.15,.42,.15,navy,s*.2,.78,.24,rider);B(.17,.1,.26,dk,s*.2,.56,.3,rider)}
  B(.5,.56,.34,blue,0,1.4,-.06,rider).rotation.x=.5;B(.52,.08,.36,navy,0,1.17,-.16,rider).rotation.x=.5;
  B(.1,.34,.32,bag,.3,1.3,-.14,rider);beamM(rider,[-.24,1.62,.06],[.3,1.42,-.12],.03,bag);
  beamM(rider,[.25,1.56,.06],[.4,1.14,.48],.07,blue);beamM(rider,[-.25,1.56,.06],[-.4,1.14,.48],.07,blue);
  S(.07,skin,.4,1.13,.5,1,1,1,rider);S(.07,skin,-.4,1.13,.5,1,1,1,rider);
  const head=new THREE.Group();head.position.set(0,1.86,.16);rider.add(head);
  S(.31,skin,0,0,0,1,1,1,head,2);S(.32,hair,0,.05,-.06,1,.9,1,head,1);
  C(.31,.3,.17,navy,0,.22,0,head,16);C(.315,.315,.05,scarfM,0,.15,0,head,16);B(.32,.035,.2,navy,0,.13,.3,head);
  S(.035,dk,.11,0,.29,1,1,1,head);S(.035,dk,-.11,0,.29,1,1,1,head);
  const scarf=B(.2,.07,.5,scarfM,0,1.66,-.32,rider);
  return {g,lean,wheels,rider,scarf,head}}

/* ═══ 2. 마을의 DentPhoto 우체국 (게임 입구) — 목표봉 가는 길목 ═══ */
const spot=findSpot(58,-112,9);ATTRACT.push(spot);
const cx=spot.x,cz=spot.z,q=Math.round(Math.atan2(-cx,-cz)/(Math.PI/2))*(Math.PI/2),fx=Math.round(Math.sin(q)),fz=Math.round(Math.cos(q));
const BW=7.2,BD=5.6,BH=3.9,gy=terrainHeight(cx,cz);
const og=new THREE.Group();og.position.set(cx,gy,cz);og.rotation.y=q;og.userData.world=true;scene.add(og);
box(og,0,-.7,0,BW+.8,1.6,BD+.8,'#d9d2c3');box(og,0,BH/2,0,BW,BH,BD,'#f6ecd8');box(og,0,.25,0,BW+.06,.5,BD+.06,'#c9a77c');
for(const s of [-1,1])box(og,0,BH+.95,s*BD*.27,BW+.9,.22,BD*.66,'#cf4f39').rotation.x=s*.62;
box(og,0,BH+1.62,0,BW+.95,.2,.3,'#a63a28');
box(og,0,1.2,BD/2+.04,1.6,2.4,.1,'#3b5f86');box(og,0,1.5,BD/2+.1,.9,.9,.04,'#9fd3e0');
for(const sx of [-1,1])box(og,sx*2.5,2.0,BD/2+.04,1.5,1.2,.08,'#9fd3e0');
sign(og,'✉ DentPhoto 우체국',0,BH-.45,BD/2+.1,5.6,'#ffffff','#c8402f');
cyl(og,2.6,.65,BD/2+1.3,.34,.34,1.3,'#d23c2c',16);sphere(og,2.6,1.3,BD/2+1.3,.34,'#d23c2c',1);box(og,2.6,1.0,BD/2+1.64,.34,.06,.02,'#3a2a22');
{const pk=makeBike();pk.g.position.set(-2.7,0,BD/2+1.5);pk.g.rotation.y=.9;pk.g.scale.setScalar(.95);pk.rider.visible=false;og.add(pk.g)}
cyl(og,-4.6,1.1,BD/2+.6,.08,.08,2.2,'#7a5a3a',8);sign(og,'🏍 바람을 따라 · 배달 →',-4.6,1.95,BD/2+.66,3.4,'#3b2a1a','#f2c230');
obstacles.push({x:cx,z:cz,w:(fx?BD:BW)+.9,d:(fx?BW:BD)+.9,world:true});
const DOOR=nearestWalkable(cx+fx*(BD/2+2.6),cz+fz*(BD/2+2.6))||{x:cx+fx*(BD/2+2.6),z:cz+fz*(BD/2+2.6)};
const nearDoor=(r=3.6)=>Math.hypot(player.x-DOOR.x,player.z-DOOR.z)<r;


/* ═══ 3. 게임 화면 — 3d/ride/ 를 전체 화면 iframe 으로 ═══ */
const RIDE_URL='ride/index.html',REC='dentphoto-record-v1';
const css=document.createElement('style');css.textContent=`
#postGame{position:fixed;inset:0;z-index:2147483000;background:#1d130b;display:none}
#postGame.on{display:block}
#postGame iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#b8dbe0}
#postGame .pg-wipe{position:absolute;inset:0;background:#1d130b;pointer-events:none;opacity:0}
#postGame.wipe .pg-wipe{animation:pgWipe .8s ease-out}
@keyframes pgWipe{0%{opacity:1}100%{opacity:0}}
body.post-on #mobilepad,body.post-on .toast{display:none!important}`;
document.head.appendChild(css);
const root=document.createElement('div');root.id='postGame';root.innerHTML='<div class="pg-wipe"></div>';document.body.appendChild(root);
const blocker=document.createElement('i');blocker.className='game-modal';blocker.style.cssText='display:none!important';document.body.appendChild(blocker);   // 이야기 퀘스트가 게임 중에 끼어들지 않게
const PG={on:false,cleared:false,fxLock:false,frame:null};
const rec=()=>{try{return JSON.parse(localStorage.getItem(REC)||'{}')||{}}catch{return {}}};
const mmss=t=>`${Math.floor(t/60)}분 ${Math.floor(t%60)}초`;
function open(){if(PG.on)return;try{if(PLAY.mode)endPlay();if(riding)toggleBike(false)}catch{}route=[];target=null;try{drawRoute()}catch{}keys={};
  PG.on=true;PG.cleared=false;PG.fxLock=FX.locked;FX.locked=true;document.body.classList.add('post-on');blocker.classList.add('on');
  const f=document.createElement('iframe');f.src=RIDE_URL;f.title='바람을 따라 — 우편 배달';f.allow='autoplay';f.addEventListener('load',()=>{try{f.contentWindow.focus()}catch{}});
  root.insertBefore(f,root.firstChild);PG.frame=f;root.classList.add('on');root.classList.remove('wipe');void root.offsetWidth;root.classList.add('wipe');
  beep(523,0,.1);beep(784,.1,.14)}
function close(){if(!PG.on)return;PG.on=false;try{PG.frame.src='about:blank'}catch{}PG.frame&&PG.frame.remove();PG.frame=null;root.classList.remove('on','wipe');
  document.body.classList.remove('post-on');blocker.classList.remove('on');FX.locked=PG.fxLock;armed=false;keys={};
  try{$('#world').focus()}catch{}rowHud();if(PG.cleared){PG.cleared=false;try{celebrate()}catch{}toast('✉ 배달 완료! 마을에 편지가 도착했어요','gem')}}
addEventListener('message',e=>{const d=e.data;if(!PG.on||!PG.frame||e.source!==PG.frame.contentWindow||!d||typeof d!=='object')return;
  if(d.dpRide==='close')close();
  else if(d.dpRide==='finish'&&(d.letters|0)>=80)PG.cleared=true});
const _ib=inputBusy;inputBusy=function(){return _ib()||PG.on};
// 게임 화면이 덮고 있는 동안 마을은 그리지 않는다
const _rs=renderScene;renderScene=function(){if(PG.on)return;return _rs.apply(this,arguments)};

/* ═══ 4. 마을 쪽 — 문 앞에 오면 열기 · F · 미니게임판 ═══ */
let armed=true;
const _fp=findPlay;findPlay=function(){if(!PG.on&&nearDoor()){PLAY_TXT.post='🏍 바람을 따라 — 편지 배달하기';return {kind:'post'}}return _fp()};
const _da=doAction;doAction=function(){if(!inputBusy()&&!PLAY.mode&&walkish()&&nearDoor()){open();return}return _da()};
$('#ghTip').insertAdjacentHTML('beforebegin','<div class="gh-row" id="ghPostRow"><span><b>🏍 바람을 따라 · 우편 배달</b><small id="ghPost"></small></span><button class="gh-btn" id="ghPostBtn">우체국으로</button></div>');
$('#ghPostBtn').onclick=()=>{if(nearDoor(7))return open();if(PLAY.mode)endPlay();armed=true;beginWalk(true);travelTo(DOOR,null)};
function rowHud(){const e=$('#ghPost');if(!e)return;const r=rec();e.textContent=r.score?`최고 ${Number(r.score).toLocaleString()}점${r.time?' · 최단 '+mmss(r.time):''}`:'21.6km 편지 배달 · 협곡 · 목표봉 · 개울';$('#ghPostBtn').textContent=nearDoor(7)?'출발':'우체국으로'}
let rowT=0;
const _ue=updateExtras;updateExtras=function(dt){_ue(dt);try{if((rowT-=dt)<=0){rowT=1;rowHud()}
  if(!PG.on){const d=Math.hypot(player.x-DOOR.x,player.z-DOOR.z);if(d>8)armed=true;if(armed&&d<3.2&&cameraMode==='walking'&&!inputBusy()&&!PLAY.mode&&!document.querySelector('.game-modal.on,#heroPick.on,#splash')){armed=false;open()}}}catch(e){console.error(e)}};
rowHud();
window.dpPost={open,close,DOOR,spot,get on(){return PG.on},get frame(){return PG.frame}};
})();
