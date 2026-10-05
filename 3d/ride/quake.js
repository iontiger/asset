/* 지진 구간(3회차부터): 첫 점프 착지 뒤 ~ 갈림길 전. 시뮬레이션은 game-core.js(RIDE_QUAKE), 여기는 그리기만.
   - 단층: 바이크가 다가오면 길을 가로질러 땅이 지그재그로 갈라지고(검은 틈 · 붉은 속), 건너편 땅덩이가 솟아오르며 흙먼지가 터진다.
   - 바위: 산비탈에서 출발해 중력으로 빨라지며 굴러 내려와 길을 가로지른다(구르는 만큼 돌고, 통통 튀고, 흙먼지를 남긴다).
   game.js: QUAKE_FX.build({...}) → update(dt,time). ride.quakeOn 이 꺼져 있으면 아무것도 보이지 않는다. */
(function(root){
function build({T,scene,ride,drivePoint,groundAt,burst,onOpen}){
 const Q=root.RIDE_QUAKE,group=new T.Group();group.visible=false;scene.add(group);
 const crackMat=new T.MeshBasicMaterial({color:'#17110d',side:T.DoubleSide}),lavaMat=new T.MeshBasicMaterial({color:'#ff6a2a',side:T.DoubleSide,transparent:true,opacity:.0});
 const slabMat=new T.MeshStandardMaterial({color:'#b99b73',roughness:.95,flatShading:true}),sideMat=new T.MeshStandardMaterial({color:'#6e5440',roughness:1,flatShading:true});
 const rockMat=new T.MeshStandardMaterial({color:'#7a6f63',roughness:.92,flatShading:true});
 // 길 위 한 점의 좌표계: +x 오른쪽 · +y 위 · -z 앞(달리는 쪽)
 const frame=s=>{const o=drivePoint(s,0,'cliff'),r=drivePoint(s,1,'cliff').sub(o).normalize(),f=drivePoint(s+20,0,'cliff').sub(o).normalize(),up=new T.Vector3().crossVectors(r,f).normalize();
  const m=new T.Matrix4().makeBasis(r,up,f.clone().negate());return {o,q:new T.Quaternion().setFromRotationMatrix(m)}};
 // 지그재그 틈(띠): 가로 -W..W, 가운데가 가장 넓다
 function crackGeo(seed,W,width,ang){const pts=[],n=26;for(let i=0;i<=n;i++){const x=-W+2*W*i/n,z=x*ang+Math.sin(i*2.7+seed)*1.1+Math.sin(i*5.3+seed*2)*.45,w=width*(.35+.65*Math.sin(Math.PI*i/n));pts.push([x,z,w])}
  const v=[],idx=[];pts.forEach(([x,z,w],i)=>{v.push(x,.06,z-w/2,x,.06,z+w/2);if(i<n){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}});
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();return g}
 const faults=Q.FAULTS.map(f=>{const {o,q}=frame(f.z),g=new T.Group();g.position.copy(o);g.quaternion.copy(q);group.add(g);
  const crack=new T.Mesh(crackGeo(f.i*1.7,13,1.6,f.ang),crackMat);const lava=new T.Mesh(crackGeo(f.i*1.7,11,.55,f.ang),lavaMat);lava.position.y=.02;g.add(crack,lava);
  // 갈라진 금 몇 가닥(옆으로 뻗는다)
  for(let k=0;k<3;k++){const b=new T.Mesh(crackGeo(f.i*3.1+k,4+k*1.5,.45,.9-k*.7),crackMat);b.position.set((k-1)*6,0,-2.5-k);b.rotation.y=(k-1)*.5;g.add(b)}
  // 솟아오르는 땅덩이(틈 건너편, 길 폭 전체) + 길가의 부서진 덩이
  const slab=new T.Mesh(new T.BoxGeometry(24,3,8.5),[sideMat,sideMat,slabMat,sideMat,sideMat,sideMat]);slab.position.set(0,-1.6,-5.2);g.add(slab);
  const chunks=[[-11.5,-3,2.6,1.4],[11,-4,2.2,1.1],[-6,-9.5,1.6,.8],[7.5,-10,1.8,.9]].map(([x,z,s,h])=>{const c=new T.Mesh(new T.DodecahedronGeometry(s,0),sideMat);c.position.set(x,-s,z);c.userData={x,z,s,h};g.add(c);return c});
  return {f,g,crack,lava,slab,chunks,open:0,burst:false}});
 const boulders=Q.BOULDERS.map(b=>{const fw=drivePoint(b.z+20,0,'cliff').sub(drivePoint(b.z,0,'cliff')).normalize(),m=new T.Mesh(new T.DodecahedronGeometry(b.radius,1),rockMat);m.scale.set(1,.88,1.05);m.castShadow=true;group.add(m);return {b,m,fw,dustT:0}});
 const eps=s=>(s<0?0:s>1?1:s*s*(3-2*s));
 function update(dt,time){const on=!!ride.quakeOn;group.visible=on;if(!on)return;const pos=ride.pos;
  for(const F of faults){const d=F.f.z-pos,near=d<2600&&d>-700;F.g.visible=near;if(!near)continue;
   // 다가오면(1500 → 900) 갈라지고 솟아오른다
   const p=eps((1500-d)/600);if(p>.02&&!F.burst){F.burst=true;onOpen&&onOpen(F.f)}
   F.crack.scale.set(1,1,Math.max(.01,p));F.lava.scale.set(1,1,Math.max(.01,p));F.lava.material.opacity=.55+.25*Math.sin(time*6);
   const lift=F.f.h*1.15;F.slab.position.y=-1.6+(1.5+lift)*p+Math.sin(time*31+F.f.i)*.05*ride.quake;F.slab.rotation.x=-.07*p;F.slab.rotation.z=(F.f.i%2?.05:-.05)*p;
   F.chunks.forEach((c,k)=>{const u=c.userData;c.position.y=-u.s+(u.s+u.h)*p;c.rotation.set(.4*p*(k%2?1:-1),k,.3*p)})}
  for(const B of boulders){const b=B.b,st=ride.boulders.get(b.id),d=b.z-pos;B.m.visible=d<3200&&d>-500;if(!B.m.visible)continue;
   const x=st?st.x:b.side*2.35,lat=x*9,road=drivePoint(b.z,lat,'cliff'),gy=Math.abs(lat)>9?Math.max(road.y,groundAt(b.z,lat).y):road.y;
   const v=st?st.v:0,hop=st?Math.abs(Math.sin(st.t*5.5))*.5*Math.min(1,v/1.2):0;
   B.m.position.set(road.x,gy+b.radius*.86+hop,road.z);B.m.quaternion.setFromAxisAngle(B.fw,st?-st.roll*b.side:0);
   if(st&&v>.4){B.dustT-=dt;if(B.dustT<=0){B.dustT=.12;burst(new T.Vector3(road.x,gy+.2,road.z),3,.8)}}}}
 function reset(){for(const F of faults)F.burst=false}
 return {update,reset,group,faults,boulders}}
root.QUAKE_FX={build};if(typeof module!=='undefined')module.exports={build};
})(typeof window!=='undefined'?window:globalThis);
