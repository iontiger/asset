/* ═══════ 요트 섬 일주 — 낚시 도감과 숨은 다이아를 모두 채우면 남쪽 해변 DentPhoto 선착장에서 ═══════
   선착장 끝에 요트가 매여 있다 (잠겨 있어도 보인다). 열리면 F 로 타고, 섬 바깥 뱃길을 한 바퀴 돌아 같은 자리로 돌아온다.
   타는 동안 cameraMode='yacht' — 걷기 입력 · 주민 · 구역 입장이 멈추고, 섬 위로 불꽃이 계속 터지며 배 뒤에서 불꽃 분수가 튄다.
   Esc · 내리기 로 언제든 내린다. 매 프레임 일은 updateExtras 뒤에 붙인다 (카메라 · 렌더보다 먼저라 흔들리지 않는다). */
'use strict';
(function(){
const KEY='asset-village-3d-yacht';let S={open:false,rides:0};try{Object.assign(S,JSON.parse(localStorage.getItem(KEY)||'null')||{})}catch{}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch{}};
const touch=matchMedia('(hover:none)').matches,SEA=COAST.sea,TAU=Math.PI*2,rnd=Math.random;
/* ── 자리: 남쪽 해변. OUT 은 바다 쪽, SIDE 는 해안을 따라 ── */
const OUT={x:.726,z:.688},SIDE={x:.688,z:-.726},H0=Math.atan2(OUT.x,OUT.z),HM=Math.atan2(-SIDE.x,-SIDE.z);
const B0={x:0,z:257.4};let kL=0;for(let k=-10;k<=8;k+=.25)if(walkable(B0.x+OUT.x*k,B0.z+OUT.z*k))kL=k;
const GATE={x:B0.x+OUT.x*(kL-.8),z:B0.z+OUT.z*(kL-.8)};
const at=(k,s=0)=>({x:GATE.x+OUT.x*k+SIDE.x*s,z:GATE.z+OUT.z*k+SIDE.z*s});
const near=()=>Math.hypot(player.x-GATE.x,player.z-GATE.z)<5;

/* ── 선착장 ── */
const DY=SEA+1.15,PL=22,TH=3.2,TW=9,KM=PL+TH+.5+2.1,gy=terrainHeight(GATE.x,GATE.z);
const dk=new THREE.Group();dk.position.set(GATE.x,0,GATE.z);dk.rotation.y=H0;dk.userData.world=true;scene.add(dk);
{const W='#b48656',P='#6b4f36',Wt='#f1ece0';
  box(dk,0,DY-.11,PL/2,2.6,.22,PL,W);box(dk,0,DY-.11,PL+TH/2,TW,.22,TH,W);
  for(let k=2;k<=PL;k+=4)for(const x of [-1.15,1.15])cyl(dk,x,DY-2.7,k,.13,.16,5.2,P,8);
  for(const x of [-TW/2+.3,TW/2-.3])for(const z of [PL+.3,PL+TH-.3])cyl(dk,x,DY-2.7,z,.13,.16,5.2,P,8);
  for(const x of [-1.25,1.25]){beam(dk,[x,DY+.85,.6],[x,DY+.85,PL],.045,Wt);for(let k=.6;k<=PL;k+=3.6)cyl(dk,x,DY+.42,k,.05,.05,.85,Wt,6)}
  for(const x of [-TW/2+.35,TW/2-.35]){cyl(dk,x,DY+1.3,PL+TH-.35,.07,.09,2.6,'#3d4a4f',8);const b=mesh(new THREE.SphereGeometry(.26,12,8),roadLampMat,dk);b.position.set(x,DY+2.72,PL+TH-.35)}
  for(const x of [-2.6,2.6])cyl(dk,x,DY+.2,PL+TH-.35,.15,.18,.4,'#34424a',10);
  const ring=mesh(new THREE.TorusGeometry(.36,.09,8,18),'#e4533d',dk);ring.position.set(1.34,DY+.55,9);ring.rotation.y=Math.PI/2;
  for(const x of [-1.9,1.9])cyl(dk,x,gy+1.55,-.5,.12,.15,3.3,P,8);
  const sg=sign(dk,'DentPhoto 선착장',0,gy+3.05,-.5,4.2,'#fff6d8','#2c6e8f');sg.rotation.y=Math.PI}

/* ── 요트 (배 앞 = +z, y=0 이 물높이) ── */
let sailMat=null,flagG=null;
const g=new THREE.Group();g.userData.world=true;g.rotation.order='YXZ';scene.add(g);
const hull=new THREE.Group();hull.scale.setScalar(1.4);g.add(hull);
const M=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.45,metalness:.05},o||{}));
function outline(k){const s=new THREE.Shape();s.moveTo(-1.5*k,3.5*k);s.lineTo(1.5*k,3.5*k);s.lineTo(1.5*k,0);s.quadraticCurveTo(1.45*k,-2.6*k,0,-4.3*k);s.quadraticCurveTo(-1.45*k,-2.6*k,-1.5*k,0);s.closePath();return s}
function slab(k,y,h,m){const geo=new THREE.ExtrudeGeometry(outline(k),{depth:h,bevelEnabled:false,curveSegments:14});geo.rotateX(-Math.PI/2);const o=mesh(geo,m,hull);o.position.y=y;return o}
{const white=M('#f8f6f0'),navy=M('#2c6e8f'),glass=M('#27404d',{roughness:.15,metalness:.3});
  slab(1,-.3,1.2,white);slab(1.012,.44,.16,navy);slab(1.012,-.34,.2,M('#b8473b'));slab(.9,.86,.08,M('#c9a372',{roughness:.75}));
  box(hull,0,1.3,.5,2,.8,2.6,white);box(hull,0,1.4,.5,2.05,.26,2.2,glass);box(hull,0,1.74,.5,2.2,.08,2.8,M('#e9e4d8'));
  box(hull,0,1.1,-2.45,2.5,.42,.75,navy);box(hull,0,1.4,-2.86,2.5,.62,.12,navy);
  cyl(hull,0,4.75,1.3,.06,.09,7.6,M('#dcd7cc'),8);beam(hull,[0,2.25,1.3],[0,2.25,-2.9],.06,'#8d7854');
  const sail=sailMat=new THREE.MeshStandardMaterial({color:'#fbf6e8',side:THREE.DoubleSide,roughness:.85});
  const ms=new THREE.Shape();ms.moveTo(0,0);ms.lineTo(4.1,0);ms.quadraticCurveTo(1.7,2.6,0,6.1);ms.closePath();
  const main=mesh(new THREE.ShapeGeometry(ms,8),sail,hull);main.position.set(0,2.35,1.3);main.rotation.y=Math.PI/2;
  const js=new THREE.Shape();js.moveTo(0,0);js.lineTo(0,5.3);js.lineTo(-2.9,0);js.closePath();
  const jib=mesh(new THREE.ShapeGeometry(js),sail,hull);jib.position.set(0,1.1,1.35);jib.rotation.y=Math.PI/2;
  box(hull,0,8.75,1.05,.02,.3,.6,M('#e97567'));
  for(const sx of [-1,1]){beam(hull,[sx*1.38,1.3,-3.3],[sx*1.38,1.3,1.6],.03,'#d9dee2');beam(hull,[sx*1.38,1.3,1.6],[0,1.3,3.95],.03,'#d9dee2');for(const z of [-3.3,-1.6,0,1.6])cyl(hull,sx*1.38,1.12,z,.025,.025,.36,'#d9dee2',6)}
  const nm=sign(hull,'DentPhoto',0,.16,-3.54,2.3,'#fff6d8','#2c6e8f');nm.rotation.y=Math.PI;
  // 보물 깃발 (돛대 꼭대기) — 상자에서 얻으면 보인다
  const ft=canvasTex(256,(x,n)=>{x.fillStyle='#2c6e8f';x.fillRect(0,0,n,n);x.fillStyle='#ffd76a';x.fillRect(0,n*.82,n,n*.18);x.fillStyle='#fff';x.font='800 120px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('🦷',n/2,n*.4);x.font='800 38px sans-serif';x.fillStyle='#fff6d8';x.fillText('DentPhoto',n/2,n*.72)});
  flagG=new THREE.Group();flagG.position.set(0,7.6,1.3);hull.add(flagG);const fl=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.1,8,1),new THREE.MeshStandardMaterial({map:ft,side:THREE.DoubleSide,roughness:.8}));fl.position.set(0,0,-.8);fl.rotation.y=Math.PI/2;flagG.add(fl);flagG.userData.cloth=fl}
// 뒤에 끌리는 물보라
const wakeTex=canvasTex(128,(x,n)=>{x.clearRect(0,0,n,n);for(let yy=0;yy<n;yy++){const d=1-yy/n,a=Math.pow(1-d,1.4),hw=(.07+.38*d)*n,c=n/2;x.fillStyle=`rgba(255,255,255,${a*.9})`;x.fillRect(c-hw-2,yy,4,1);x.fillRect(c+hw-2,yy,4,1);x.fillStyle=`rgba(255,255,255,${a*a*.45})`;x.fillRect(c-hw*.45,yy,hw*.9,1)}});
wakeTex.wrapS=wakeTex.wrapT=THREE.ClampToEdgeWrapping;
const wake=new THREE.Mesh(new THREE.PlaneGeometry(10,32),new THREE.MeshBasicMaterial({map:wakeTex,transparent:true,depthWrite:false,opacity:0}));
wake.rotation.x=-Math.PI/2;wake.position.set(0,.14,-4.9-16);wake.userData.noAO=true;wake.layers.set(1);g.add(wake);

/* ── 뱃길: 해안(격자)에서 16 이상, 작은 섬 테두리에서 16 이상. 섬 사이 물길이 넓으면 안쪽으로 ── */
function laneRadius(){const N=240,lo=new Float32Array(N),hi=new Float32Array(N).fill(1e9),r=new Float32Array(N),ang=i=>i/N*TAU-Math.PI;
  for(let i=0;i<N;i++){const a=ang(i),ca=Math.cos(a),sa=Math.sin(a),c=coastR(a);let l=c+22;while(l<c+160&&coastD(ca*l,sa*l)>-16)l+=2;lo[i]=l}
  for(const [ix,iz,ir] of COAST.isl){const d=Math.hypot(ix,iz),ia=Math.atan2(iz,ix),cl=ir*1.35+16,half=Math.asin(Math.min(1,cl/d))*1.5,win=[];
    for(let i=0;i<N;i++){let da=Math.abs(ang(i)-ia);da=Math.min(da,TAU-da);if(da<=half)win.push(i)}
    const inside=win.every(i=>d-cl>=lo[i]+4);win.forEach(i=>{if(inside)hi[i]=Math.min(hi[i],d-cl);else lo[i]=Math.max(lo[i],d+cl)})}
  for(let i=0;i<N;i++){hi[i]=Math.max(hi[i],lo[i]);r[i]=Math.min(hi[i],Math.max(lo[i],coastR(ang(i))+36))}
  for(let p=0;p<12;p++){const q=r.slice();for(let i=0;i<N;i++){let s=0;for(let k=-4;k<=4;k++)s+=q[(i+k+N)%N];r[i]=Math.min(hi[i],Math.max(lo[i],s/9))}}
  return a=>{const u=(((a+Math.PI)/TAU*N)%N+N)%N,i=Math.floor(u),t=u-i;return r[i]*(1-t)+r[(i+1)%N]*t}}
const rAt=laneRadius(),pM=at(KM,0),aD=Math.atan2(pM.z,pM.x);
const pts=[pM,at(KM,-8),at(KM,-20)];{const a0=aD+.2,a1=aD+TAU-.2,K=220;for(let k=0;k<=K;k++){const a=a0+(a1-a0)*k/K,w=Math.atan2(Math.sin(a),Math.cos(a)),r=rAt(w);pts.push({x:Math.cos(a)*r,z:Math.sin(a)*r})}}
pts.push(at(KM,20),at(KM,8),pM);
const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(p.x,0,p.z)),false,'centripetal');curve.arcLengthDivisions=8000;
const L=curve.getLength(),NS=Math.ceil(L),SP=curve.getSpacedPoints(NS),SEG=L/NS;
const posAt=(s,o)=>{const u=Math.min(NS-1e-6,Math.max(0,s/SEG)),i=Math.floor(u),t=u-i,a=SP[i],b=SP[i+1];o.x=a.x+(b.x-a.x)*t;o.z=a.z+(b.z-a.z)*t;return o};
const VMAX=30,RAMP=4.5,T=L/VMAX+RAMP;

/* ── 불꽃 분수 (배 뒤 난간 양쪽) ── */
const SN=touch?100:180,spPos=new Float32Array(SN*3).fill(-999),spVel=new Float32Array(SN*3),spCol=new Float32Array(SN*3),spLife=new Float32Array(SN);
const spGeo=new THREE.BufferGeometry();spGeo.setAttribute('position',new THREE.BufferAttribute(spPos,3));spGeo.setAttribute('color',new THREE.BufferAttribute(spCol,3));
const spark=new THREE.Points(spGeo,new THREE.PointsMaterial({size:.22,map:dotTex,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));
spark.frustumCulled=false;spark.visible=false;spark.userData.world=true;spark.userData.noAO=true;scene.add(spark);
const _v=new THREE.Vector3();let spI=0,spAcc=0;
function emit(){const i=spI=(spI+1)%SN,k=i*3;_v.set(i%2?1.3:-1.3,1.45,-3.25);hull.localToWorld(_v);spPos[k]=_v.x;spPos[k+1]=_v.y;spPos[k+2]=_v.z;const a=rnd()*TAU,sp=1+rnd()*2.6;spVel[k]=Math.cos(a)*sp+Y.vx*.92;spVel[k+1]=2.5+rnd()*4;spVel[k+2]=Math.sin(a)*sp+Y.vz*.92;spLife[i]=.45+rnd()*.5}
function sparkTick(dt,on){if(!on&&!spark.visible)return;if(on){spAcc+=dt*(touch?80:150);while(spAcc>=1){spAcc--;emit()}}let alive=0;
  for(let i=0;i<SN;i++){if(spLife[i]<=0)continue;const k=i*3;spLife[i]-=dt;if(spLife[i]<=0){spPos[k+1]=-999;continue}alive++;spVel[k+1]-=9*dt;spPos[k]+=spVel[k]*dt;spPos[k+1]+=spVel[k+1]*dt;spPos[k+2]+=spVel[k+2]*dt;const f=Math.min(1,spLife[i]/.35)*1.25,w=rnd()<.15?1.3:1;spCol[k]=f*w;spCol[k+1]=.55*f*w;spCol[k+2]=.12*f*w}
  spark.visible=alive>0;spGeo.attributes.position.needsUpdate=true;spGeo.attributes.color.needsUpdate=true}

/* ── 타기 · 내리기 ── */
const Y={on:false,phase:'',t:0,s:0,x:pM.x,z:pM.z,head:HM,roll:0,vx:0,vz:0,yaw0:0,fw:0,fin:false,at:0};
const _p={x:0,z:0},_q={x:0,z:0};
function place(){g.position.set(Y.x,SEA+.02+Math.sin(time*1.3)*.07,Y.z);g.rotation.set(Math.sin(time*.9)*.02,Y.head,Y.roll+Math.sin(time*1.1)*.015);g.updateMatrixWorld(true)}
function moor(){Object.assign(Y,{x:pM.x,z:pM.z,head:HM,roll:0,vx:0,vz:0});wake.material.opacity=0;place()}
function unlocked(){return S.open||(!!window.dpFishDone&&dpFishDone()&&gemFound.size>=gems.length)}
function counts(){const [f,F]=window.dpGame?dpGame.fishCount():[0,11];return {f,F,g:gemFound.size,G:gems.length}}
function flash(){const f=$('#flash');if(!f)return;f.classList.remove('go');void f.offsetWidth;f.classList.add('go')}
const beep=(f,d,l,w,v,f2)=>{try{if(playLoud())tone(f,d,l,w,v,f2)}catch{}};
const bar=document.createElement('div');bar.id='yachtBar';bar.innerHTML='<b>⛵ 섬 한 바퀴</b><span class="yb-track"><i id="ybProg"></i></span><span id="ybPct">0%</span><button type="button" id="ybExit">내리기</button>';document.body.appendChild(bar);
$('#ybExit').onclick=()=>land(false);
function startRide(force){if(Y.on)return;if(!force&&!unlocked()){const c=counts();toast(`⛵ 요트는 낚시 도감 ${c.f}/${c.F} · 숨은 다이아 ${c.g}/${c.G} 를 모두 채우면 열려요`);return}
  const G=window.dpGame||{};try{if(PLAY.mode)endPlay();if(riding)toggleBike(false);if(G.RUSH&&G.RUSH.on)G.endRush(false);if(G.reelStop)G.reelStop();if(G.closeModal)G.closeModal();toggleGemPanel(false)}catch(e){console.error(e)}
  route=[];target=null;drawRoute();keys={};moor();
  Object.assign(Y,{on:true,phase:'sail',t:0,s:0,yaw0:yaw,fw:2.2,fin:false,isle:false});wearCap(true);window.dpYachtOn=true;try{dpSeason.holdSpring()}catch{}cameraMode='yacht';cameraInitialized=false;try{resize();applySectionVisibility()}catch(e){}document.body.classList.add('yacht-ride');bar.classList.add('on');flash();
  $('#location').textContent='⛵ 요트로 섬 한 바퀴 · 드래그로 둘러보고 Esc 로 내려요';toast('⛵ 출항! 섬을 한 바퀴 돌아요');beep(196,0,.7,'sawtooth',.025);beep(247,.05,.7,'sawtooth',.02);tick(0)}
function land(done){if(!Y.on)return;Y.on=false;wearCap(false);lid.rotation.x=0;cglow.material.opacity=0;window.dpYachtOn=false;try{dpSeason.release()}catch{}document.body.classList.remove('yacht-ride');bar.classList.remove('on');flash();moor();
  {const w=nearestWalkable(GATE.x-OUT.x*2.5,GATE.z-OUT.z*2.5)||GATE;player.x=w.x;player.z=w.z}player.angle=H0;viewHeading=H0;keys={};characterGroups.forEach(c=>{c.root.rotation.x=0;c.root.rotation.z=0});dog.x=GATE.x-OUT.x*2+SIDE.x*1.5;dog.z=GATE.z-OUT.z*2+SIDE.z*1.5;
  if(cameraMode==='yacht'){beginWalk();cameraInitialized=false}placeCharacters(0,false);
  if(done){S.rides=(S.rides||0)+1;save();setTimeout(()=>{celebrate();try{sfx('arrive')}catch{}},250);toast(`⛵ 섬 한 바퀴 완주! (${S.rides}번째 항해)`)}else toast('⛵ 선착장에 내렸어요');hud()}
window.gameYachtCam=function(pos,aim,dt){if(Y.phase==='isle')return gameYachtIsleCam(pos,aim);const fx=Math.sin(Y.head),fz=Math.cos(Y.head);let nx=-Y.x,nz=-Y.z;const nl=Math.hypot(nx,nz)||1;nx/=nl;nz/=nl;
  const k=THREE.MathUtils.clamp(zoom/39,.5,1.6)*(innerWidth<innerHeight?1.35:1),o=yaw-Y.yaw0,co=Math.cos(o),so=Math.sin(o),bx0=-fx*22*k-nx*13*k,bz0=-fz*22*k-nz*13*k,bx=bx0*co-bz0*so,bz=bx0*so+bz0*co,lx=Y.vx/4,lz=Y.vz/4;
  pos.set(Y.x+bx+lx,SEA+4+7.5*k,Y.z+bz+lz);aim.set(Y.x+fx*9+nx*10+lx,SEA+4.2,Y.z+fz*9+nz*10+lz);return innerWidth<innerHeight?68:55};
window.gameYachtDamp=4;
function shoot(){const fx=Math.sin(Y.head),fz=Math.cos(Y.head),n=Math.hypot(Y.x,Y.z)||1,nx=-Y.x/n,nz=-Y.z/n,f=30+rnd()*50,i=45+rnd()*60,x=Y.x+fx*f+nx*i,z=Y.z+fz*f+nz*i;
  gameFireworks(x,Math.max(SEA,terrainHeight(x,z)),z,rnd()<.35?2:1,14,30+rnd()*20,2.1)}
function finale(){for(let j=0;j<3;j++){const c=at(-38-j*14,(j-1)*26);setTimeout(()=>{if(window.gameFireworks)gameFireworks(c.x,terrainHeight(c.x,c.z),c.z,5,22,40+j*6,2.4)},j*900)}}
function tick(dt){const vis=visChars();
  if(Y.phase==='isle'){isleTick(dt);place();wake.material.opacity=0;sparkTick(dt,false);return}
  if(Y.phase==='sail'){if(!Y.isle&&Y.s>=ISL.s){Y.isle=true;isleStart();return}Y.t+=dt;const t=Math.min(Y.t,T);let s=t<RAMP?.5*VMAX*t*t/RAMP:t>T-RAMP?L-.5*VMAX*(T-t)*(T-t)/RAMP:VMAX*(t-RAMP/2);s=Math.min(L,Math.max(0,s));
    posAt(s,_p);const ox=Y.x,oz=Y.z;let th;if(s+6<=L){posAt(s+6,_q);th=Math.atan2(_q.x-_p.x,_q.z-_p.z)}else{posAt(s-6,_q);th=Math.atan2(_p.x-_q.x,_p.z-_q.z)}
    Y.x=_p.x;Y.z=_p.z;if(dt>0){let ux=(Y.x-ox)/dt,uz=(Y.z-oz)/dt;const u=Math.hypot(ux,uz);if(u>VMAX*1.2){ux*=VMAX/u;uz*=VMAX/u}Y.vx=THREE.MathUtils.lerp(Y.vx,ux,Math.min(1,dt*6));Y.vz=THREE.MathUtils.lerp(Y.vz,uz,Math.min(1,dt*6))}
    const h0=Y.head;Y.head=angleLerp(Y.head,th,Math.min(1,dt*5));const turn=dt>0?Math.atan2(Math.sin(Y.head-h0),Math.cos(Y.head-h0))/dt:0;Y.roll=THREE.MathUtils.lerp(Y.roll,THREE.MathUtils.clamp(turn*.3,-.16,.16),Math.min(1,dt*3));
    Y.s=s;$('#ybProg').style.width=(s/L*100).toFixed(1)+'%';$('#ybPct').textContent=Math.floor(s/L*100)+'%';
    if(s>50&&s<L-280){Y.fw-=dt;if(Y.fw<=0){Y.fw=1+rnd()*.9;shoot()}}
    if(!Y.fin&&s>L-300){Y.fin=true;finale()}
    if(Y.t>=T){Y.phase='arrive';Y.at=0;vis.forEach((c,i)=>setTimeout(()=>emote(c,'heart'),i*180))}}
  else if(Y.phase==='arrive'){Y.at+=dt;Y.vx*=.9;Y.vz*=.9;Y.roll*=.9;if(Y.at>1.8){land(true);return}}
  place();const sp=Math.hypot(Y.vx,Y.vz);wake.material.opacity=Math.min(.85,sp/22);wake.scale.set(1,1,1);
  player.x=Y.x;player.z=Y.z;player.angle=Y.head;
  vis.forEach((c,i)=>{const o=vis.length>1?(i?.45:-.45):0;_v.set(o,1.31,-2.45);hull.localToWorld(_v);c.root.position.set(_v.x,_v.y-.51,_v.z);c.root.rotation.set(0,Y.head,Y.roll*.6);seatPose(c,1,time*2.4+i*1.7);if(c.shadow)c.shadow.visible=false});
  if(dog.g.visible){_v.set(0,.94,2.4);hull.localToWorld(_v);dog.g.position.copy(_v);dog.g.rotation.set(0,Y.head,0);dog.x=_v.x;dog.z=_v.z}
  sparkTick(dt,Y.phase==='sail'&&Math.hypot(Y.vx,Y.vz)>4)}

/* ── 2막: 작은 섬 보물 상자 — 뱃길에서 가장 가까운 작은 섬에 잠깐 내려 상자를 연다 ──
   상자에서 나오는 것: 선장 모자(탈 때 쓴다) → DentPhoto 깃발(돛대) → 황금 돛 → 그다음부턴 금화. Y.t 는 섬에 있는 동안 멈춘다. */
const ITEMS=[{id:'hat',name:'선장 모자',e:'🧢',say:'선장 모자!'},{id:'flag',name:'DentPhoto 깃발',e:'🚩',say:'깃발 획득!'},{id:'sail',name:'황금 돛',e:'✨',say:'황금 돛!'}];
S.items=Array.isArray(S.items)?S.items:[];S.coins=S.coins||0;
const ISL=(()=>{let best=null;COAST.isl.forEach(([ix,iz,ir])=>{let bd=1e9,bi=0;SP.forEach((p,i)=>{const s=i*SEG;if(s<L*.2||s>L*.8)return;const d=Math.hypot(p.x-ix,p.z-iz);if(d<bd){bd=d;bi=i}});const sc=bd-ir;if(!best||sc<best.sc)best={x:ix,z:iz,r:ir,s:bi*SEG,lx:SP[bi].x,lz:SP[bi].z,sc}});
  // 섬의 소나무(원본과 같은 식)를 피해 뱃길 쪽 방향을 고른다: 주인공은 가운데 가까이, 상자는 바다 쪽, 카메라는 바다에서 본다
  const j=COAST.isl.findIndex(q=>q[0]===best.x&&q[1]===best.z),[,,r0,,ph]=COAST.isl[j],pines=[];if(r0>=10)for(let k=0;k<(r0>=13?2:1);k++){const a=ph*2.1+k*2.5+j,q=j===0?.5:.2+.25*k;pines.push([best.x+Math.cos(a)*r0*q,best.z+Math.sin(a)*r0*q])}
  if(j===0)pines.push([best.x,best.z]);
  const a0=Math.atan2(best.lz-best.z,best.lx-best.x);let bu=null,bc=-1;
  for(const da of [0,.3,-.3,.6,-.6,.9,-.9,1.2,-1.2]){const a=a0+da,ux=Math.cos(a),uz=Math.sin(a);let c=1e9;for(let t=.1;t<=1.25;t+=.05){const x=best.x+ux*best.r*t,z=best.z+uz*best.r*t;for(const [px,pz] of pines)c=Math.min(c,Math.hypot(x-px,z-pz))}c-=Math.abs(da)*.8;if(c>bc){bc=c;bu=[ux,uz]}}
  best.dx=bu[0];best.dz=bu[1];
  best.hx=best.x+best.dx*best.r*.22;best.hz=best.z+best.dz*best.r*.22;best.cx=best.x+best.dx*best.r*.42;best.cz=best.z+best.dz*best.r*.42;
  best.cy=Math.max(SEA,isletY(best.cx,best.cz));best.hy=Math.max(SEA,isletY(best.hx,best.hz));return best})();
const chest=new THREE.Group();chest.userData.world=true;chest.position.set(ISL.cx,ISL.cy,ISL.cz);chest.rotation.y=Math.atan2(-ISL.dz,ISL.dx);scene.add(chest);
const lid=new THREE.Group();
{const wood='#8a5a2b',gold='#e0b64a';box(chest,0,.36,0,1.3,.72,.86,wood);box(chest,0,.1,0,1.36,.1,.92,gold);for(const sx of [-1,1])box(chest,sx*.46,.37,0,.1,.74,.9,gold);box(chest,0,.52,.45,.2,.24,.06,'#ffd76a');
  lid.position.set(0,.72,-.43);chest.add(lid);box(lid,0,.13,.43,1.3,.26,.86,'#9b6a35');for(const sx of [-1,1])box(lid,sx*.46,.13,.43,.1,.28,.9,gold)}
const cglow=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:'#ffe08a',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));cglow.position.y=.9;cglow.scale.setScalar(2.4);chest.add(cglow);
// 선장 모자 (타는 동안만 원래 모자 대신)
const cap=new THREE.Group();{const white=M('#fbfaf6'),navy=M('#1d2f4f'),gold=M('#e8c25a',{metalness:.5,roughness:.3});
  const top=mesh(new THREE.CylinderGeometry(.5,.44,.26,20),white,cap);top.position.y=.5;const band=mesh(new THREE.CylinderGeometry(.45,.45,.12,20),navy,cap);band.position.y=.4;
  const vis=mesh(new THREE.CylinderGeometry(.3,.3,.04,16,1,false,-Math.PI/2,Math.PI),navy,cap);vis.position.set(0,.36,.34);vis.rotation.x=.25;
  const bd=mesh(new THREE.SphereGeometry(.07,10,8),gold,cap);bd.position.set(0,.44,.45);bd.scale.set(1,1,.5);cap.position.y=.2;cap.scale.setScalar(1.18)}
let capOn=null;
function wearCap(on){const c=on?visChars()[0]:capOn;if(!c||!c.h||!c.h.hat)return;if(on&&S.items.includes('hat')){c.h.hat.parent.add(cap);c.h.hat.visible=false;capOn=c}else if(!on&&capOn){cap.parent&&cap.parent.remove(cap);capOn.h.hat.visible=true;capOn=null}}
function dress(){if(sailMat)sailMat.color.set(S.items.includes('sail')?'#ffd76a':'#fbf6e8');if(sailMat){sailMat.emissive.set(S.items.includes('sail')?'#4a3500':'#000000')}if(flagG)flagG.visible=S.items.includes('flag')}
dress();
function isleStart(){Y.phase='isle';Y.it=0;Y.got=null;flash();cameraInitialized=false;lid.rotation.x=0;cglow.material.opacity=0;beep(523,0,.12);$('#location').textContent='🏝 작은 섬에 내렸어요 — 보물 상자!';toast('🏝 작은 섬에 보물 상자가 있어요!')}
function isleTick(dt){Y.it+=dt;const vis=visChars();
  vis.forEach((c,i)=>{const o=i?1:0,ang=Math.atan2(ISL.cx-ISL.hx,ISL.cz-ISL.hz),sx=Math.cos(ang)*.9*o,sz=-Math.sin(ang)*.9*o,x=ISL.hx+sx,z=ISL.hz+sz;c.root.position.set(x,Math.max(SEA,isletY(x,z)),z);c.root.rotation.set(0,ang,0);seatPose(c,0,0);if(c.shadow)c.shadow.visible=false});
  if(dog.g.visible){const x=ISL.hx-ISL.dz*1.2,z=ISL.hz+ISL.dx*1.2;dog.g.position.set(x,Math.max(SEA,isletY(x,z)),z);dog.g.rotation.set(0,Math.atan2(ISL.cx-x,ISL.cz-z),0)}
  const k=THREE.MathUtils.clamp((Y.it-1.1)/.6,0,1);lid.rotation.x=-1.95*(1-Math.pow(1-k,3));cglow.material.opacity=k*(.65+.25*Math.sin(time*8));
  if(Y.it>1.4&&!Y.got){const it=ITEMS.find(t=>!S.items.includes(t.id));if(it){S.items.push(it.id);Y.got=it}else{S.coins++;Y.got={e:'🪙',name:`금화 (${S.coins}개째)`,say:'금화!'}}save();dress();wearCap(true);
    try{gameFireworks(ISL.cx,ISL.cy+1,ISL.cz,1,3,5,.45)}catch{}[784,988,1319,1568].forEach((f,i)=>beep(f,i*.09,.16));toast(`🎁 보물 상자 — ${Y.got.e} ${Y.got.name}!`,'gem');if(vis[0])emote(vis[0],Y.got.say)}
  if(Y.it>4.6){Y.phase='sail';flash();cameraInitialized=false;$('#location').textContent='⛵ 요트로 섬 한 바퀴 · 드래그로 둘러보고 Esc 로 내려요'}}
window.gameYachtIsleCam=function(pos,aim){const bx=ISL.cx+ISL.dx*6-ISL.dz*2,bz=ISL.cz+ISL.dz*6+ISL.dx*2;pos.set(bx,Math.max(ISL.cy,ISL.hy)+3.2,bz);aim.set((ISL.cx+ISL.hx)/2,(ISL.cy+ISL.hy)/2+.9,(ISL.cz+ISL.hz)/2);return 50};

/* ── 열림 · 미니게임판 · 미니맵 ── */
let chk=.5;
function unlockShow(){celebrate();const a=viewHeading,x=player.x+Math.sin(a)*32,z=player.z+Math.cos(a)*32;gameFireworks(x,terrainHeight(x,z),z,9,16,24,1.5);toast('⛵ 요트가 열렸어요! 남쪽 해변 선착장으로 가 보세요');
  setTimeout(()=>{if(Y.on||!window.dpGame)return;dpGame.showModal('<div class="eyebrow">YACHT OPEN</div><h2>⛵ 요트가 열렸어요!</h2><p>낚시 도감과 숨은 다이아를 모두 모았어요. 남쪽 해변 <b>DentPhoto 선착장</b>에서 F 를 누르면 요트를 타고 섬을 한 바퀴 돌아요. 불꽃놀이도 준비됐어요!</p><div class="gm-actions"><button data-act="close">나중에</button><button class="primary" data-act="yacht">선착장으로</button></div>');const b=document.querySelector('.game-modal [data-act=yacht]');if(b)b.onclick=()=>{dpGame.closeModal();goDock()}},6000)}
function checkUnlock(){if(!S.open&&unlocked()){S.open=true;save();unlockShow()}}
function goDock(){if(Y.on)return;if(PLAY.mode)endPlay();beginWalk(true);travelTo(GATE,null)}
$('#ghTip').insertAdjacentHTML('beforebegin','<div class="gh-row" id="ghYachtRow"><span><b>⛵ 요트 섬 일주</b><small id="ghYacht"></small></span><button class="gh-btn soft" id="ghYachtBtn">선착장으로</button></div>');
$('#ghYachtBtn').onclick=()=>unlocked()&&near()?startRide():goDock();
function hud(){const el=$('#ghYacht');if(!el)return;const c=counts(),u=unlocked();el.textContent=u?(S.rides?`열렸어요 · ${S.rides}번 완주`+(S.items.length?' · '+S.items.map(i=>(ITEMS.find(t=>t.id===i)||{}).e).join(''):'')+(S.coins?` · 🪙${S.coins}`:''):'열렸어요! 선착장에서 F'):`도감 ${c.f}/${c.F} · 다이아 ${c.g}/${c.G} 모으면 열려요`;$('#ghYachtBtn').textContent=u&&near()?'타기':'선착장으로'}
const _fp=findPlay;findPlay=function(){if(!Y.on&&near()){PLAY_TXT.yacht=unlocked()?'⛵ 요트 타고 섬 한 바퀴':'⛵ 요트 · 도감과 다이아를 모두 모으면 열려요';return {kind:'yacht'}}return _fp()};
const _da=doAction;doAction=function(){if(!Y.on&&!inputBusy()&&!PLAY.mode&&walkish()&&near()){startRide();return}return _da()};
const _tb=toggleBike;toggleBike=function(on){if(Y.on)return;return _tb(on)};
const _tt=travelTo;travelTo=function(p,d){if(Y.on){toast('요트에서 내린 뒤에 이동해요');return}return _tt(p,d)};
const _es=enterSection;enterSection=function(){if(Y.on){toast('요트에서 내린 뒤에 이동해요');return}return _es.apply(this,arguments)};
if(typeof fullOverview==='function'){const _fo=fullOverview;fullOverview=function(){if(Y.on)land(false);return _fo.apply(this,arguments)}}
const _ud=updateDog;updateDog=function(dt){if(Y.on)return;return _ud(dt)};
if(typeof mmIcons==='function'){const _mi=mmIcons;mmIcons=function(x){_mi(x);try{const [a,b]=mmXY(Y.x,Y.z);x.font='17px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('⛵',a,b)}catch{}}}
addEventListener('keydown',e=>{if(!Y.on||inputBusy())return;const ae=document.activeElement;if((e.key==='Enter'||e.key===' '||e.code==='Space')&&ae&&/^(BUTTON|A)$/.test(ae.tagName))return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();land(false);return}const k=(e.key||'').toLowerCase();if(e.code==='Space'||['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','f','b',' ','h','e','enter'].includes(k)){e.preventDefault();e.stopImmediatePropagation()}},true);
const _ue=updateExtras;updateExtras=function(dt){_ue(dt);try{chk-=dt;if(chk<=0){chk=1;checkUnlock();hud()}if(Y.on){if(cameraMode!=='yacht')land(false);else tick(dt)}else{place();sparkTick(dt,false)}}catch(e){console.error(e)}};
moor();hud();
window.dpYacht={start:()=>startRide(true),stop:()=>land(false),Y,S,GATE,L,T,path:()=>SP,ISL,chest,
  jumpIsle(){Y.t=(ISL.s-2)/VMAX+RAMP/2;Y.s=ISL.s;},
  clearance(){let land=-1e9,isl=1e9;SP.forEach((p,i)=>{const s=i*SEG;if(s<70||s>L-70)return;land=Math.max(land,coastD(p.x,p.z));for(const [ix,iz,ir] of COAST.isl)isl=Math.min(isl,Math.hypot(p.x-ix,p.z-iz)-ir)});return {land,isl,L:Math.round(L),T:Math.round(T)}}};
})();
