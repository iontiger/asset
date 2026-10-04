/* 뉴욕 시내의 움직임: 신호 교차로 횡단보도의 사람들 · 보도의 비둘기 떼 · 주황 흰 줄무늬 증기 굴뚝.
   - 내 신호가 빨간불이면 연석에서 기다리던 사람들이 횡단보도를 건너고, 초록불이 되면(또는 바이크가 빠르게 다가오면) 가까운 연석으로 서둘러 비킨다.
   - 비둘기는 바이크가 가까이 오면 한꺼번에 날아오른다(밤에는 보이지 않는다). 새로 출발하면 제자리로 돌아온다.
   city-scene.js 가 좌표 함수를 넘겨 준다. update() 는 {walk} 를 돌려준다(가까운 횡단보도에 건너는 사람이 있으면 true — 보행 신호음). */
(function(root){
const SKIN=['#f1c7a5','#e0ac85','#c68863','#8d5a3b','#5c3a24','#f5d6bd'],TOP=['#1d1f24','#2f3d55','#7a2e2e','#c9b48a','#3b5b4a','#e8e4da','#5b4a6e','#b65c2b','#30343a','#8a8f96'],LEGC=['#22262c','#34405a','#4a3d33','#1b1c1f','#6b6f75'];
function build({T,g,C,SP,WV,YC,HALF,WALK,rotOf,glowTex,rnd}){
 const SM=(c,o)=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:.8},o||{}));
 const dmy=new T.Object3D(),M=new T.Matrix4(),L=new T.Matrix4(),cc=new T.Color(),hidden=new T.Matrix4().makeScale(0,0,0);
 // ── 사람(관절 4개: 다리 둘 · 팔 둘이 걸음에 맞춰 흔들린다)
 const MAXP=72;
 const parts={
  torso:new T.InstancedMesh(new T.CylinderGeometry(.27,.22,.78,10).scale(1,1,.68).translate(0,1.36,0),SM('#ffffff',{roughness:.85}),MAXP),
  hips:new T.InstancedMesh(new T.CylinderGeometry(.23,.25,.24,10).scale(1,1,.7).translate(0,.93,0),SM('#ffffff'),MAXP),
  head:new T.InstancedMesh(new T.SphereGeometry(.17,12,10).scale(.92,1.1,1).translate(0,1.98,0),SM('#ffffff',{roughness:.6}),MAXP),
  hair:new T.InstancedMesh(new T.SphereGeometry(.18,12,8,0,Math.PI*2,0,Math.PI*.55).scale(.95,1.05,1.02).translate(0,2.0,.01),SM('#2a1f18',{roughness:.9}),MAXP),
  legL:new T.InstancedMesh(new T.CylinderGeometry(.095,.075,.86,7).translate(0,-.43,0),SM('#ffffff'),MAXP),
  legR:new T.InstancedMesh(new T.CylinderGeometry(.095,.075,.86,7).translate(0,-.43,0),SM('#ffffff'),MAXP),
  armL:new T.InstancedMesh(new T.CylinderGeometry(.07,.055,.66,6).translate(0,-.33,0),SM('#ffffff'),MAXP),
  armR:new T.InstancedMesh(new T.CylinderGeometry(.07,.055,.66,6).translate(0,-.33,0),SM('#ffffff'),MAXP)};
 for(const m of Object.values(parts)){m.count=0;m.castShadow=true;m.frustumCulled=false;g.add(m)}
 const hipL=new T.Matrix4().makeTranslation(-.12,.9,0),hipR=new T.Matrix4().makeTranslation(.12,.9,0),shL=new T.Matrix4().makeTranslation(-.33,1.68,0),shR=new T.Matrix4().makeTranslation(.33,1.68,0),rx=new T.Matrix4(),rz=new T.Matrix4();
 let pn=0;
 function person(x,y,z,ry,swing,q){if(pn>=MAXP)return;dmy.position.set(x,y,z);dmy.rotation.set(0,ry,0);dmy.scale.setScalar(q.h);dmy.updateMatrix();M.copy(dmy.matrix);
  for(const k of ['torso','hips','head','hair'])parts[k].setMatrixAt(pn,M);
  const limb=(m,base,a,side)=>{rz.makeRotationZ(side*.07);rx.makeRotationX(a);L.copy(M).multiply(base).multiply(rx).multiply(rz);m.setMatrixAt(pn,L)};
  limb(parts.legL,hipL,swing*.55,0);limb(parts.legR,hipR,-swing*.55,0);limb(parts.armL,shL,-swing*.45,-1);limb(parts.armR,shR,swing*.45,1);
  if(!q.painted){q.painted=true}
  parts.torso.setColorAt(pn,cc.set(q.top));parts.armL.setColorAt(pn,cc);parts.armR.setColorAt(pn,cc);parts.hips.setColorAt(pn,cc.set(q.leg));parts.legL.setColorAt(pn,cc);parts.legR.setColorAt(pn,cc);parts.head.setColorAt(pn,cc.set(q.skin));parts.hair.setColorAt(pn,cc.set(q.hair));pn++}
 function people(){for(const m of Object.values(parts)){m.count=pn;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true}}
 const HAIR=['#1d1612','#3a2a1e','#6b4a2c','#a07a4a','#2b2b2b','#c9c2b8'];
 const newPerson=()=>({top:TOP[Math.floor(rnd()*TOP.length)],leg:LEGC[Math.floor(rnd()*LEGC.length)],skin:SKIN[Math.floor(rnd()*SKIN.length)],hair:HAIR[Math.floor(rnd()*HAIR.length)],h:.92+rnd()*.16,ph:rnd()*6});
 // ── 신호 교차로 횡단보도(정지선 바로 앞): 양쪽 연석에 4명씩
 const EDGE=WALK-1.5,CURB=HALF+1.1;
 const xings=C.lights.map(l=>{const s=C.segs[l.k],d=l.d+4.5+(WALK-HALF)/2,crowd=[];
  for(let i=0;i<8;i++){const side=i<4?-1:1;crowd.push(Object.assign(newPerson(),{side,lat:side*(CURB+rnd()*(EDGE-CURB)),off:(rnd()-.5)*3.2,go:0,v:0,state:'wait',delay:0}))}
  return {l,s,d,crowd,u:C.uAt(l.k,d)}});
 // ── 비둘기: 달리는 방향 오른쪽 보도에 떼마다 7마리
 const birdMat=SM('#7d828c',{roughness:.7}),wingMat=SM('#5f646e',{roughness:.75,side:T.DoubleSide});
 const flocks=[];for(let k=1;k<C.segs.length-1;k++){const s=C.segs[k];for(let d=s.dS0+24;d<s.dS1-24;d+=64){if(C.lights.some(l=>l.k===k&&Math.abs(l.d+14-d)<20))continue;const f={k,d,u:C.uAt(k,d),birds:[],up:false,t:0};
   for(let i=0;i<7;i++){const p=SP(k,d+(rnd()-.5)*3.4,HALF+1.4+rnd()*2.8),w=C.world(p[0],p[1]);f.birds.push({x:w.x,z:w.z,x0:w.x,z0:w.z,y:YC+.24,ry:rnd()*6.3,ph:rnd()*6,vx:0,vy:0,vz:0})}flocks.push(f)}}
 const NB=flocks.length*7;
 const bird={body:new T.InstancedMesh(new T.SphereGeometry(.17,10,8).scale(.85,.8,1.6).translate(0,.2,0),birdMat,NB),head:new T.InstancedMesh(new T.SphereGeometry(.09,8,6).translate(0,.36,-.26),SM('#4b5560',{roughness:.6}),NB),
  wingL:new T.InstancedMesh(new T.PlaneGeometry(.55,.3).rotateX(-Math.PI/2).translate(-.3,.26,.04),wingMat,NB),wingR:new T.InstancedMesh(new T.PlaneGeometry(.55,.3).rotateX(-Math.PI/2).translate(.3,.26,.04),wingMat,NB)};
 for(const m of Object.values(bird)){m.castShadow=true;m.frustumCulled=false;g.add(m)}
 const wL=new T.Matrix4(),wR=new T.Matrix4();
 // ── 콘에드 증기 굴뚝(주황 · 흰 줄무늬): 길 가운데 두 곳에서 김이 뭉게뭉게
 const stripe=(()=>{const cv=document.createElement('canvas');cv.width=64;cv.height=256;const x=cv.getContext('2d');for(let i=0;i<8;i++){x.fillStyle=i%2?'#f4f1ea':'#ee6a1f';x.fillRect(0,i*32,64,32)}const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;return t})();
 const stacks=[[3,40],[6,195]].map(([k,d])=>{const p=SP(k,d,-1.2),m=new T.Mesh(new T.CylinderGeometry(.42,.48,2.6,16,1,true),SM('#ffffff',{map:stripe,roughness:.6,side:T.DoubleSide}));m.position.copy(WV(p[0],p[1],YC+1.3));m.castShadow=true;g.add(m);
  const cap=new T.Mesh(new T.TorusGeometry(.45,.06,6,16).rotateX(Math.PI/2),SM('#2f3336',{metalness:.5}));cap.position.copy(WV(p[0],p[1],YC+2.6));g.add(cap);const w=C.world(p[0],p[1]);return {x:w.x,z:w.z}});
 const SN=26,stPos=new Float32Array(stacks.length*SN*3),stGeo=new T.BufferGeometry();stGeo.setAttribute('position',new T.BufferAttribute(stPos,3));
 const stSteam=new T.Points(stGeo,new T.PointsMaterial({map:glowTex,color:'#f4f4f2',size:5.5,transparent:true,opacity:.5,depthWrite:false}));stSteam.frustumCulled=false;g.add(stSteam);

 let walkNear=false;
 function update(time,dt,ride,env,bikePos){const st=ride.city;if(!st)return {walk:false};pn=0;walkNear=false;const pu=C.uOf(ride.pos),fast=ride.speed>80,dark=env?env.dark:0;
  for(const X of xings){const ls=st.lights[X.l.i],dist=X.u-pu;if(dist<-60||dist>320)continue;const red=ls.state==='red'&&!(fast&&dist<35&&dist>-4);
   for(const q of X.crowd){
    if(q.state==='wait'&&red){q.state='delay';q.delay=.3+rnd()*2.4}
    if(q.state==='delay'){if(!red)q.state='wait';else if((q.delay-=dt)<=0){q.state='walk';q.go=-q.side}}
    if(q.state==='walk'&&!red){q.state='clear';q.go=Math.sign(q.lat)||q.side}           // 초록불: 가까운 연석으로 서둘러
    let want=0;if(q.state==='walk'){want=1.5;const end=q.go*(CURB+.6+(q.ph%1)*(EDGE-CURB-.6));if((end-q.lat)*q.go<=0){q.state='wait';q.side=q.go}}
    if(q.state==='clear'){want=4.2;if(Math.abs(q.lat)>=CURB+.3){q.state='wait';q.side=Math.sign(q.lat)}}
    q.v+=(want-q.v)*Math.min(1,dt*5);q.lat+=q.go*q.v*dt;if(q.state==='walk'||q.state==='clear')walkNear=walkNear||(dist<60&&q.state==='walk');
    const p=SP(X.l.k,X.d+q.off,q.lat),w=C.world(p[0],p[1]),moving=q.v>.2,ry=moving?rotOf(X.s.right[0]*q.go,X.s.right[1]*q.go):rotOf(-X.s.right[0]*Math.sign(q.lat),-X.s.right[1]*Math.sign(q.lat));
    const sw=moving?Math.sin(time*q.v*3.4+q.ph)*Math.min(1,q.v):Math.sin(time*1.3+q.ph)*.04;person(w.x,YC+(Math.abs(q.lat)>HALF?.24:.02)+(moving?Math.abs(Math.sin(time*q.v*3.4+q.ph))*.04:0),w.z,ry,sw,q)}}
  people();
  // 비둘기
  let n=0;const show=dark<.6&&ride.mode!=='finished';
  for(const f of flocks){const dist=f.u-pu;
   if(f.up&&dist>40){f.up=false;f.t=0;for(const b of f.birds){b.x=b.x0;b.z=b.z0;b.y=YC+.24;b.vx=b.vy=b.vz=0}}   // 다시 출발하면 제자리로
   const far=dist<-120||dist>260||!show;
   if(!f.up&&!far&&bikePos){const dx=f.birds[0].x0-bikePos.x,dz=f.birds[0].z0-bikePos.z;if(dx*dx+dz*dz<24*24){f.up=true;f.t=0;for(const b of f.birds){const l=Math.hypot(b.x-bikePos.x,b.z-bikePos.z)||1;b.vx=(b.x-bikePos.x)/l*(3+rnd()*3);b.vz=(b.z-bikePos.z)/l*(3+rnd()*3);b.vy=4+rnd()*3;b.ry=Math.atan2(-b.vx,-b.vz)}}}
   if(f.up)f.t+=dt;
   for(const b of f.birds){if(far||(f.up&&f.t>6)){for(const m of Object.values(bird))m.setMatrixAt(n,hidden);n++;continue}
    let flap=0,pitch=0;
    if(f.up){b.vy+=(.6-b.vy*.25)*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;flap=Math.sin(time*26+b.ph)*.9;pitch=-.25}
    else{const peck=Math.max(0,Math.sin(time*2.2+b.ph*3));pitch=peck*.5;b.ry+=Math.sin(time*.7+b.ph)*dt*.6}
    dmy.position.set(b.x,b.y,b.z);dmy.rotation.set(pitch,b.ry,0,'YXZ');dmy.scale.setScalar(1.6);dmy.updateMatrix();bird.body.setMatrixAt(n,dmy.matrix);bird.head.setMatrixAt(n,dmy.matrix);
    if(f.up){wL.makeRotationZ(flap);wR.makeRotationZ(-flap);L.copy(dmy.matrix).multiply(wL);bird.wingL.setMatrixAt(n,L);L.copy(dmy.matrix).multiply(wR);bird.wingR.setMatrixAt(n,L)}else{bird.wingL.setMatrixAt(n,hidden);bird.wingR.setMatrixAt(n,hidden)}n++}}
  for(const m of Object.values(bird))m.instanceMatrix.needsUpdate=true;
  // 증기 굴뚝
  stacks.forEach((s,j)=>{for(let i=0;i<SN;i++){const f=(time*.28+i/SN)%1,k=(j*SN+i)*3;stPos[k]=s.x+Math.sin(i*2.1+time*.6)*f*2.6+f*f*3;stPos[k+1]=YC+2.7+f*11;stPos[k+2]=s.z+Math.cos(i*1.3+time*.5)*f*2.6}});stGeo.attributes.position.needsUpdate=true;
  stSteam.material.opacity=.42+(env?env.snowCover*.2+env.weather*.1:0);
  return {walk:walkNear}}
 return {update,xings,flocks,stacks,get people(){return pn}}}
root.CITY_LIFE={build};if(typeof module!=='undefined')module.exports={build};
})(typeof window!=='undefined'?window:globalThis);
