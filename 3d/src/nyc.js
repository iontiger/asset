/* ═══════ 뉴욕 거리 산책 — 3d/nyc/ (DentPhoto Village · New York City Walk) ═══════
   우체국 남쪽 길가에 브루클린 브릿지 탑을 닮은 작은 돌 아치 문(초록 지하철 등 · 작은 황소 · 여신상)을 세운다.
   문 앞에 가면(또는 F · 미니게임판 버튼) 걷는 뉴욕 3d/nyc/ (배터리 파크 · 월스트리트 황소 · 브루클린 브릿지 · 덤보)를 전체 화면 iframe 으로 띄운다.
   - 산책 중에는 마을 renderScene 을 건너뛰고(그리기 쉼), 키 입력은 iframe 이 받는다. 산책 쪽 ✕ 가 postMessage {dpNyc:'close'} 를 보낸다.
   - 시험용 window.dpNyc (open · close · DOOR · spot) */
'use strict';
(function(){
const beep=(f,d=0,l=.1,w='triangle',v=.04)=>{try{if(playLoud())tone(f,d,l,w,v)}catch{}};
const NYC_URL='nyc/index.html';

/* ═══ 1. 아치 문 ═══ */
const spot=findSpot(30,-128,8);ATTRACT.push(spot);
const cx=spot.x,cz=spot.z,q=Math.round(Math.atan2(-cx,-cz)/(Math.PI/2))*(Math.PI/2),fx=Math.round(Math.sin(q)),fz=Math.round(Math.cos(q));
const gy=terrainHeight(cx,cz);
const gate=new THREE.Group();gate.position.set(cx,gy,cz);gate.rotation.y=q;gate.userData.world=true;scene.add(gate);
const stone=new THREE.MeshStandardMaterial({color:'#b9a689',roughness:.9});
box(gate,0,-.4,0,9,1,5,'#8f8a80');box(gate,0,.15,0,8.4,.3,4.4,'#a9a294');
{const sh=new THREE.Shape();sh.moveTo(-3.4,0);sh.lineTo(3.4,0);sh.lineTo(3.2,7);sh.lineTo(-3.2,7);sh.closePath();
 for(const [a,b] of [[-2.8,-.5],[.5,2.8]]){const h=new THREE.Path(),c=(a+b)/2;h.moveTo(a,0);h.lineTo(b,0);h.lineTo(b,3.4);h.quadraticCurveTo(b,4.3,c,4.9);h.quadraticCurveTo(a,4.3,a,3.4);h.closePath();sh.holes.push(h)}
 const geo=new THREE.ExtrudeGeometry(sh,{depth:1.8,bevelEnabled:false});geo.translate(0,0,-.9);const m=new THREE.Mesh(geo,stone);m.position.y=.3;m.castShadow=true;m.receiveShadow=true;gate.add(m)}
box(gate,0,7.45,0,7.2,.4,2.2,'#8f7f66');box(gate,0,7.85,0,6.6,.4,2,'#b9a689');
// 케이블 흉내(아치 위에서 양옆으로 늘어진 줄)
for(const s of [-1,1])for(const z of [-.5,.5])beam(gate,[s*3,7.9,z],[s*7,.4,z+s*.2],.04,'#d6cfbd');
// 초록 지하철 등(밤엔 빛남)
const globes=[];for(const s of [-1,1]){cyl(gate,s*4.6,1.4,2,.08,.11,2.8,'#2f4d3a',8);const g=new THREE.Mesh(new THREE.SphereGeometry(.32,14,10),new THREE.MeshStandardMaterial({color:'#7fdc8f',emissive:'#3fbf5a',emissiveIntensity:.5}));g.position.set(s*4.6,3,2);gate.add(g);globes.push(g)}
sign(gate,'🗽 NEW YORK · 뉴욕 거리 산책',0,6,.95,5.8,'#fffbed','#2f3a44');
sign(gate,'걷고 자전거 타며 브루클린 브릿지 · 덤보 →',0,.95,2.4,4.6,'#2f3a44','#f2c14e');
// 작은 청동 황소 · 작은 여신상
{const b=new THREE.Group();b.position.set(-3.6,.3,3.2);b.rotation.y=.5;b.scale.setScalar(.42);gate.add(b);const br='#6a4728';
 sphere(b,0,2.25,1.1,1.4,br).scale.set(1,1.05,1.2);sphere(b,0,2.5,-1.3,1.3,br).scale.set(.95,1,1.2);sphere(b,0,1.75,3,.8,br).scale.set(.9,.95,1.35);
 for(const s of [-1,1]){beam(b,[s*.7,2,1.6],[s*.7,0,2.2],.3,br);beam(b,[s*.7,2.4,-1.8],[s*.7,0,-2.2],.3,br);beam(b,[s*.5,2.15,3],[s*1.5,2.8,3.9],.15,'#caa45c')}
 beam(b,[0,3.1,-2.5],[.3,4.3,-2.9],.12,br);box(gate,-3.6,.4,3.2,1.6,.2,3,'#77736c')}
{const l=new THREE.Group();l.position.set(3.7,.3,3.1);l.scale.setScalar(.5);gate.add(l);const cp='#79b4a0';
 box(l,0,.9,0,1.6,1.8,1.6,'#b9b2a4');cyl(l,0,2.9,0,.35,.65,2.4,cp,10);sphere(l,0,4.35,0,.32,cp);for(let k=0;k<5;k++){const c=new THREE.Mesh(new THREE.ConeGeometry(.07,.45,5),new THREE.MeshStandardMaterial({color:cp}));const a=-1.1+k*.55;c.position.set(Math.sin(a)*.3,4.62,Math.cos(a)*.3);c.rotation.set(Math.cos(a)*.8,0,-Math.sin(a)*.8);l.add(c)}
 beam(l,[-.35,3.8,0],[-.5,5.2,0],.1,cp);const fl=new THREE.Mesh(new THREE.ConeGeometry(.16,.4,8),new THREE.MeshStandardMaterial({color:'#ffcf5a',emissive:'#ffb020',emissiveIntensity:1}));fl.position.set(-.5,5.45,0);l.add(fl);box(l,.38,3.1,.15,.12,.8,.55,cp)}
obstacles.push({x:cx+fx*0,z:cz,w:(fx?2:7.5),d:(fx?7.5:2),world:true});
const DOOR=nearestWalkable(cx+fx*3.6,cz+fz*3.6)||{x:cx+fx*3.6,z:cz+fz*3.6};
const nearDoor=(r=3.4)=>Math.hypot(player.x-DOOR.x,player.z-DOOR.z)<r;

/* ═══ 2. 산책 화면 — 3d/nyc/ 를 전체 화면 iframe 으로 ═══ */
const css=document.createElement('style');css.textContent=`
#nycWalk{position:fixed;inset:0;z-index:2147483000;background:#9fb9c9;display:none}
#nycWalk.on{display:block}
#nycWalk iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#9fb9c9}
body.nyc-on #mobilepad,body.nyc-on .toast{display:none!important}`;
document.head.appendChild(css);
const root=document.createElement('div');root.id='nycWalk';document.body.appendChild(root);
const blocker=document.createElement('i');blocker.className='game-modal';blocker.style.cssText='display:none!important';document.body.appendChild(blocker);   // 이야기 퀘스트가 산책 중에 끼어들지 않게
const NG={on:false,fxLock:false,frame:null};
function open(){if(NG.on)return;try{if(PLAY.mode)endPlay();if(riding)toggleBike(false)}catch{}route=[];target=null;try{drawRoute()}catch{}keys={};
  NG.on=true;NG.fxLock=FX.locked;FX.locked=true;document.body.classList.add('nyc-on');blocker.classList.add('on');
  const f=document.createElement('iframe');f.src=NYC_URL+'?hero='+(window.dpHero==='wife'?'wife':'me');f.title='뉴욕 거리 산책';f.allow='autoplay; fullscreen';
  f.addEventListener('load',()=>{try{f.contentWindow.focus()}catch{}});root.appendChild(f);NG.frame=f;root.classList.add('on');
  beep(392,0,.14);beep(523,.14,.14);beep(659,.28,.22)}
function close(){if(!NG.on)return;NG.on=false;try{NG.frame.src='about:blank'}catch{}NG.frame&&NG.frame.remove();NG.frame=null;root.classList.remove('on');
  document.body.classList.remove('nyc-on');blocker.classList.remove('on');FX.locked=NG.fxLock;armed=false;keys={};try{$('#world').focus()}catch{}rowHud()}
addEventListener('message',e=>{const d=e.data;if(!NG.on||!NG.frame||e.source!==NG.frame.contentWindow||!d||typeof d!=='object')return;if(d.dpNyc==='close')close()});
const _ib=inputBusy;inputBusy=function(){return _ib()||NG.on};
const _rs=renderScene;renderScene=function(){if(NG.on)return;return _rs.apply(this,arguments)};

/* ═══ 3. 마을 쪽 — 문 앞에 오면 열기 · F · 미니게임판 ═══ */
let armed=true;
const _fp=findPlay;findPlay=function(){if(!NG.on&&nearDoor()){PLAY_TXT.nyc='🗽 뉴욕 거리 산책 — 아치 문으로 들어가기';return {kind:'nyc'}}return _fp()};
const _da=doAction;doAction=function(){if(!inputBusy()&&!PLAY.mode&&walkish()&&nearDoor()){open();return}return _da()};
$('#ghTip').insertAdjacentHTML('beforebegin','<div class="gh-row" id="ghNycRow"><span><b>🗽 뉴욕 거리 산책</b><small id="ghNyc">황소 · 브루클린 브릿지 · 덤보 · 불꽃놀이</small></span><button class="gh-btn" id="ghNycBtn">아치 문으로</button></div>');
$('#ghNycBtn').onclick=()=>{if(nearDoor(7))return open();if(PLAY.mode)endPlay();armed=true;beginWalk(true);travelTo(DOOR,null)};
function rowHud(){const b=$('#ghNycBtn');if(b)b.textContent=nearDoor(7)?'입장':'아치 문으로'}
let rowT=0,ft=0;
const _ue=updateExtras;updateExtras=function(dt){_ue(dt);try{ft+=dt;
  const night=(()=>{try{return Math.max(0,Math.min(1,(sun&&sun.intensity!==undefined)?1-sun.intensity/2.5:0))}catch{return 0}})();
  globes.forEach((g,k)=>{g.material.emissiveIntensity=.5+night*2.2+Math.sin(ft*2+k)*.08});
  if((rowT-=dt)<=0){rowT=1;rowHud()}
  if(!NG.on){const dd=Math.hypot(player.x-DOOR.x,player.z-DOOR.z);if(dd>8)armed=true;if(armed&&dd<3&&cameraMode==='walking'&&!inputBusy()&&!PLAY.mode&&!document.querySelector('.game-modal.on,#heroPick.on,#splash')){armed=false;open()}}}catch(e){console.error(e)}};
rowHud();
window.dpNyc={open,close,DOOR,spot,gate,URL:NYC_URL,get on(){return NG.on},get frame(){return NG.frame}};
})();
