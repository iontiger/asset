/* ═══════ 덴포토 마을의 비밀 — 바닷가 선술집 (The Secret of DentPhoto Village) ═══════
   남쪽 해변 DentPhoto 선착장 옆, 사용자가 준 포스터 그림처럼 밤바다 항구 마을 분위기의 나무 선술집과 시계탑.
   문 앞에 가면(또는 F · 미니게임판 버튼) 미니 게임 iontiger.github.io/Caf 를 전체 화면 iframe 으로 띄운다.
   - 게임 중에는 마을 renderScene 을 건너뛰고(그리기 쉼), 키 입력은 iframe 이 받는다. 오른쪽 위 '마을로' 로 닫는다.
   - 게임 쪽에서 postMessage {dpCaf:'close'} 를 보내도 닫힌다.
   - 포스터 · 여는 화면 그림: assets/caf-poster.jpg · assets/caf-splash.jpg
   - 시험용 window.dpCaf (open · close · DOOR · spot) */
'use strict';
(function(){
const beep=(f,d=0,l=.1,w='triangle',v=.04)=>{try{if(playLoud())tone(f,d,l,w,v)}catch{}};
const CAF_URL='https://iontiger.github.io/Caf/';

/* ═══ 1. 선착장 옆 선술집 ═══ */
const G=(window.dpYacht&&window.dpYacht.GATE)||{x:20,z:250};
const spot=findSpot(G.x-.688*20-.726*8,G.z+.726*20-.688*8,9);ATTRACT.push(spot);
const cx=spot.x,cz=spot.z,q=Math.round(Math.atan2(-cx,-cz)/(Math.PI/2))*(Math.PI/2),fx=Math.round(Math.sin(q)),fz=Math.round(Math.cos(q));
const BW=8,BD=6,H1=3,H2=2.6,gy=terrainHeight(cx,cz);
const inn=new THREE.Group();inn.position.set(cx,gy,cz);inn.rotation.y=q;inn.userData.world=true;scene.add(inn);
const glowMat=new THREE.MeshBasicMaterial({color:'#ffd36a'}),glow2=new THREE.MeshBasicMaterial({color:'#ffb347'});
const win=(x,y,z,w,h,ry=0)=>{const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=ry;inn.add(g);
  const p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),glowMat);p.position.z=.03;g.add(p);
  box(g,0,0,.05,.07,h,.05,'#3b2a20');box(g,0,0,.05,w,.07,.05,'#3b2a20');box(g,0,-h/2-.06,.08,w+.25,.1,.16,'#5a3f2c');return g};
// 돌 축대 · 나무 1층 · 튀어나온 2층(목조 들보) · 가파른 남보라 지붕
box(inn,0,-.5,0,BW+1.4,1.6,BD+1.4,'#55606e');box(inn,0,.32,0,BW+1,.12,BD+1,'#6b7684');
box(inn,0,.38+H1/2,0,BW,H1,BD,'#8a6a4a');
for(let k=0;k<=8;k++)box(inn,-BW/2+k*BW/8,.38+H1/2,BD/2+.02,.12,H1,.06,'#5b4330');
box(inn,0,.38+H1+H2/2,.15,BW+.5,H2,BD+.4,'#c9b48c');
for(const x of [-BW/2-.25,-BW/4,0,BW/4,BW/2+.25])box(inn,x,.38+H1+H2/2,BD/2+.37,.18,H2,.06,'#4a3526');
box(inn,0,.38+H1+.08,BD/2+.4,BW+.6,.16,.12,'#4a3526');box(inn,0,.38+H1+H2-.06,BD/2+.4,BW+.6,.14,.12,'#4a3526');
{const sh=new THREE.Shape();sh.moveTo(-BW/2-.7,0);sh.lineTo(BW/2+.7,0);sh.lineTo(.6,2.9);sh.lineTo(-.6,2.9);sh.closePath();
  const roof=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:BD+1.3,bevelEnabled:false}),new THREE.MeshStandardMaterial({color:'#3c3a66',roughness:.85,flatShading:true}));
  roof.position.set(0,.38+H1+H2,-(BD+1.3)/2+.15);roof.castShadow=true;inn.add(roof);
  for(let k=0;k<4;k++)box(inn,0,.38+H1+H2+.35+k*.68,.15,BW+1.3-k*1.9,.06,BD+1.35,'#2c2a4e')}
// 창문(따뜻한 불빛) · 문 · 처마 등불
for(const x of [-2.9,-1.4,1.4,2.9])win(x,.38+H1*.55,BD/2+.06,.9,1.1);
for(const x of [-2.8,-.9,.9,2.8])win(x,.38+H1+H2*.52,BD/2+.42,.8,.95);
for(const x of [-BW/2-.02,BW/2+.02])for(const z of [-1.3,1.3])win(x,.38+H1*.55,z,.8,1,x<0?-Math.PI/2:Math.PI/2);
box(inn,0,.38+1.05,BD/2+.07,1.5,2.1,.08,'#4a2f1f');box(inn,0,.38+2.2,BD/2+.1,1.8,.18,.14,'#2b1d14');
{const d=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.5),glow2);d.position.set(0,.38+1.85,BD/2+.12);inn.add(d)}
const lamps=[];for(const x of [-1.3,1.3]){box(inn,x,.38+2.35,BD/2+.38,.08,.08,.6,'#2b2b2b');const l=new THREE.Mesh(new THREE.SphereGeometry(.2,10,8),glowMat);l.position.set(x,.38+2.05,BD/2+.62);inn.add(l);lamps.push(l);
  const pl=new THREE.PointLight('#ffc26a',1.2,9,2);pl.position.copy(l.position);inn.add(pl)}
// 시계탑(오른쪽 뒤) · 시계 · 빨간 삼각 깃발
const TX=BW/2-1.1,TZ=-BD/2+1.1,TH=9.4;
box(inn,TX,.38+TH/2,TZ,2.2,TH,2.2,'#7a6754');for(const y of [3.4,6.2,TH-.1])box(inn,TX,.38+y,TZ,2.4,.16,2.4,'#4a3526');
for(const [x,z,ry] of [[0,1.13,0],[1.13,0,Math.PI/2],[-1.13,0,-Math.PI/2],[0,-1.13,Math.PI]]){win(TX+x,.38+4.6,TZ+z,.5,.8,ry)}
const hands=[];{const face=new THREE.Group();face.position.set(TX,.38+7.6,TZ+1.13);inn.add(face);
  const disc=new THREE.Mesh(new THREE.CircleGeometry(.72,28),new THREE.MeshBasicMaterial({color:'#fff2c4'}));disc.position.z=.02;face.add(disc);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.74,.06,6,28),new THREE.MeshStandardMaterial({color:'#3b2a20'}));rim.position.z=.03;face.add(rim);
  for(let k=0;k<12;k++){const t=box(face,Math.sin(k/12*Math.PI*2)*.6,Math.cos(k/12*Math.PI*2)*.6,.05,.05,.12,.02,'#3b2a20');t.rotation.z=-k/12*Math.PI*2}
  for(const [L,W] of [[.42,.06],[.58,.04]]){const h=new THREE.Group();h.position.z=.06;face.add(h);box(h,0,L/2,0,W,L,.02,'#2b1d14');hands.push(h)}}
{const cap=new THREE.Mesh(new THREE.ConeGeometry(1.75,2.4,4),new THREE.MeshStandardMaterial({color:'#3c3a66',roughness:.8,flatShading:true}));cap.rotation.y=Math.PI/4;cap.position.set(TX,.38+TH+1.2,TZ);cap.castShadow=true;inn.add(cap)}
cyl(inn,TX,.38+TH+3,TZ,.04,.04,1.6,'#2b2b2b',6);
const flag=new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(0,-.5,0),new THREE.Vector3(1.1,-.25,0)]),new THREE.MeshStandardMaterial({color:'#d8423a',side:THREE.DoubleSide}));
flag.geometry.computeVertexNormals();flag.position.set(TX,.38+TH+3.75,TZ);inn.add(flag);
// 간판: 포스터처럼 주황 · 보라 글씨 + 포스터 그림 액자
sign(inn,'The Secret of DentPhoto Village',0,.38+H1+H2+.55,BD/2+.95,6.4,'#ffb04a','#1c1f4a');
{const tex=new THREE.TextureLoader().load('assets/caf-poster.jpg');tex.colorSpace=THREE.SRGBColorSpace;
  const pg=new THREE.Group();pg.position.set(-BW/2-1.9,0,BD/2+1.4);pg.rotation.y=.35;inn.add(pg);
  for(const x of [-1.35,1.35])cyl(pg,x,1.2,0,.08,.1,2.4,'#4a3526',8);box(pg,0,2.15,-.04,2.9,1.7,.1,'#2b1d14');
  const pic=new THREE.Mesh(new THREE.PlaneGeometry(2.7,1.52),new THREE.MeshBasicMaterial({map:tex}));pic.position.set(0,2.15,.02);pg.add(pic)}
// 앞 나무 마루 · 밧줄 기둥 · 술통 · 야자수
box(inn,0,.5,BD/2+1.6,BW+1.4,.14,2.4,'#9b7650');
for(const x of [-BW/2-.5,-BW/4,BW/4,BW/2+.5]){cyl(inn,x,.95,BD/2+2.7,.13,.15,1.1,'#6b4f36',8)}
for(const s of [-1,1])beam(inn,[s*(BW/2+.5),1.35,BD/2+2.7],[s*BW/4,1.25,BD/2+2.7],.035,'#d9c9a0');
for(const [x,z] of [[BW/2+1,BD/2+.9],[BW/2+1.6,BD/2+1.7],[BW/2+.4,BD/2+1.9]]){const b=cyl(inn,x,.92,z,.38,.38,.82,'#7a5232',12);b.castShadow=true;for(const y of [.68,1.16])cyl(inn,x,y,z,.4,.4,.06,'#3a3a3a',12)}
for(const [x,z,s] of [[-BW/2-1.6,-BD/2+.4,1],[BW/2+2.2,-BD/2-.6,.85]]){const t=new THREE.Group();t.position.set(x,0,z);t.scale.setScalar(s);inn.add(t);
  for(let k=0;k<8;k++){const c=cyl(t,Math.sin(k*.18)*.25*k/8,.4+k*.75,0,.16-k*.008,.2-k*.008,.8,'#7a5f43',8);c.rotation.z=-.06}
  for(let k=0;k<7;k++){const a=k/7*Math.PI*2,l=new THREE.Mesh(new THREE.ConeGeometry(.35,2.6,4),new THREE.MeshStandardMaterial({color:'#2f6b47',flatShading:true}));l.position.set(.35+Math.cos(a)*1.1,6.3,Math.sin(a)*1.1);l.rotation.set(Math.sin(a)*1.25,0,-Math.cos(a)*1.25);t.add(l)}}
cyl(inn,BW/2+2.6,1.2,BD/2+2.9,.08,.08,2.4,'#4a3526',8);sign(inn,'🏴‍☠️ 미니 게임 · 들어가기 →',BW/2+2.6,2.15,BD/2+2.96,3.4,'#2b1d14','#ffb04a');
obstacles.push({x:cx,z:cz,w:(fx?BD:BW)+2,d:(fx?BW:BD)+2,world:true});
const DOOR=nearestWalkable(cx+fx*(BD/2+3.2),cz+fz*(BD/2+3.2))||{x:cx+fx*(BD/2+3.2),z:cz+fz*(BD/2+3.2)};
const nearDoor=(r=3.6)=>Math.hypot(player.x-DOOR.x,player.z-DOOR.z)<r;

/* ═══ 2. 게임 화면 — Caf 를 전체 화면 iframe 으로 (여는 동안 포스터 그림) ═══ */
const css=document.createElement('style');css.textContent=`
#cafGame{position:fixed;inset:0;z-index:2147483000;background:#10142e;display:none}
#cafGame.on{display:block}
#cafGame iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#10142e}
#cafGame .cf-cover{position:absolute;inset:0;background:#10142e url(assets/caf-splash.jpg) center/cover no-repeat;pointer-events:none;transition:opacity .7s ease}
#cafGame.ready .cf-cover{opacity:0}
#cafGame .cf-close{position:absolute;top:max(10px,env(safe-area-inset-top));right:max(10px,env(safe-area-inset-right));z-index:2;border:0;border-radius:999px;padding:9px 15px;font:600 14px/1 system-ui,sans-serif;color:#fff3d6;background:rgba(20,22,58,.78);box-shadow:0 2px 10px rgba(0,0,0,.35);cursor:pointer}
#cafGame .cf-close:hover{background:rgba(40,36,96,.92)}
body.caf-on #mobilepad,body.caf-on .toast{display:none!important}`;
document.head.appendChild(css);
const root=document.createElement('div');root.id='cafGame';root.innerHTML='<div class="cf-cover"></div><button class="cf-close" type="button">✕ 마을로</button>';document.body.appendChild(root);
root.querySelector('.cf-close').onclick=()=>close();
const blocker=document.createElement('i');blocker.className='game-modal';blocker.style.cssText='display:none!important';document.body.appendChild(blocker);   // 이야기 퀘스트가 게임 중에 끼어들지 않게
const CG={on:false,fxLock:false,frame:null,t:0};
function open(){if(CG.on)return;try{if(PLAY.mode)endPlay();if(riding)toggleBike(false)}catch{}route=[];target=null;try{drawRoute()}catch{}keys={};
  CG.on=true;CG.fxLock=FX.locked;FX.locked=true;document.body.classList.add('caf-on');blocker.classList.add('on');root.classList.remove('ready');
  const f=document.createElement('iframe');f.src=CAF_URL;f.title='The Secret of DentPhoto Village';f.allow='autoplay; fullscreen; gamepad';
  f.addEventListener('load',()=>{clearTimeout(CG.t);CG.t=setTimeout(()=>root.classList.add('ready'),900);try{f.contentWindow.focus()}catch{}});
  root.insertBefore(f,root.firstChild);CG.frame=f;root.classList.add('on');
  beep(330,0,.14);beep(415,.14,.14);beep(494,.28,.22)}
function close(){if(!CG.on)return;CG.on=false;clearTimeout(CG.t);try{CG.frame.src='about:blank'}catch{}CG.frame&&CG.frame.remove();CG.frame=null;root.classList.remove('on','ready');
  document.body.classList.remove('caf-on');blocker.classList.remove('on');FX.locked=CG.fxLock;armed=false;keys={};try{$('#world').focus()}catch{}rowHud()}
addEventListener('message',e=>{const d=e.data;if(!CG.on||!CG.frame||e.source!==CG.frame.contentWindow||!d||typeof d!=='object')return;if(d.dpCaf==='close')close()});
const _ib=inputBusy;inputBusy=function(){return _ib()||CG.on};
const _rs=renderScene;renderScene=function(){if(CG.on)return;return _rs.apply(this,arguments)};

/* ═══ 3. 마을 쪽 — 문 앞에 오면 열기 · F · 미니게임판 ═══ */
let armed=true;
const _fp=findPlay;findPlay=function(){if(!CG.on&&nearDoor()){PLAY_TXT.caf='🏴‍☠️ 덴포토 마을의 비밀 — 선술집에 들어가기';return {kind:'caf'}}return _fp()};
const _da=doAction;doAction=function(){if(!inputBusy()&&!PLAY.mode&&walkish()&&nearDoor()){open();return}return _da()};
$('#ghTip').insertAdjacentHTML('beforebegin','<div class="gh-row" id="ghCafRow"><span><b>🏴‍☠️ The Secret of DentPhoto Village</b><small id="ghCaf">선착장 옆 선술집 · 미니 게임</small></span><button class="gh-btn" id="ghCafBtn">선술집으로</button></div>');
$('#ghCafBtn').onclick=()=>{if(nearDoor(7))return open();if(PLAY.mode)endPlay();armed=true;beginWalk(true);travelTo(DOOR,null)};
function rowHud(){const b=$('#ghCafBtn');if(b)b.textContent=nearDoor(7)?'입장':'선술집으로'}
let rowT=0,ft=0;
const _ue=updateExtras;updateExtras=function(dt){_ue(dt);try{ft+=dt;
  flag.rotation.y=Math.sin(ft*2.2)*.35;flag.scale.x=1+Math.sin(ft*5.1)*.06;lamps.forEach((l,k)=>l.scale.setScalar(1+Math.sin(ft*7+k*2)*.06));
  const d=new Date(),m=d.getMinutes()+d.getSeconds()/60,h=(d.getHours()%12)+m/60;hands[0].rotation.z=-h/12*Math.PI*2;hands[1].rotation.z=-m/60*Math.PI*2;
  if((rowT-=dt)<=0){rowT=1;rowHud()}
  if(!CG.on){const dd=Math.hypot(player.x-DOOR.x,player.z-DOOR.z);if(dd>8)armed=true;if(armed&&dd<3.2&&cameraMode==='walking'&&!inputBusy()&&!PLAY.mode&&!document.querySelector('.game-modal.on,#heroPick.on,#splash')){armed=false;open()}}}catch(e){console.error(e)}};
rowHud();
window.dpCaf={open,close,DOOR,spot,inn,URL:CAF_URL,get on(){return CG.on},get frame(){return CG.frame}};
})();
