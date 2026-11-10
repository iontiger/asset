'use strict';
// ── 바람을 따라 · 몰입감 묶음 (game.js 가 RIDE_PLUS.build 로 불러 매 프레임 update)
//  1) 하늘 돔: 하늘색(scene.background) → 지평선(안개색) 그라데이션 · 낮은 해와 빛무리 · 코스 뒤쪽으로 갈수록 노을 · 밤길엔 별과 달
//     (뉴욕 시내는 자체 하늘 · 별 · 달이 있어 돔을 끈다)
//  2) 라이더 애니메이션: 바람에 날리는 머플러 두 가닥 · 고개(조향 · 가까운 편지 쪽으로) · 속도/부스트 웅크림 · 공중에서 일어서기 ·
//     착지 때 서스펜션이 눌렸다 튀기 · 성공 때 들썩
//  3) 부스트 불꽃(배기구) · 착지 충격파 고리
//  4) 바람 고리: 길 위 6개짜리 '바람길'(좌우로 굽이치게 놓임) · 점프하면 비행 궤적에 금빛 '하늘 고리' 3개
//  5) 오늘의 미션: 날짜로 고른 3개 (같은 날은 같은 미션) · 완료 +500, 셋 다 +1,000 · 오늘 최고 별 수는 localStorage
(function(root){
const RING_TRAILS_BASE=[1800,7600,10800,16000,42500,48000,52000,57500,63000,71500,75500,79000,87000,91500,95000,99300,103500,105600];
const RING_N=6,RING_GAP=250,RING_R=2.2,RING_Y=2.2,RING_HIT=.24;
const MISSION_KEY='dentphoto-missions-v1';
const POOL=[
 {id:'rings',icon:'🌀',text:n=>`바람 고리 ${n}개 통과`,goal:24},
 {id:'trail',icon:'💨',text:n=>`바람길 ${n}개 완주 (고리 6개 모두)`,goal:2},
 {id:'sky',icon:'✨',text:n=>`점프 중 하늘 고리 ${n}개`,goal:4},
 {id:'letters',icon:'✉',text:n=>`편지 ${n}통 모으기`,goal:90},
 {id:'perfect',icon:'🎯',text:n=>`PERFECT 착지 ${n}번`,goal:2},
 {id:'near',icon:'⚡',text:n=>`아슬아슬 회피 ${n}번`,goal:4},
 {id:'combo',icon:'🔥',text:n=>`콤보 ×${n} 만들기`,goal:4},
 {id:'speed',icon:'🚀',text:n=>`최고 속도 ${n} km/h 찍기`,goal:250},
 {id:'peak',icon:'⛰',text:()=>'목표봉을 부딪히지 않고 넘기',goal:1},
 {id:'snow',icon:'❄',text:()=>'폭설 평원을 풀숲에 안 빠지고 통과',goal:1},
];
function dayKey(){const d=new Date();return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()}
function pickMissions(day){let s=day>>>0;const r=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296};const ids=POOL.map((_,i)=>i);for(let i=ids.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}return ids.slice(0,3).map(i=>POOL[i])}

function build(c){
const {T,scene,camera,ride,drivePoint,driveHeading,lean,riderRig,headG,sun,sound}=c;
const A=ADVENTURE,F=A.fork,MT=A.mountain,SN=A.snow;
const $=id=>document.getElementById(id);
let time=0;

// ── 1) 하늘 돔 ─────────────────────────────────────────────────────────
const skyU={uSky:{value:new T.Color()},uZen:{value:new T.Color()},uHor:{value:new T.Color()},uSunDir:{value:new T.Vector3(0,.3,1).normalize()},uSunCol:{value:new T.Color('#fff1cf')},
 uSun:{value:1},uMoonDir:{value:new T.Vector3(0,.5,-1).normalize()},uNight:{value:0},uHaze:{value:0},uTime:{value:0}};
const skyMat=new T.ShaderMaterial({uniforms:skyU,depthWrite:false,fog:false,toneMapped:false,side:T.BackSide,
 vertexShader:'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w*.99999;}',
 fragmentShader:`uniform vec3 uSky,uZen,uHor,uSunDir,uSunCol,uMoonDir;uniform float uSun,uNight,uHaze,uTime;varying vec3 vDir;
 float h31(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
 void main(){vec3 d=normalize(vDir);float y=d.y;
  vec3 col=mix(uHor,uSky,smoothstep(-.02,.16,y));col=mix(col,uZen,smoothstep(.16,.8,y));
  float sd=max(dot(d,uSunDir),0.);
  float glow=pow(sd,6.)*.32+pow(sd,48.)*.45;float disc=smoothstep(.9994,.9998,sd);
  float hz=exp(-max(y,0.)*7.)*pow(sd,2.)*.5;
  col+=uSunCol*(glow+hz)*uSun*(1.-uHaze*.6)+uSunCol*disc*uSun*1.4*(1.-uHaze*.85);
  if(uNight>.01&&y>-.02){float md=max(dot(d,uMoonDir),0.);col+=vec3(.95,.93,.82)*(smoothstep(.9990,.9994,md)*.9+pow(md,90.)*.12)*uNight;
   vec3 g=d*190.;vec3 id=floor(g);vec3 f=fract(g)-.5;float h=h31(id);float st=step(.988,h)*smoothstep(.22,.0,length(f))*(.6+.4*sin(uTime*(2.+h*5.)+h*40.));
   col+=vec3(.92,.95,1.)*st*uNight*smoothstep(0.,.25,y)*(1.-uHaze);}
  gl_FragColor=vec4(col,1.);
  #include <colorspace_fragment>
 }`});
const dome=new T.Mesh(new T.SphereGeometry(600,32,20),skyMat);dome.frustumCulled=false;dome.renderOrder=-1000;scene.add(dome);
const deep=new T.Color('#4f8fd0'),nightZen=new T.Color('#060b1f'),sunsetCol=new T.Color('#ffb36b'),dayCol=new T.Color('#fff1cf'),tmpC=new T.Color();
const sunAz=Math.atan2(25,-22);   // 실제 그림자 방향(햇빛)과 같은 쪽 하늘에 해를 그린다
function updateSky(cenv){dome.visible=!cenv&&!ride.submerged;if(!dome.visible)return;dome.position.copy(camera.position);
 const s=ride.pos,night=A.nightAmt(s),snow=A.snowAmt(s),dusk=A.sstep(66000,97500,s);
 skyU.uHor.value.copy(scene.fog.color);skyU.uSky.value.copy(scene.background);
 skyU.uZen.value.copy(scene.background).lerp(deep,.32*(1-night)*(1-snow*.8)).lerp(nightZen,night*.7);
 const el=.42-.36*dusk-.3*night;skyU.uSunDir.value.set(Math.cos(sunAz)*Math.cos(el),Math.sin(el),Math.sin(sunAz)*Math.cos(el));
 skyU.uSunCol.value.copy(dayCol).lerp(sunsetCol,dusk);skyU.uSun.value=Math.max(0,1-night*1.6);skyU.uNight.value=night;skyU.uHaze.value=snow;skyU.uTime.value=time;
 skyU.uMoonDir.value.set(-Math.cos(sunAz)*.8,.55,-Math.sin(sunAz)*.8).normalize();
 // 노을 무렵 햇빛도 살짝 주황빛
 if(night<.01)sun.color.lerp(tmpC.set('#ffc489'),dusk*.45*(1-snow));}

// ── 2) 머플러 · 라이더 동작 ──────────────────────────────────────────────
const scarfMat=new T.MeshStandardMaterial({color:'#ec5f4f',roughness:.8,side:T.DoubleSide});
const knot=new T.Mesh(new T.TorusGeometry(.33,.09,8,20),scarfMat);knot.rotation.x=Math.PI/2;knot.scale.set(1,1.05,.9);knot.position.set(0,2.36,.02);knot.castShadow=true;riderRig.add(knot);
const stripeMat=new T.MeshStandardMaterial({color:'#ffe3a6',roughness:.8});const stripe=new T.Mesh(new T.TorusGeometry(.335,.03,6,20),stripeMat);stripe.rotation.x=Math.PI/2;stripe.position.set(0,2.3,.02);riderRig.add(stripe);
function makeTail(n,len,w,x){const pts=[],prev=[];for(let i=0;i<n;i++){pts.push(new T.Vector3(x,2.3-i*len,.5));prev.push(pts[i].clone())}
 const pos=new Float32Array(n*2*3),idx=[];for(let i=0;i<n-1;i++){const a=i*2,b=a+1,cc=a+2,d=a+3;idx.push(a,b,cc,b,d,cc)}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setIndex(idx);
 const m=new T.Mesh(g,scarfMat);m.frustumCulled=false;m.castShadow=true;lean.add(m);return {n,len,w,x,pts,prev,g,pos,m}}
const tails=[makeTail(9,.21,.2,.07),makeTail(7,.2,.17,-.09)];
const anchor=new T.Vector3(),acc=new T.Vector3();
function updateScarf(dt){const v=ride.mode==='playing'?Math.min(1.3,ride.speed/400):0,air=ride.jumping?1:0;riderRig.updateMatrix();
 tails.forEach((t,k)=>{anchor.set(t.x,2.33,.3).applyMatrix4(riderRig.matrix);const h=Math.min(dt,.033);
  for(let i=1;i<t.n;i++){const p=t.pts[i],q=t.prev[i],f=i/t.n,ph=time*(11+k*2.3)-i*.85;
   acc.set(Math.sin(ph)*(1.5+v*7)*f+ride.steer*v*-4,-9.8+v*7+air*6+Math.cos(ph*1.3)*v*4*f,4+v*34);
   const nx=p.x+(p.x-q.x)*.9+acc.x*h*h,ny=p.y+(p.y-q.y)*.9+acc.y*h*h,nz=p.z+(p.z-q.z)*.9+acc.z*h*h;q.copy(p);p.set(nx,ny,nz)}
  t.pts[0].copy(anchor);t.prev[0].copy(anchor);
  for(let it=0;it<3;it++)for(let i=1;i<t.n;i++){const a=t.pts[i-1],b=t.pts[i];const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,dd=Math.hypot(dx,dy,dz)||1e-6,s=t.len/dd;b.set(a.x+dx*s,a.y+dy*s,a.z+dz*s);
   // 가방 · 등을 뚫지 않게
   if(b.y>1.35&&b.y<2.48&&Math.abs(b.x)<.45&&b.z<.78)b.z=.78;if(b.y<.75)b.y=.75}
  for(let i=0;i<t.n;i++){const p=t.pts[i],w=t.w*(1-.35*i/t.n)*.5,tw=Math.sin(time*13-i*.9+k)*.55*Math.min(1,v+.15),ox=Math.sin(tw)*w,oy=Math.cos(tw)*w;
   t.pos.set([p.x-ox,p.y-oy,p.z,p.x+ox,p.y+oy,p.z],i*6)}
  t.g.attributes.position.needsUpdate=true;t.g.computeVertexNormals();t.g.computeBoundingSphere()})}
function resetScarf(){tails.forEach(t=>t.pts.forEach((p,i)=>{p.set(t.x,2.3-i*t.len,.5);t.prev[i].copy(p)}))}
let tuck=0,stand=0,cele=0,squash=0,squashV=0,lookYaw=0,letterCursor=0;
const letters=ride.items.filter(o=>o.type==='letter').sort((a,b)=>a.z-b.z);
function nearestLetterYaw(){while(letterCursor<letters.length&&letters[letterCursor].z<ride.pos+20)letterCursor++;if(letterCursor>0&&letters[letterCursor-1]&&letters[letterCursor-1].z>ride.pos+20)letterCursor=0;
 for(let i=letterCursor;i<Math.min(letters.length,letterCursor+4);i++){const o=letters[i],dz=o.z-ride.pos;if(dz>380)break;if(ride.collected.has(o.id))continue;return Math.max(-.55,Math.min(.55,Math.atan2((o.x-ride.player)*9,dz*.2)))}return 0}
function updateRider(dt){
 if(ride.crashing){headG.rotation.set(0,0,0);return}
 const playing=ride.mode==='playing',v=playing?Math.min(1,ride.speed/400):0;
 const wantTuck=!playing?0:ride.jumping?.04:ride.boost?.34:v*.16;tuck+=(wantTuck-tuck)*(1-Math.exp(-dt*6));
 const wantStand=ride.jumping||ride.airY>.6?1:0;stand+=(wantStand-stand)*(1-Math.exp(-dt*8));
 cele=Math.max(0,cele-dt*1.6);
 // 착지 서스펜션: 눌렸다가 튕겨 돌아오는 스프링
 squashV+=(-squash*170-squashV*13)*dt;squash+=squashV*dt;if(Math.abs(squash)<.0005&&Math.abs(squashV)<.002)squash=squashV=0;
 riderRig.rotation.x-=tuck;riderRig.position.z+=1.5*Math.sin(tuck);riderRig.position.y+=stand*.24+Math.sin(cele*Math.PI)*.38+Math.max(-.3,squash)+Math.sin(time*2.2)*.012;
 lean.position.y+=Math.max(-.22,squash*.8);
 const target=playing?nearestLetterYaw():Math.sin(time*.5)*.35;lookYaw+=(target-lookYaw)*(1-Math.exp(-dt*3));
 headG.rotation.set(tuck*.85-stand*.12+Math.sin(cele*Math.PI*2)*.15,-ride.steer*.32+lookYaw*.7,ride.steer*.1)}

// ── 3) 부스트 불꽃 · 착지 충격파 ─────────────────────────────────────────
const flameG=new T.Group();flameG.position.set(.5,.42,1.2);lean.add(flameG);
const flameOuter=new T.Mesh(new T.ConeGeometry(.2,1.1,14,1,true),new T.MeshBasicMaterial({color:'#ff8a3c',transparent:true,opacity:.8,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));
const flameInner=new T.Mesh(new T.ConeGeometry(.11,.7,12,1,true),new T.MeshBasicMaterial({color:'#bfe6ff',transparent:true,opacity:.95,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));
for(const f of [flameOuter,flameInner]){f.rotation.x=Math.PI/2;flameG.add(f)}flameOuter.position.z=.55;flameInner.position.z=.35;flameG.visible=false;
let flameK=0;
function updateFlame(dt){const want=ride.mode==='playing'&&ride.boost?1:0;flameK+=(want-flameK)*(1-Math.exp(-dt*12));flameG.visible=flameK>.02;if(!flameG.visible)return;
 const fl=.8+Math.sin(time*57)*.15+Math.sin(time*91)*.1;flameG.scale.set(flameK*(.9+fl*.15),flameK*(.9+fl*.15),flameK*fl*1.25);flameOuter.material.opacity=.75*flameK;flameInner.material.opacity=.95*flameK}
const waves=[0,1,2].map(()=>{const m=new T.Mesh(new T.RingGeometry(.85,1,56),new T.MeshBasicMaterial({color:'#fff3d0',transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));m.rotation.x=-Math.PI/2;m.visible=false;scene.add(m);return {m,age:9}});let waveCur=0;
function shock(gold){const w=waves[waveCur++%waves.length];w.age=0;w.gold=gold;w.m.position.copy(drivePoint(ride.pos,ride.player*9));w.m.position.y+=.12;w.m.material.color.set(gold?'#ffd45c':'#fff3d0');w.m.visible=true}
function updateWaves(dt){for(const w of waves){if(w.age>=.7){w.m.visible=false;continue}w.age+=dt;const k=w.age/.7;w.m.scale.setScalar(1+k*(w.gold?11:8));w.m.material.opacity=(1-k)*(w.gold?.9:.6)}}

// ── 4) 바람 고리 ─────────────────────────────────────────────────────────
const ringGeo=new T.TorusGeometry(RING_R,.13,10,48),glowGeo=new T.TorusGeometry(RING_R,.42,8,48);
const ringMat=new T.MeshBasicMaterial({color:'#7fe9ff'}),lastMat=new T.MeshBasicMaterial({color:'#ffe07a'}),missMat=new T.MeshBasicMaterial({color:'#9aa3a8',transparent:true,opacity:.45});
const glowMat=new T.MeshBasicMaterial({color:'#7fe9ff',transparent:true,opacity:.13,blending:T.AdditiveBlending,depthWrite:false}),glowGold=new T.MeshBasicMaterial({color:'#ffd45c',transparent:true,opacity:.18,blending:T.AdditiveBlending,depthWrite:false});
const rockNear=(z,x)=>ride.items.some(o=>o.type==='rock'&&Math.abs(o.z-z)<140&&Math.abs(o.x-x)<.32);
function ringMesh(gold){const g=new T.Group(),m=new T.Mesh(ringGeo,gold?lastMat:ringMat),gl=new T.Mesh(glowGeo,gold?glowGold:glowMat);g.add(m,gl);g.userData.m=m;g.userData.gl=gl;g.visible=false;scene.add(g);return g}
let rings=[],trails=[],skyRings=[];
function buildRings(){for(const r of rings)scene.remove(r.g);rings=[];trails=[];
 const qOn=ride.quakeOn,wOn=ride.waveOn;
 RING_TRAILS_BASE.forEach((s0,ti)=>{
  if(qOn&&s0>5000&&s0<19800)return;if(wOn&&s0>40500&&s0<61000)return;
  const tr={i:trails.length,got:0,miss:0,done:false,rings:[]};trails.push(tr);
  const ph=ti*1.7,amp=.32+(ti%3)*.08;
  for(let i=0;i<RING_N;i++){const s=s0+i*RING_GAP;let x=Math.sin(ph+i*.75)*amp;if(rockNear(s,x))x+=x>0?-.42:.42;x=Math.max(-.72,Math.min(.72,x));
   const r={s,x,trail:tr,i,state:0,age:0,g:ringMesh(i===RING_N-1)};rings.push(r);tr.rings.push(r)}});
 for(const r of rings){r.g.position.copy(drivePoint(r.s,r.x*9));r.g.position.y+=RING_Y;r.g.rotation.y=driveHeading(r.s)}}
// 점프하면 예상 비행 궤적 위에 금빛 하늘 고리 3개 (조금씩 옆으로 비켜 있어 공중에서 살짝 조향)
function spawnSky(){for(const r of skyRings)scene.remove(r.g);skyRings=[];
 let t=0,s=ride.pos,y=ride.flightY,v=ride.airV;const path=[];while(t<4){t+=.04;s+=ride.speed*1.35*.04*A.travelScale(s,ride.branchChoice);v-=16*.04;y+=v*.04;path.push([s,y]);if(y<=ROAD_HEIGHT(s))break}
 if(path.length<12)return;const off=[0,.16,-.12];
 [.3,.52,.74].forEach((f,k)=>{const [ps,py]=path[Math.floor(path.length*f)];const x=Math.max(-.8,Math.min(.8,ride.player+off[k]*(ride.player>0?-1:1)));
  const g=ringMesh(true);g.scale.setScalar(1.15);g.position.copy(drivePoint(ps,x*9));g.position.y=py+1.4;g.rotation.y=driveHeading(ps);
  skyRings.push({s:ps,x,air:py-ROAD_HEIGHT(ps),state:0,age:0,g})})}
const NOTES=[523.25,587.33,659.25,783.99,880,1046.5];
let lastPos=0,ringCount=0,trailDone=0,skyCount=0,skyStreak=0;
function collectFX(r,gold){r.state=1;r.age=0;if(c.sparkle)c.sparkle(r.g.position.clone())}
function updateRings(dt){
 const p=ride.pos,moved=p-lastPos;if(Math.abs(moved)>2500||moved<0){lastPos=p;return}
 const air=ride.airY+(ride.liftY||0);
 for(const r of rings){const ds=r.s-p;r.g.visible=r.state<2&&ds>-60&&ds<3200&&!(ride.branchChoice==='safe'&&r.s>F.start&&r.s<F.end);if(!r.g.visible)continue;
  if(r.state===0){r.g.userData.m.rotation.z=time*1.6+r.i;const pulse=1+Math.sin(time*5+r.i)*.05;r.g.userData.gl.scale.setScalar(pulse);
   if(r.s>lastPos&&r.s<=p&&ride.mode==='playing'){
    if(Math.abs(ride.player-r.x)<RING_HIT&&air<RING_Y+RING_R-.6){const tr=r.trail;tr.got++;ringCount++;const pts=100+50*Math.min(5,tr.got-1);ride.score+=pts;ride.energy=Math.min(100,ride.energy+8);collectFX(r);
     sound.chime&&sound.chime(NOTES[Math.min(NOTES.length-1,tr.got-1)]);c.notify(`🌀 바람 고리 ${tr.got}/${RING_N} +${pts}`);
     if(tr.got===RING_N&&!tr.miss){tr.done=true;trailDone++;ride.score+=600;cele=1;sound.ding&&sound.ding();c.rewardFX('+600','💨 바람길 완주!','고리 6개를 모두 통과 · 부스트 가득','delivery');ride.energy=100}
     else if(r.i===RING_N-1&&tr.miss)c.notify(`바람길 ${tr.got}/${RING_N} · 다음 바람길은 모두 지나 보세요`)}
    else{r.state=3;r.trail.miss++;r.g.userData.m.material=missMat;r.g.userData.gl.visible=false}}}
  else if(r.state===1){r.age+=dt;const k=r.age/.45;r.g.scale.setScalar(1+k*1.4);r.g.userData.m.visible=k<.6;r.g.userData.gl.scale.setScalar(1+k);if(k>=1)r.state=2}
  else if(r.state===3){r.age+=dt;r.g.position.y-=dt*2.5;if(r.age>1.2)r.state=2}}
 for(const r of skyRings){if(r.state===2)continue;r.g.visible=true;
  if(r.state===0){r.g.userData.m.rotation.z=time*2.4;if(r.s>lastPos&&r.s<=p){
   if(Math.abs(ride.player-r.x)<.3&&Math.abs(air-r.air)<3.4){skyCount++;skyStreak++;ride.score+=250;ride.energy=Math.min(100,ride.energy+15);collectFX(r,true);sound.chime&&sound.chime(NOTES[Math.min(5,2+skyStreak)]);
    if(skyStreak===3){ride.score+=500;cele=1;c.rewardFX('+500','✨ 하늘 고리 셋!','점프 한 번에 금빛 고리 3개','delivery all')}else c.notify(`✨ 하늘 고리 +250`)}
   else{r.state=3;r.g.userData.m.material=missMat;r.g.userData.gl.visible=false}}}
  else if(r.state===1){r.age+=dt;const k=r.age/.45;r.g.scale.setScalar(1.15*(1+k*1.4));r.g.userData.m.visible=k<.6;if(k>=1){r.state=2;r.g.visible=false}}
  else{r.age+=dt;r.g.position.y-=dt*3;if(r.age>1){r.state=2;r.g.visible=false}}}
 lastPos=p}

// ── 5) 오늘의 미션 ───────────────────────────────────────────────────────
const day=dayKey(),missions=pickMissions(day);let mState=[],allDone=false,peakHit=false,snowGrass=false,bestToday=0;
try{const s=JSON.parse(localStorage.getItem(MISSION_KEY)||'{}');if(s.day===day)bestToday=s.best||0}catch(e){}
const box=document.createElement('aside');box.id='missions';box.className='missions';box.setAttribute('aria-label','오늘의 미션');
box.innerHTML='<span class="eyebrow">TODAY\'S MISSIONS</span><ol></ol><small class="m-best"></small>';document.body.appendChild(box);
const chip=document.createElement('div');chip.className='mission-chip';chip.setAttribute('aria-hidden','true');document.body.appendChild(chip);
const ol=box.querySelector('ol');
function progressOf(m){switch(m.id){
 case 'rings':return ringCount;case 'trail':return trailDone;case 'sky':return skyCount;case 'letters':return ride.letters;
 case 'perfect':return mState.perfect||0;case 'near':return ride.nearMisses||0;case 'combo':return Math.max(mState.combo||0,ride.combo);
 case 'speed':return Math.max(mState.speed||0,Math.round(ride.speed/2));
 case 'peak':return !peakHit&&ride.pos>MT.end&&mState.peakSeen?1:0;case 'snow':return !snowGrass&&ride.pos>SN.end&&mState.snowSeen?1:0}return 0}
let lastHtml='';
function drawMissions(){const done=mState.done;let html='';missions.forEach((m,i)=>{const p=Math.min(m.goal,progressOf(m)),d=done[i];
  html+=`<li class="${d?'done':''}"><i>${d?'✓':m.icon}</i><span>${m.text(m.goal)}</span><b>${m.goal>1&&!d?(m.id==='speed'?(p?p+'':'0'):p)+'/'+m.goal:d?'완료':''}</b></li>`});
 if(html!==lastHtml){ol.innerHTML=html;lastHtml=html}
 const n=done.filter(Boolean).length;box.querySelector('.m-best').textContent=`${'★'.repeat(n)}${'☆'.repeat(3-n)} · 오늘 최고 ${'★'.repeat(bestToday)}${'☆'.repeat(3-bestToday)}`;
 chip.textContent=`🎯 미션 ${n}/3`;box.classList.toggle('all',n===3)}
function resetMissions(){mState={done:[false,false,false],perfect:0,combo:0,speed:0,peakSeen:false,snowSeen:false};allDone=false;peakHit=false;snowGrass=false;lastHtml='';drawMissions()}
function checkMissions(events){
 for(const e of events){if(e.type==='perfectLand')mState.perfect++;if(e.type==='hit'&&ride.pos>MT.start-200&&ride.pos<MT.end)peakHit=true;if(e.type==='grass'&&A.snowAmt(ride.pos)>.05)snowGrass=true}
 if(ride.pos>MT.start-100&&ride.pos<MT.start+600)mState.peakSeen=true;if(A.snowAmt(ride.pos)>.3)mState.snowSeen=true;
 mState.combo=Math.max(mState.combo,ride.combo);mState.speed=Math.max(mState.speed,Math.round(ride.speed/2));
 missions.forEach((m,i)=>{if(mState.done[i])return;if(progressOf(m)>=m.goal){mState.done[i]=true;ride.score+=500;cele=1;sound.fanfare&&sound.fanfare();
  c.rewardFX('+500','🎯 오늘의 미션 완료!',m.text(m.goal),'delivery all')}});
 if(!allDone&&mState.done.every(Boolean)){allDone=true;ride.score+=1000;setTimeout(()=>{c.rewardFX('+1,000','🏆 오늘의 미션 올클리어!','세 가지 미션을 모두 해냈어요','delivery all')},2400)}}
resetMissions();

// ── 바깥에서 부르는 것들 ──────────────────────────────────────────────────
function start(fresh){if(!fresh)return;buildRings();for(const r of skyRings)scene.remove(r.g);skyRings=[];lastPos=ride.pos;ringCount=trailDone=skyCount=skyStreak=0;resetMissions();resetScarf();tuck=stand=cele=squash=squashV=0;letterCursor=0}
function jumped(){lastPos=ride.pos;for(const r of rings)if(r.s<ride.pos)r.state=2}
function update(dt,t,events,cenv){time=t;
 for(const e of events){if(e.type==='jump'){skyStreak=0;spawnSky()}if(e.type==='jumpLand'||e.type==='land'||e.type==='perfectLand'||e.type==='quakeLaunch'){squashV=-(e.type==='land'?2.2:3)}
  if(e.type==='jumpLand'||e.type==='land')shock(false);if(e.type==='perfectLand'){shock(true);cele=1}if(e.type==='deliveryComplete'||(e.type==='letter'&&ride.letters===80))cele=1}
 updateSky(cenv);updateRider(dt);updateScarf(dt);updateFlame(dt);updateWaves(dt);updateRings(dt);
 if(ride.mode==='playing')checkMissions(events);
 if((frameN++&7)===0)drawMissions();
 const show=ride.mode==='playing';box.classList.toggle('on',show);chip.classList.toggle('on',show)}
let frameN=0;
function finish(){const n=mState.done.filter(Boolean).length;if(!ride.practice&&n>bestToday){bestToday=n;try{localStorage.setItem(MISSION_KEY,JSON.stringify({day,best:n}))}catch(e){}}drawMissions();
 return `<br>🎯 오늘의 미션 ${'★'.repeat(n)}${'☆'.repeat(3-n)} · 바람 고리 ${ringCount}개 · 바람길 ${trailDone}개 · 하늘 고리 ${skyCount}개`}
buildRings();
return {start,update,finish,jumped,dome,get rings(){return rings},get skyRings(){return skyRings},missions,get state(){return mState},get counts(){return {ringCount,trailDone,skyCount}},tails};}
root.RIDE_PLUS={build,pickMissions,POOL};
})(typeof window!=='undefined'?window:globalThis);
