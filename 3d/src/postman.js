/* ═══════ 골목 배달부 — 3d/postman/ (DentPhoto Village · Alley Postman) ═══════
   우체국 동쪽 길가에 빨간 차양 · 커다란 편지 간판 · 빨간 우체통이 있는 작은 '골목 배달부 집'을 세운다.
   문 앞에 가면(또는 F · 미니게임판 버튼) 언덕 위 골목 마을 배달 게임 3d/postman/ 을 전체 화면 iframe 으로 띄운다.
   - 게임 중에는 마을 renderScene 을 건너뛰고(그리기 쉼), 키 입력은 iframe 이 받는다. 게임 쪽 ✕ 가 postMessage {dpPostman:'close'} 를 보낸다.
   - 배달 기록: 게임이 남기는 localStorage asset-village-3d-postman {done,total,cleared} 를 읽어 미니게임판 줄에 보인다. 축제까지 마치면 집 앞에 등불이 켜진다.
   - 시험용 window.dpPostman (open · close · DOOR · spot · refresh) */
'use strict';
(function(){
const beep=(f,d=0,l=.1,w='triangle',v=.04)=>{try{if(playLoud())tone(f,d,l,w,v)}catch{}};
const PM_URL='postman/index.html';

/* ═══ 1. 골목 배달부 집 ═══ */
const spot=findSpot(80,-126,8);ATTRACT.push(spot);
const cx=spot.x,cz=spot.z,q=Math.round(Math.atan2(-cx,-cz)/(Math.PI/2))*(Math.PI/2),fx=Math.round(Math.sin(q)),fz=Math.round(Math.cos(q));
const gy=terrainHeight(cx,cz);
const hs=new THREE.Group();hs.position.set(cx,gy,cz);hs.rotation.y=q;hs.userData.world=true;scene.add(hs);
const W=6.4,D=5,H=5.6;
box(hs,0,-.3,0,W+1.4,.8,D+1.4,'#b9ad98');box(hs,0,H/2+.1,0,W,H,D,'#f6efe0');box(hs,0,.45,0,W+.1,.7,D+.1,'#d9c7a8');box(hs,0,H+.05,0,W+.3,.25,D+.3,'#e7d9bf');
// 박공지붕(빨강) — 두 장의 기운 판
for(const s of [-1,1]){const r=box(hs,s*W*.27,H+1.05,0,W*.62,.22,D+.8,'#c0504d');r.rotation.z=-s*.55}
box(hs,0,H+1.85,0,.3,.3,D+.9,'#9c3f3c');box(hs,W*.28,H+1.4,-.9,.6,1.6,.6,'#d9c7a8');
// 앞면: 문 · 창 · 차양 · 간판
box(hs,0,1.25,D/2+.04,1.3,2.3,.12,'#c0504d');box(hs,.42,1.2,D/2+.12,.1,.1,.08,'#f2c14e');box(hs,0,.12,D/2+.45,1.8,.24,.8,'#cfc6b4');
for(const s of [-1,1]){box(hs,s*2.1,1.6,D/2+.04,1.2,1.2,.1,'#ffffff');box(hs,s*2.1,1.6,D/2+.08,.95,.95,.08,'#9cc7e0');box(hs,s*2.1,.9,D/2+.2,1.2,.22,.32,'#8a6648');for(let k=-1;k<=1;k++)sphere(hs,s*2.1+k*.32,1.08,D/2+.24,.14,['#f28aa0','#f6d36b','#fbf6ea'][k+1]);
 box(hs,s*2.1,4.1,D/2+.04,1.1,1.3,.1,'#ffffff');box(hs,s*2.1,4.1,D/2+.08,.86,1.06,.08,'#f6d9a8')}
const aw=new THREE.Group();aw.position.set(0,2.75,D/2+.55);hs.add(aw);for(let k=0;k<6;k++){const st=box(aw,-1.25+k*.5,0,0,.5,.08,1.1,k%2?'#fbf6ea':'#d6453d');st.rotation.x=.35}
sign(hs,'✉ 골목 배달부 · ALLEY POSTMAN',0,3.45,D/2+.1,4.2,'#fffaf0','#c0504d');
// 큰 편지 간판(지붕 위) · 빨간 우체통 · 소포 더미
const env=new THREE.Group();env.position.set(0,H+2.6,D/2-.4);hs.add(env);box(env,0,0,0,2.2,1.4,.12,'#fffaf0');
{const flap=new THREE.Shape();flap.moveTo(-1.1,.7);flap.lineTo(1.1,.7);flap.lineTo(0,-.1);flap.closePath();const m=new THREE.Mesh(new THREE.ShapeGeometry(flap),new THREE.MeshStandardMaterial({color:'#efe2c8',side:THREE.DoubleSide}));m.position.z=.07;env.add(m)}
const heart=sphere(env,0,.05,.1,.2,'#d6453d');heart.scale.set(1,1,.4);beam(hs,[0,H+1.8,D/2-.4],[0,H+1.95,D/2-.4],.06,'#6b5a45');
{const pb=new THREE.Group();pb.position.set(2.9,0,D/2+1.2);hs.add(pb);cyl(pb,0,.75,0,.36,.36,1.1,'#d6453d');const top=sphere(pb,0,1.3,0,.36,'#d6453d',2);top.scale.y=.6;box(pb,0,1.05,.35,.4,.05,.05,'#3b2c2a');cyl(pb,0,.1,0,.24,.28,.2,'#3b3346')}
box(hs,-2.9,.3,D/2+1,.7,.6,.6,'#c9a372');box(hs,-2.75,.75,D/2+1.05,.5,.36,.45,'#d9b98a');box(hs,-3.05,.2,D/2+1.6,.5,.4,.4,'#b88f5a');
// 밤 등불(축제를 마치면 줄 등불이 생긴다)
const lamps=[];for(const s of [-1,1]){const l=sphere(hs,s*.95,2.35,D/2+.25,.16,'#fff1c4');l.material=new THREE.MeshStandardMaterial({color:'#fff1c4',emissive:'#ffc46b',emissiveIntensity:.4});lamps.push(l)}
const garland=new THREE.Group();garland.visible=false;hs.add(garland);for(let k=0;k<9;k++){const t=k/8,x=-3+t*6,y=H-.2-Math.sin(Math.PI*t)*.6;const c=['#ffb766','#ff8a7a','#ffd36b'][k%3];const m=new THREE.Mesh(new THREE.CylinderGeometry(.16,.13,.32,8),new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:.8}));m.position.set(x,y,D/2+.6);garland.add(m);lamps.push(m)}
obstacles.push({x:cx,z:cz,w:(fx?D:W)+1,d:(fx?W:D)+1,world:true});
const DOOR=nearestWalkable(cx+fx*(D/2+2),cz+fz*(D/2+2))||{x:cx+fx*(D/2+2),z:cz+fz*(D/2+2)};
const nearDoor=(r=3.2)=>Math.hypot(player.x-DOOR.x,player.z-DOOR.z)<r;

/* ═══ 2. 게임 화면 — 3d/postman/ 을 전체 화면 iframe 으로 ═══ */
const css=document.createElement('style');css.textContent=`
#pmGame{position:fixed;inset:0;z-index:2147483000;background:#f6dccb;display:none}
#pmGame.on{display:block}
#pmGame iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#f6dccb}
body.pm-on #mobilepad,body.pm-on .toast{display:none!important}`;
document.head.appendChild(css);
const root=document.createElement('div');root.id='pmGame';document.body.appendChild(root);
const blocker=document.createElement('i');blocker.className='game-modal';blocker.style.cssText='display:none!important';document.body.appendChild(blocker);   // 이야기 퀘스트가 게임 중에 끼어들지 않게
const PG={on:false,fxLock:false,frame:null};
function open(){if(PG.on)return;try{if(PLAY.mode)endPlay();if(riding)toggleBike(false)}catch{}route=[];target=null;try{drawRoute()}catch{}keys={};
  PG.on=true;PG.fxLock=FX.locked;FX.locked=true;document.body.classList.add('pm-on');blocker.classList.add('on');
  const f=document.createElement('iframe');f.src=PM_URL+'?hero='+(window.dpHero==='wife'?'wife':'me');f.title='골목 배달부';f.allow='autoplay; fullscreen';
  f.addEventListener('load',()=>{try{f.contentWindow.focus()}catch{}});root.appendChild(f);PG.frame=f;root.classList.add('on');
  beep(659,0,.12);beep(784,.12,.12);beep(1047,.24,.2)}
function close(){if(!PG.on)return;PG.on=false;try{PG.frame.src='about:blank'}catch{}PG.frame&&PG.frame.remove();PG.frame=null;root.classList.remove('on');
  document.body.classList.remove('pm-on');blocker.classList.remove('on');FX.locked=PG.fxLock;armed=false;keys={};try{$('#world').focus()}catch{}rowHud();refresh()}
addEventListener('message',e=>{const d=e.data;if(!PG.on||!PG.frame||e.source!==PG.frame.contentWindow||!d||typeof d!=='object')return;if(d.dpPostman==='close')close()});
const _ib=inputBusy;inputBusy=function(){return _ib()||PG.on};
const _rs=renderScene;renderScene=function(){if(PG.on)return;return _rs.apply(this,arguments)};

/* ═══ 3. 마을 쪽 — 문 앞에 오면 열기 · F · 미니게임판 ═══ */
let armed=true;
const _fp=findPlay;findPlay=function(){if(!PG.on&&nearDoor()){PLAY_TXT.postman='✉ 골목 배달부 — 문으로 들어가기';return {kind:'postman'}}return _fp()};
const _da=doAction;doAction=function(){if(!inputBusy()&&!PLAY.mode&&walkish()&&nearDoor()){open();return}return _da()};
$('#ghTip').insertAdjacentHTML('beforebegin','<div class="gh-row" id="ghPmRow"><span><b>✉ 골목 배달부</b><small id="ghPm">언덕 위 골목 마을 · 날마다 새 배달 · 킥보드 · 고양이 도감</small></span><button class="gh-btn" id="ghPmBtn">배달부 집으로</button></div>');
$('#ghPmBtn').onclick=()=>{if(nearDoor(7))return open();if(PLAY.mode)endPlay();armed=true;beginWalk(true);travelTo(DOOR,null)};
function rowHud(){const b=$('#ghPmBtn');if(b)b.textContent=nearDoor(7)?'입장':'배달부 집으로'}
const RKEY='asset-village-3d-postman';let R={};
function refresh(){try{R=JSON.parse(localStorage.getItem(RKEY)||'{}')||{}}catch{R={}}const el=$('#ghPm');if(el)el.textContent=R.done||R.day>1?`✉ ${R.day>1?R.day+'일째 · ':''}배달 ${R.done}/${R.total||18}${R.cleared?' · 🏮 축제 끝':''}`:'언덕 위 골목 마을 · 날마다 새 배달 · 킥보드 · 고양이 도감';garland.visible=!!R.cleared}
addEventListener('storage',e=>{if(e.key===RKEY)refresh()});
let rowT=0,ft=0;
const _ue=updateExtras;updateExtras=function(dt){_ue(dt);try{ft+=dt;
  const night=(()=>{try{return Math.max(0,Math.min(1,(sun&&sun.intensity!==undefined)?1-sun.intensity/2.5:0))}catch{return 0}})();
  lamps.forEach((l,k)=>{l.material.emissiveIntensity=(k<2?.4:.8)+night*2+Math.sin(ft*2.4+k)*.08});env.rotation.z=Math.sin(ft*1.3)*.04;
  if((rowT-=dt)<=0){rowT=1;rowHud()}
  if(!PG.on){const dd=Math.hypot(player.x-DOOR.x,player.z-DOOR.z);if(dd>8)armed=true;if(armed&&dd<2.6&&cameraMode==='walking'&&!inputBusy()&&!PLAY.mode&&!document.querySelector('.game-modal.on,#heroPick.on,#splash')){armed=false;open()}}}catch(e){console.error(e)}};
rowHud();refresh();
window.dpPostman={open,close,DOOR,spot,house:hs,URL:PM_URL,refresh,get on(){return PG.on},get frame(){return PG.frame}};
})();
