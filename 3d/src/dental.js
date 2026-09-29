/* ═══════ DentPhoto 치과 — 이가 아픈 주민을 충치균 잡기로 치료하고 도장을 모은다 ═══════
   광장 북서쪽에 하얀 치과 건물 (지붕 위 커다란 이빨). 미니게임판에 '오늘의 환자'가 뜨고, 치과 문 앞에서 F → 충치균 잡기.
   25초 안에 입속에 나타나는 🦠 를 10마리 누르면 치료 성공 → 도장 1개. 도장 5개면 간판이 반짝, 10개면 지붕 이빨이 금빛. */
'use strict';
(function(){
const KEY='asset-village-3d-dental';let D={stamps:0,treated:{},patient:null};try{Object.assign(D,JSON.parse(localStorage.getItem(KEY)||'null')||{})}catch{}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(D))}catch{}};
const touch=matchMedia('(hover:none)').matches,beep=(f,d=0,l=.1,w='triangle',v=.04)=>{try{if(playLoud())tone(f,d,l,w,v)}catch{}};

/* ── 건물 ── */
const spot=findSpot(-46,-40,9);ATTRACT.push(spot);
const cx=spot.x,cz=spot.z,q=Math.round(Math.atan2(-cx,-cz)/(Math.PI/2))*(Math.PI/2),fx=Math.round(Math.sin(q)),fz=Math.round(Math.cos(q));
const W=7.4,DP=6,H=4.4,gy=terrainHeight(cx,cz);
const g=new THREE.Group();g.position.set(cx,gy,cz);g.rotation.y=q;g.userData.world=true;scene.add(g);
const M=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.6},o||{}));
const white=M('#fbfaf6'),mint=M('#5cc2b3'),glass=M('#9fd3e0',{roughness:.15,metalness:.2}),toothM=M('#ffffff',{roughness:.3,emissive:'#000000'});
box(g,0,-.7,0,W+.8,1.6,DP+.8,'#d9d2c3');box(g,0,H/2,0,W,H,DP,white);box(g,0,H+.18,0,W+.7,.36,DP+.7,mint);box(g,0,H-.55,DP/2+.02,W,.46,.06,mint);
box(g,0,1.25,DP/2+.04,1.7,2.5,.1,M('#2c6e8f'));box(g,0,1.55,DP/2+.1,1.0,.9,.04,glass);
for(const sx of [-1,1]){box(g,sx*2.45,2.1,DP/2+.04,1.5,1.3,.08,glass);box(g,sx*2.45,1.4,DP/2+.12,1.7,.12,.3,mint)}
for(const sx of [-1,1])box(g,sx*(W/2+.02),2.1,0,.08,1.3,2.2,glass);
const signM=sign(g,'🦷 DentPhoto 치과',0,H-.55,DP/2+.1,5.8,'#ffffff','#2a9d8f');
// 지붕 위 커다란 이빨
const tooth=new THREE.Group();tooth.position.set(0,H+.4,0);g.add(tooth);
{const crown=mesh(new THREE.SphereGeometry(1,20,14),toothM,tooth);crown.scale.set(1.05,.82,.9);crown.position.y=1.75;
  for(const sx of [-1,1]){const r=mesh(new THREE.CylinderGeometry(.34,.12,1.3,12),toothM,tooth);r.position.set(sx*.42,.8,0);r.rotation.z=sx*.12}
  cyl(tooth,0,.08,0,.5,.6,.16,'#5cc2b3',14)}
// 반짝이 (도장 5개부터)
const sparks=[];for(let i=0;i<10;i++){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:'#fff4b0',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));sp.scale.setScalar(.38);sp.visible=false;g.add(sp);sparks.push(sp)}
{const o={x:cx,z:cz,w:(fx?DP:W)+.9,d:(fx?W:DP)+.9,world:true};obstacles.push(o)}
const DOOR=nearestWalkable(cx+fx*(DP/2+2.4),cz+fz*(DP/2+2.4))||{x:cx+fx*(DP/2+2.4),z:cz+fz*(DP/2+2.4)};
const nearDoor=()=>Math.hypot(player.x-DOOR.x,player.z-DOOR.z)<3.6;
function dress(){const s=D.stamps;sparks.forEach(sp=>sp.visible=s>=5);toothM.color.set(s>=10?'#ffd76a':'#ffffff');toothM.emissive.set(s>=10?'#6b4a00':'#000000');toothM.metalness=s>=10?.5:0}
dress();

/* ── 환자 ── */
const NPCS=()=>npcGroups.filter(n=>n.name&&n.root);
function pickPatient(){const L=NPCS().filter(n=>n.name!==D.patient);if(!L.length)return;D.patient=L[Math.floor(Math.random()*L.length)].name;save();hud()}
if(!D.patient||!NPCS().some(n=>n.name===D.patient))pickPatient();
const patient=()=>NPCS().find(n=>n.name===D.patient)||null;
let ouchT=3;

/* ── 충치균 잡기 ── */
const box2=document.createElement('div');box2.id='dentGame';box2.innerHTML=`<div class="dg-card" role="dialog" aria-modal="true" aria-label="충치균 잡기"><div class="dg-head"><b id="dgTitle">🦷 충치균을 잡아요!</b><span id="dgTime">25</span></div><div class="dg-sub" id="dgSub"></div><div class="dg-mouth"><div class="dg-row" id="dgTop"></div><div class="dg-tongue"></div><div class="dg-row" id="dgBot"></div></div><div class="dg-prog"><i id="dgProg"></i></div><div class="dg-foot"><span id="dgScore">🦠 0 / 10</span><button type="button" id="dgQuit">그만두기</button></div></div>`;document.body.appendChild(box2);
const teeth=[];['#dgTop','#dgBot'].forEach(k=>{for(let i=0;i<6;i++){const t=document.createElement('button');t.type='button';t.className='dg-tooth';t.setAttribute('aria-label','이빨');box2.querySelector(k).appendChild(t);teeth.push({el:t,germ:0,life:0,stain:0})}});
const G={on:false,t:0,score:0,need:10,dur:25,next:0,name:''};
function germTap(T){if(!G.on||!T.germ)return;T.germ=0;T.el.classList.remove('germ');T.el.classList.add('shine');setTimeout(()=>T.el.classList.remove('shine'),260);G.score++;beep(1320+G.score*30,0,.07,'square',.03);$('#dgScore').textContent=`🦠 ${G.score} / ${G.need}`;$('#dgProg').style.width=Math.min(100,G.score/G.need*100)+'%';if(G.score>=G.need)finish(true)}
teeth.forEach(T=>T.el.addEventListener('pointerdown',e=>{e.preventDefault();germTap(T)}));
$('#dgQuit').onclick=()=>finish(false,true);
function startDent(){if(G.on)return;if(!patient())pickPatient();const p=patient();if(!p)return toast('🦷 오늘은 환자가 없어요');
  try{if(PLAY.mode)endPlay();if(riding)toggleBike(false)}catch{}route=[];target=null;drawRoute();keys={};
  Object.assign(G,{on:true,t:G.dur,score:0,next:.4,name:p.name});teeth.forEach(T=>{T.germ=0;T.stain=0;T.el.className='dg-tooth'});
  const e=(ANIMALS[p.animal]||{}).e||'🙂';$('#dgTitle').textContent=`🦷 ${e} ${p.name}의 충치균을 잡아요!`;$('#dgSub').textContent=touch?'입속에 나타나는 🦠 를 톡톡 눌러요 — 25초 안에 10마리!':'입속에 나타나는 🦠 를 마우스로 눌러요 — 25초 안에 10마리!';
  $('#dgScore').textContent=`🦠 0 / ${G.need}`;$('#dgProg').style.width='0%';box2.classList.add('on');document.body.classList.add('dent-on');[523,659,784].forEach((n,i)=>beep(n,i*.08,.1))}
function finish(ok,quit){if(!G.on)return;G.on=false;box2.classList.remove('on');document.body.classList.remove('dent-on');const p=patient();
  if(quit){toast('🦷 진료를 멈췄어요');return}
  if(!ok){toast(`😢 아쉬워요! 충치균 ${G.score}마리 — 치과 문 앞에서 F 로 다시 해 봐요`);beep(330,0,.2,'sine');return}
  D.stamps++;D.treated[G.name]=(D.treated[G.name]||0)+1;save();dress();celebrate();[784,988,1319].forEach((n,i)=>beep(n,i*.1,.14));
  if(p){setTimeout(()=>emote(p,'heart'),200);setTimeout(()=>emote(p,'고마워요!'),1200)}
  toast(`🦷 ${G.name} 치료 완료! 도장 ${D.stamps}개${D.stamps===5?' · ✨ 치과 간판이 반짝여요!':D.stamps===10?' · 🏆 지붕 이빨이 금빛이 됐어요!':''}`,'gem');
  if(D.stamps===5||D.stamps===10||D.stamps%10===0)try{gameFireworks(cx,gy+H+2,cz,D.stamps>=10?8:4,8,14,1)}catch{}
  pickPatient();ouchT=6}
function dentTick(dt){if(!G.on)return;G.t-=dt;$('#dgTime').textContent=Math.max(0,Math.ceil(G.t));$('#dgTime').classList.toggle('low',G.t<8);
  G.next-=dt;if(G.next<=0){G.next=.45+Math.random()*.5;const free=teeth.filter(T=>!T.germ);if(free.length){const T=free[Math.floor(Math.random()*free.length)];T.germ=1;T.life=1.5+Math.random()*.7;T.el.classList.add('germ')}}
  teeth.forEach(T=>{if(!T.germ)return;T.life-=dt;if(T.life<=0){T.germ=0;T.el.classList.remove('germ');T.stain=Math.min(3,T.stain+1);T.el.dataset.stain=T.stain}});
  if(G.t<=0)finish(G.score>=G.need)}
addEventListener('keydown',e=>{if(!G.on)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish(false,true);return}if(e.key!=='Tab'){e.stopImmediatePropagation()}},true);
const _ib=inputBusy;inputBusy=function(){return _ib()||G.on};

/* ── F · 미니게임판 · 도움말 ── */
const _fp=findPlay;findPlay=function(){if(!G.on&&nearDoor()){PLAY_TXT.dental=`🦷 ${D.patient||'환자'} 치료하기`;return {kind:'dental'}}return _fp()};
const _da=doAction;doAction=function(){if(!inputBusy()&&!PLAY.mode&&walkish()&&nearDoor()){startDent();return}return _da()};
$('#ghTip').insertAdjacentHTML('beforebegin','<div class="gh-row" id="ghDentRow"><span><b>🦷 DentPhoto 치과</b><small id="ghDent"></small></span><button class="gh-btn soft" id="ghDentBtn">치과로</button></div>');
$('#ghDentBtn').onclick=()=>{if(nearDoor())return startDent();if(PLAY.mode)endPlay();beginWalk(true);travelTo(DOOR,null)};
function hud(){const el=$('#ghDent');if(!el)return;el.textContent=`환자: ${D.patient||'-'}`+` · 도장 ${D.stamps}개`;$('#ghDentBtn').textContent=nearDoor()?'진료':'치과로'}
window.dpDental={start:startDent,finish,G,D,DOOR,spot,pick:pickPatient};
let hudT=0;
const _ue=updateExtras;updateExtras=function(dt){_ue(dt);try{
  if((hudT-=dt)<=0){hudT=1;hud()}
  tooth.rotation.y+=dt*.5;if(D.stamps>=5)sparks.forEach((sp,i)=>{const a=time*1.3+i/sparks.length*Math.PI*2;sp.position.set(Math.cos(a)*3.4,H-.5+Math.sin(time*2+i)*.8,DP/2+.4+Math.sin(a)*.3);sp.material.opacity=.5+.5*Math.sin(time*6+i*1.7)});
  if(!G.on&&D.patient&&(ouchT-=dt)<=0){ouchT=7+Math.random()*4;const p=patient();if(p&&p.root.visible&&p.root.position.distanceTo(camera.position)<60)emote(p,'이가 아파요')}
  dentTick(dt)}catch(e){console.error(e)}};
hud();
})();
