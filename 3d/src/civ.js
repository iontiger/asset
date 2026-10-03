/* ═══════ 덴포토 문명 — 문명 전당 (DentPhoto Civilization) ═══════
   마을 서쪽 예금길 옆 '덴포토 문명 전당' 문 앞에 가면 턴제 문명 게임이 열린다. 게임은 따로 된 페이지 civil/
   (육각 지도 · 도시 · 유닛 · 기술 · 컴퓨터 문명 · 목표자산 20억 승리)를 전체 화면 iframe 으로 띄운다.
   - 게임 중에는 마을 renderScene 을 건너뛰고(그리기 쉼), 키 입력은 iframe 이 받는다.
   - 게임 쪽에서 postMessage {dpCiv:'close'|'finish'} 로 알려 온다. 저장 'dentphoto-civ-v1' · 기록 'dentphoto-civ-record-v1' (같은 출처 localStorage).
   - 시험용 window.dpCiv (open · close · frame · DOOR) */
'use strict';
(function(){
const beep=(f,d=0,l=.1,w='triangle',v=.04)=>{try{if(playLoud())tone(f,d,l,w,v)}catch{}};

/* ═══ 1. 마을의 문명 전당 (게임 입구) ═══ */
const spot=findSpot(-84,52,10);ATTRACT.push(spot);
const cx=spot.x,cz=spot.z,q=Math.round(Math.atan2(-cx,-cz)/(Math.PI/2))*(Math.PI/2),fx=Math.round(Math.sin(q)),fz=Math.round(Math.cos(q));
const BW=8.4,BD=6.2,BH=4.2,gy=terrainHeight(cx,cz);
const hall=new THREE.Group();hall.position.set(cx,gy,cz);hall.rotation.y=q;hall.userData.world=true;scene.add(hall);
box(hall,0,-.7,0,BW+1.6,1.6,BD+1.8,'#d9d2c3');box(hall,0,.18,0,BW+1.2,.36,BD+1.4,'#e8e0cc');box(hall,0,.42,BD/2+1,BW-1,.2,1,'#efe7d4');
box(hall,0,BH/2+.3,-.4,BW-.6,BH,BD-1.4,'#f4ead4');
// 앞 기둥 여섯 · 박공 · 둥근 지붕
for(let k=0;k<6;k++){const x=-BW/2+.75+k*(BW-1.5)/5;cyl(hall,x,BH/2+.3,BD/2-.25,.24,.28,BH,'#fbf5e6',14);box(hall,x,.55,BD/2-.25,.7,.18,.7,'#e2d8c0');box(hall,x,BH+.36,BD/2-.25,.66,.16,.66,'#e2d8c0')}
box(hall,0,BH+.55,0,BW+.2,.3,BD+.1,'#e6dcc4');
{const sh=new THREE.Shape();sh.moveTo(-BW/2-.1,0);sh.lineTo(BW/2+.1,0);sh.lineTo(0,1.5);sh.closePath();const ped=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:.4,bevelEnabled:false}),new THREE.MeshStandardMaterial({color:'#efe4c8',roughness:.8}));ped.position.set(0,BH+.7,BD/2-.55);ped.castShadow=true;hall.add(ped)}
cyl(hall,0,BH+1.2,-.8,1.5,1.7,.6,'#d9cfb6',24);{const dome=new THREE.Mesh(new THREE.SphereGeometry(1.55,24,12,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:'#5e9a8a',roughness:.5,metalness:.15}));dome.position.set(0,BH+1.5,-.8);dome.castShadow=true;hall.add(dome)}
sphere(hall,0,BH+3.15,-.8,.22,'#f6d77a',1);
box(hall,0,1.45,BD/2-.72,1.7,2.3,.1,'#6b4a2e');box(hall,0,2.75,BD/2-.7,1.9,.25,.12,'#d8a83a');
sign(hall,'🏛 덴포토 문명 전당',0,BH+.25,BD/2+.02,5.4,'#fffbed','#46634c');
// 다섯 문명 깃발
const CIVC=['#e2563a','#e0a13a','#2f8fd0','#8a5cd0','#2fa36a'];const flags=[];
CIVC.forEach((c,k)=>{const x=-BW/2-.2+k*(BW+.4)/4;cyl(hall,x,1.6,BD/2+1.9,.05,.06,3.2,'#7a5a3a',8);const f=box(hall,x+.45,2.85,BD/2+1.9,.9,.55,.04,c);flags.push(f)});
// 앞마당의 육각 지도판 (게임 지도처럼)
{const cols=['#8fbf5e','#c2c070','#5f9a4e','#d6a56c','#5fb0c4','#a3a861','#8fbf5e'],R=.62;const at=[[0,0],[1,0],[-1,0],[.5,.87],[-.5,.87],[.5,-.87],[-.5,-.87]];
  at.forEach(([a,b],k)=>{const m=cyl(hall,-BW/2+1.2+a*R*1.8,.42,BD/2+3.6+b*R*1.8,R,R,.24+k%3*.06,cols[k],6);m.rotation.y=Math.PI/6})
  const tw=cyl(hall,-BW/2+1.2,.9,BD/2+3.6,.08,.1,.7,'#f6d77a',8);void tw}
cyl(hall,4.5,1.1,BD/2+3.2,.08,.08,2.2,'#7a5a3a',8);sign(hall,'🏛 덴포토 문명 · 턴제 전략 →',4.5,1.95,BD/2+3.26,3.6,'#3b2a1a','#f2c230');
obstacles.push({x:cx,z:cz,w:(fx?BD:BW)+1.6,d:(fx?BW:BD)+1.6,world:true});
const DOOR=nearestWalkable(cx+fx*(BD/2+2.4),cz+fz*(BD/2+2.4))||{x:cx+fx*(BD/2+2.4),z:cz+fz*(BD/2+2.4)};
const nearDoor=(r=3.6)=>Math.hypot(player.x-DOOR.x,player.z-DOOR.z)<r;

/* ═══ 2. 게임 화면 — civil/ 을 전체 화면 iframe 으로 ═══ */
const CIV_URL='../civil/index.html',REC='dentphoto-civ-record-v1',SAVE='dentphoto-civ-v1';
const css=document.createElement('style');css.textContent=`
#civGame{position:fixed;inset:0;z-index:2147483000;background:#1f2a24;display:none}
#civGame.on{display:block}
#civGame iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#b9dbe6}
#civGame .cg-wipe{position:absolute;inset:0;background:#1f2a24;pointer-events:none;opacity:0}
#civGame.wipe .cg-wipe{animation:cgWipe .8s ease-out}
@keyframes cgWipe{0%{opacity:1}100%{opacity:0}}
body.civ-on #mobilepad,body.civ-on .toast{display:none!important}`;
document.head.appendChild(css);
const root=document.createElement('div');root.id='civGame';root.innerHTML='<div class="cg-wipe"></div>';document.body.appendChild(root);
const blocker=document.createElement('i');blocker.className='game-modal';blocker.style.cssText='display:none!important';document.body.appendChild(blocker);   // 이야기 퀘스트가 게임 중에 끼어들지 않게
const CG={on:false,won:null,fxLock:false,frame:null};
const rec=()=>{try{return JSON.parse(localStorage.getItem(REC)||'{}')||{}}catch{return {}}};
const saved=()=>{try{const s=JSON.parse(localStorage.getItem(SAVE)||'null');return s&&!s.over?{turn:s.turn,name:s.civs[s.player].name}:null}catch{return null}};
function open(){if(CG.on)return;try{if(PLAY.mode)endPlay();if(riding)toggleBike(false)}catch{}route=[];target=null;try{drawRoute()}catch{}keys={};
  CG.on=true;CG.won=null;CG.fxLock=FX.locked;FX.locked=true;document.body.classList.add('civ-on');blocker.classList.add('on');
  const f=document.createElement('iframe');f.src=CIV_URL;f.title='덴포토 문명';f.addEventListener('load',()=>{try{f.contentWindow.focus()}catch{}});
  root.insertBefore(f,root.firstChild);CG.frame=f;root.classList.add('on');root.classList.remove('wipe');void root.offsetWidth;root.classList.add('wipe');
  beep(392,0,.12);beep(523,.12,.12);beep(659,.24,.18)}
function close(){if(!CG.on)return;CG.on=false;try{CG.frame.src='about:blank'}catch{}CG.frame&&CG.frame.remove();CG.frame=null;root.classList.remove('on','wipe');
  document.body.classList.remove('civ-on');blocker.classList.remove('on');FX.locked=CG.fxLock;armed=false;keys={};
  try{$('#world').focus()}catch{}rowHud();if(CG.won){const k=CG.won;CG.won=null;try{celebrate()}catch{}toast(`🏛 덴포토 문명 ${k} 승리! 마을에 축하 소식이 퍼졌어요`,'gem')}}
addEventListener('message',e=>{const d=e.data;if(!CG.on||!CG.frame||e.source!==CG.frame.contentWindow||!d||typeof d!=='object')return;
  if(d.dpCiv==='close')close();
  else if(d.dpCiv==='finish'&&d.win)CG.won=String(d.kind||'')});
const _ib=inputBusy;inputBusy=function(){return _ib()||CG.on};
// 게임 화면이 덮고 있는 동안 마을은 그리지 않는다
const _rs=renderScene;renderScene=function(){if(CG.on)return;return _rs.apply(this,arguments)};

/* ═══ 3. 마을 쪽 — 문 앞에 오면 열기 · F · 미니게임판 ═══ */
let armed=true;
const _fp=findPlay;findPlay=function(){if(!CG.on&&nearDoor()){PLAY_TXT.civ='🏛 덴포토 문명 — 전당에 들어가기';return {kind:'civ'}}return _fp()};
const _da=doAction;doAction=function(){if(!inputBusy()&&!PLAY.mode&&walkish()&&nearDoor()){open();return}return _da()};
$('#ghTip').insertAdjacentHTML('beforebegin','<div class="gh-row" id="ghCivRow"><span><b>🏛 덴포토 문명 · 턴제 전략</b><small id="ghCiv"></small></span><button class="gh-btn" id="ghCivBtn">문명 전당으로</button></div>');
$('#ghCivBtn').onclick=()=>{if(nearDoor(7))return open();if(PLAY.mode)endPlay();armed=true;beginWalk(true);travelTo(DOOR,null)};
function rowHud(){const e=$('#ghCiv');if(!e)return;const r=rec(),s=saved();
  e.textContent=s?`${s.name} · ${s.turn}턴 이어하기${r.wins?` · 승리 ${r.wins}번`:''}`:r.wins?`승리 ${r.wins}번 · 최고 ${Number(r.best||0).toLocaleString()}점`:'도시 · 기술 · 전쟁 · 목표자산 20억';
  $('#ghCivBtn').textContent=nearDoor(7)?'입장':'문명 전당으로'}
let rowT=0,ft=0;
const _ue=updateExtras;updateExtras=function(dt){_ue(dt);try{ft+=dt;flags.forEach((f,k)=>{f.rotation.y=Math.sin(ft*2.4+k)*.35});
  if((rowT-=dt)<=0){rowT=1;rowHud()}
  if(!CG.on){const d=Math.hypot(player.x-DOOR.x,player.z-DOOR.z);if(d>8)armed=true;if(armed&&d<3.2&&cameraMode==='walking'&&!inputBusy()&&!PLAY.mode&&!document.querySelector('.game-modal.on,#heroPick.on,#splash')){armed=false;open()}}}catch(e){console.error(e)}};
rowHud();
window.dpCiv={open,close,DOOR,spot,get on(){return CG.on},get frame(){return CG.frame}};
})();
