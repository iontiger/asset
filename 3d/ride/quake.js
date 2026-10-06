/* 지진 구간(3회차부터): 첫 점프 착지 뒤 ~ 갈림길 전. 시뮬레이션은 game-core.js(RIDE_QUAKE), 여기는 그리기만.
   - 솟는 땅(RAMPS): 길 전체가 갈라져 앞쪽이 점점 기울며 솟아오른다. 매 프레임 판의 높이를 다시 계산해(바이크가 올라탈수록 더 기운다)
     윗면 · 양옆 단면(흙 · 돌 지층) · 앞쪽 절벽을 그린다. 끝에서 바이크가 뛰어내린다.
   - 솟는 땅덩이(BLOCKS): 다가가면 먼저 바닥에 금이 가고, 순식간에 솟아올라(살짝 튀었다 자리 잡음) 길 일부를 막는다.
   - 바위(BOULDERS): 산비탈에서 출발해 중력으로 빨라지며 굴러 내려와 길을 가로지른다.
   - 땅 물결(WAVES · 4회차부터 ride.waveOn): 목표봉 고갯길부터 길과 양옆 풀밭이 파도처럼 솟았다 가라앉으며 바이크 쪽으로 밀려온다.
   - 흘러내리는 낙석(5회차부터 ride.slideOn): 목표봉 오르막에서 바위가 굴러 내려오면 뒤로 잔돌이 통통 튀며 따라 흘러내린다(바위 자체는 game.js).
   game.js: QUAKE_FX.build({...}) → update(dt,time). ride.quakeOn · waveOn · slideOn 이 꺼져 있으면 그 부분은 보이지 않는다. */
(function(root){
function build({T,scene,ride,drivePoint,groundAt}){
 const Q=root.RIDE_QUAKE,group=new T.Group();group.visible=false;scene.add(group);
 const crackMat=new T.MeshBasicMaterial({color:'#140e0a',side:T.DoubleSide});
  const plateMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.95,flatShading:true,side:T.DoubleSide});
 const rockMat=new T.MeshStandardMaterial({color:'#7a6f63',roughness:.92,flatShading:true});
 const C=c=>new T.Color(c);
 // 길 위 한 점의 좌표계: +x 오른쪽 · +y 위 · -z 앞(달리는 쪽)
 const frame=s=>{const o=drivePoint(s,0,'cliff'),r=drivePoint(s,1,'cliff').sub(o).normalize(),f=drivePoint(s+20,0,'cliff').sub(o).normalize(),up=new T.Vector3().crossVectors(r,f).normalize();
  const m=new T.Matrix4().makeBasis(r,up,f.clone().negate());return {o,q:new T.Quaternion().setFromRotationMatrix(m)}};
 // 지그재그 틈(띠): 가로 -W..W, 가운데가 가장 넓다
 function crackGeo(seed,W,width,ang){const pts=[],n=26;for(let i=0;i<=n;i++){const x=-W+2*W*i/n,z=x*ang+Math.sin(i*2.7+seed)*1.1+Math.sin(i*5.3+seed*2)*.45,w=width*(.35+.65*Math.sin(Math.PI*i/n));pts.push([x,z,w])}
  const v=[],idx=[];pts.forEach(([x,z,w],i)=>{v.push(x,.07,z-w/2,x,.07,z+w/2);if(i<n){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}});
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();return g}
 // 길을 따라가는 틈(솟는 땅 양옆): lateral 에서 s0..s1
 function sideCrack(s0,s1,lat,w,seed){const v=[],idx=[],n=36;for(let i=0;i<=n;i++){const s=s0+(s1-s0)*i/n,j=Math.sin(i*2.3+seed)*.35,a=drivePoint(s,lat-w/2+j,'cliff'),b=drivePoint(s,lat+w/2+j,'cliff');v.push(a.x,a.y+.07,a.z,b.x,b.y+.07,b.z);if(i<n){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2)}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);return new T.Mesh(g,crackMat)}

 // ── 솟는 땅: 윗면(COLS 열) · 왼쪽/오른쪽 단면(LV 층) · 앞 절벽(COLS×LV)
 const N=44,COLS=6,LV=4,W=10.6,STRATA=[C('#7b6a3e'),C('#8c6545'),C('#694832'),C('#3b291d')],SAND=C('#cdb08a'),SAND2=C('#b89a72'),CRACK=C('#3a2a1e');
 const ramps=Q.RAMPS.map(R=>{const g=new T.Group();group.add(g);
  const base=[],ss=[];for(let i=0;i<=N;i++){const s=R.z0+R.len*i/N;ss.push(s);const row=[];for(let c=0;c<COLS;c++)row.push(drivePoint(s,-W+2*W*c/(COLS-1),'cliff'));base.push(row)}
  const pos=[],col=[],idx=[],ref=[];   // ref: [i,c,level] 꼭짓점마다 어느 점 · 몇 번째 층인지
  const add=(i,c,k,color)=>{pos.push(0,0,0);col.push(color.r,color.g,color.b);ref.push([i,c,k]);return ref.length-1};
  // 윗면: 몇 줄마다 금(어두운 줄)이 간다
  const top=[];for(let i=0;i<=N;i++){top.push([]);const crackRow=i>2&&i%7===3;for(let c=0;c<COLS;c++)top[i].push(add(i,c,0,crackRow&&c>0&&c<COLS-1?CRACK:(i+c)%3?SAND:SAND2))}
  for(let i=0;i<N;i++)for(let c=0;c<COLS-1;c++){const a=top[i][c],b=top[i][c+1],d=top[i+1][c],e=top[i+1][c+1];idx.push(a,d,b,b,d,e)}
  for(const [c,flip] of [[0,false],[COLS-1,true]]){const wall=[];for(let i=0;i<=N;i++){wall.push([]);for(let k=0;k<LV;k++)wall[i].push(add(i,c,k,STRATA[k]))}
   for(let i=0;i<N;i++)for(let k=0;k<LV-1;k++){const a=wall[i][k],b=wall[i][k+1],d=wall[i+1][k],e=wall[i+1][k+1];flip?idx.push(a,b,d,b,e,d):idx.push(a,d,b,b,d,e)}}
  const front=[];for(let c=0;c<COLS;c++){front.push([]);for(let k=0;k<LV;k++)front[c].push(add(N,c,k,STRATA[k]))}
  for(let c=0;c<COLS-1;c++)for(let k=0;k<LV-1;k++){const a=front[c][k],b=front[c+1][k],d=front[c][k+1],e=front[c+1][k+1];idx.push(a,b,d,b,e,d)}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(col,3));geo.setIndex(idx);
  const mesh=new T.Mesh(geo,plateMat);mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
  // 갈라진 금: 시작(경첩) · 양옆 · 끝 절벽 앞
  const f0=frame(R.z0),hinge=new T.Mesh(crackGeo(R.i*2.1,12,1.3,.02),crackMat);hinge.position.copy(f0.o);hinge.quaternion.copy(f0.q);g.add(hinge);
  const f1=frame(R.z0+R.len+6),foot=new T.Mesh(crackGeo(R.i*3.3+1,12,1.8,-.03),crackMat);foot.position.copy(f1.o);foot.quaternion.copy(f1.q);g.add(foot);
  g.add(sideCrack(R.z0,R.z0+R.len,-W-.4,1.1,R.i),sideCrack(R.z0,R.z0+R.len,W+.4,1.1,R.i+5));
  return {R,g,geo,base,ss,ref,last:-1}});
 function shapeRamp(P,pos){const R=P.R,a=P.geo.attributes.position.array;const lifts=P.ss.map(s=>Q.rampLift(R,s,pos));
  for(let v=0;v<P.ref.length;v++){const [i,c,k]=P.ref[v],b=P.base[i][c],l=lifts[i],j=c>0&&c<COLS-1?Math.sin(i*1.7+c*2.3)*.09*Math.min(1,l):0;
   const y=k===0?l+.06+j:k===1?Math.max(-.4,l-.8):k===2?Math.max(-.4,l*.45-.3):-.4;a[v*3]=b.x;a[v*3+1]=b.y+y;a[v*3+2]=b.z}
  P.geo.attributes.position.needsUpdate=true}

 // ── 솟는 땅덩이: 금(바닥) → 순식간에 솟아오름(살짝 넘쳤다가 자리 잡음)
 const blocks=Q.BLOCKS.map(k=>{const {o,q}=frame(k.z),g=new T.Group();g.position.copy(o);g.quaternion.copy(q);group.add(g);
  const w=(k.x1-k.x0)*9,l=k.len/20,cx=(k.x0+k.x1)/2*9,geo=new T.BoxGeometry(w,k.h,l,3,4,2),p=geo.attributes.position,nr=geo.attributes.normal,cl=[];
  // 윗면은 길 흙빛, 옆면은 위에서 아래로 흙 · 돌 지층(깨진 단면)
  for(let v=0;v<p.count;v++){const y=p.getY(v),top=nr.getY(v)>.5,u=(k.h/2-y)/k.h,c=top?((v+k.i)%3?SAND:SAND2):STRATA[Math.min(3,Math.floor(u*4+.3))];cl.push(c.r,c.g,c.b);if(y>k.h/2-.01)p.setY(v,y+Math.sin(p.getX(v)*1.3+p.getZ(v)*2.1+k.i)*.35)}
  geo.setAttribute('color',new T.Float32BufferAttribute(cl,3));geo.computeVertexNormals();
  const m=new T.Mesh(geo,plateMat);m.castShadow=true;m.receiveShadow=true;m.position.set(cx,-k.h/2-.3,0);g.add(m);
  const shp=new T.Shape(),n=14;for(let j=0;j<n;j++){const a=j/n*Math.PI*2,rx=w/2+.9+Math.sin(j*2.7+k.i)*.45,rz=l/2+.9+Math.cos(j*1.9+k.i)*.4;const x=cx+Math.cos(a)*rx,z=Math.sin(a)*rz;j?shp.lineTo(x,z):shp.moveTo(x,z)}
  const hole=new T.Mesh(new T.ShapeGeometry(shp).rotateX(Math.PI/2),crackMat);hole.position.y=.07;g.add(hole);
  const rays=[0,1,2].map(j=>{const r=new T.Mesh(crackGeo(k.i*1.3+j,3+j,.5,.6-j*.6),crackMat);r.position.set(cx+(j-1)*w*.45,0,(j%2?1:-1)*(l/2+2));r.rotation.y=(j-1)*.7;g.add(r);return r});
  return {k,g,m,hole,rays}});
 const boulders=Q.BOULDERS.map(b=>{const fw=drivePoint(b.z+20,0,'cliff').sub(drivePoint(b.z,0,'cliff')).normalize(),m=new T.Mesh(new T.DodecahedronGeometry(b.radius,1),rockMat);m.scale.set(1,.88,1.05);m.castShadow=true;group.add(m);return {b,m,fw}});
 // ── 땅 물결: 물결마다 길을 따라가는 띠(가운데는 길 흙빛, 양옆은 풀빛). 솟은 만큼만 보이고(투명도) 평평한 곳은 원래 땅이 보인다
 const WLAT=[-40,-30,-22,-16,-12,-10,-9,-5,0,5,9,10,12,16,22,30,40],WROWS=46,ROADC=C('#c4a578'),EDGEC=C('#8f7650'),GRASSC=C('#86a660'),CRESTC=C('#d8bf93');
 const waveMat=new T.MeshStandardMaterial({vertexColors:true,transparent:true,roughness:.95,flatShading:true,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4,side:T.DoubleSide});
 const waveFall=x=>{const a=Math.abs(x);return a<=11?1:Math.max(0,1-(a-11)/29)**1.5};
 const wavePool=[0,1,2].map(()=>{const n=(WROWS+1)*WLAT.length,g=new T.BufferGeometry(),idx=[];g.setAttribute('position',new T.BufferAttribute(new Float32Array(n*3),3));g.setAttribute('color',new T.BufferAttribute(new Float32Array(n*4),4));
  for(let i=0;i<WROWS;i++)for(let c=0;c<WLAT.length-1;c++){const a=i*WLAT.length+c,b=a+1,d=a+WLAT.length,e=d+1;idx.push(a,d,b,b,d,e)}g.setIndex(idx);
  const m=new T.Mesh(g,waveMat);m.frustumCulled=false;m.receiveShadow=true;m.visible=false;scene.add(m);return m});
 function shapeWave(m,st){const W=Q.WAVE,s0=st.sc-W.w-80,s1=st.sc+W.gap+W.w+80,P=m.geometry.attributes.position.array,Cc=m.geometry.attributes.color.array;let v=0;
  for(let i=0;i<=WROWS;i++){const s=s0+(s1-s0)*i/WROWS,l=Q.waveLift(st,s);
   for(const x of WLAT){const b=Math.abs(x)<=10?drivePoint(s,x,'cliff'):groundAt(s,x),f=waveFall(x),y=l*f,a=Math.abs(x);
    P[v*3]=b.x;P[v*3+1]=b.y+.06+y;P[v*3+2]=b.z;
    const c=a<9?(l>st.h*.8?CRESTC:ROADC):a<=10?EDGEC:GRASSC;Cc[v*4]=c.r;Cc[v*4+1]=c.g;Cc[v*4+2]=c.b;Cc[v*4+3]=Math.min(1,y/.45);v++}}
  m.geometry.attributes.position.needsUpdate=true;m.geometry.attributes.color.needsUpdate=true;m.geometry.computeVertexNormals()}
 function updateWaves(){let k=0;if(ride.waveOn)for(const st of ride.waves.values()){if(st.done||k>=wavePool.length)continue;if(Math.abs(st.sc-ride.pos)>3600)continue;const m=wavePool[k++];m.visible=true;shapeWave(m,st)}
  for(;k<wavePool.length;k++)wavePool[k].visible=false}
 // ── 흘러내리는 잔돌: 굴러 내려오는 바위 뒤로 6개씩
 const PEB=6,MAXP=9*PEB,pebbles=new T.InstancedMesh(new T.DodecahedronGeometry(.42,0),rockMat,MAXP);pebbles.frustumCulled=false;pebbles.castShadow=true;scene.add(pebbles);const pd=new T.Object3D();
 function updatePebbles(time){let n=0;if(ride.slideOn)for(const o of ride.items){const sl=ride.slides.get(o.id);if(!sl||n>=MAXP)continue;const oz=o.z-sl.dz;if(oz<ride.pos-150||oz>ride.pos+4000)continue;const run=Math.min(1,sl.dz/120),ox=Q.rockX(o,sl)*9;
   for(let j=0;j<PEB&&n<MAXP;j++,n++){const ps=oz+(o.radius*20)*.9+j*22+Math.sin(j*2.3+o.id)*8,px=ox+Math.sin(j*1.7+o.id)*(1.2+j*.35),p=drivePoint(ps,px,'cliff');
    pd.position.set(p.x,p.y+.3+Math.abs(Math.sin(time*(7+j)+j*1.3))*(.25+j*.1)*Math.min(1,sl.v/120),p.z);pd.rotation.set(time*(3+j)+j,j,time*2);pd.scale.setScalar((.6+(j%3)*.35)*run);pd.updateMatrix();pebbles.setMatrixAt(n,pd.matrix)}}
  pebbles.count=Math.max(0,n);pebbles.visible=n>0;pebbles.instanceMatrix.needsUpdate=true}
 const back=x=>{const c=2.2;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};   // 살짝 넘쳤다가 자리 잡는다
 function update(dt,time){updateWaves();updatePebbles(time);const on=!!ride.quakeOn;group.visible=on;if(!on)return;const pos=ride.pos;
  for(const P of ramps){const R=P.R,near=pos>R.z0-3200&&pos<R.z0+R.len+900;P.g.visible=near;if(!near)continue;
   const key=Math.round(pos);if(key!==P.last){P.last=key;shapeRamp(P,pos)}}
  for(const B of blocks){const k=B.k,d=k.z-pos,near=d<3000&&d>-600;B.g.visible=near;if(!near)continue;
   const st=ride.blocks.get(k.id),crack=Math.max(.02,Math.min(1,(2200-d)/(2200-Q.BLOCK_POP))),up=st?back(Math.min(1,st.t/Q.BLOCK_RISE)):0;
   B.hole.scale.set(crack,1,crack);B.rays.forEach(r=>r.scale.set(1,1,crack));
   const jig=up>0&&up<1.05?Math.sin(time*47+k.i)*.08:0;B.m.position.y=-k.h/2-.3+(k.h+.3)*up+jig;B.m.rotation.set((k.i%2?.06:-.05)*up,0,(k.i%3-1)*.05*up)}
  for(const B of boulders){const b=B.b,st=ride.boulders.get(b.id),d=b.z-pos;B.m.visible=d<3200&&d>-500;if(!B.m.visible)continue;
   const x=st?st.x:b.side*2.35,lat=x*9,road=drivePoint(b.z,lat,'cliff'),gy=Math.abs(lat)>9?Math.max(road.y,groundAt(b.z,lat).y):road.y;
   const v=st?st.v:0,hop=st?Math.abs(Math.sin(st.t*5.5))*.5*Math.min(1,v/1.2):0;
   B.m.position.set(road.x,gy+b.radius*.86+hop,road.z);B.m.quaternion.setFromAxisAngle(B.fw,st?-st.roll*b.side:0)}}
 function reset(){for(const P of ramps)P.last=-1}
 return {update,reset,group,ramps,blocks,boulders,wavePool,pebbles}}
root.QUAKE_FX={build};if(typeof module!=='undefined')module.exports={build};
})(typeof window!=='undefined'?window:globalThis);
