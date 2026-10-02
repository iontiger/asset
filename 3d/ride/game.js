'use strict';
(() => {
const embedded=window.parent!==window,T=THREE,$=id=>document.getElementById(id),canvas=$('game'),ride=new Ride(),keys=new Set(),landmarks=RIDE_LANDMARKS;
let renderer;
try{renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(e){document.querySelector('.welcome h2').textContent='3D 화면을 열 수 없어요.';document.querySelector('.welcome p').textContent='WebGL을 지원하는 브라우저에서 하드웨어 가속을 켜고 다시 열어주세요.';$('start').disabled=true;return;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();scene.background=new T.Color('#b8dbe0');scene.fog=new T.Fog('#cbdcc9',65,230);
const camera=new T.PerspectiveCamera(57,innerWidth/innerHeight,.1,700);
scene.add(new T.HemisphereLight('#fff5dc','#849d70',2.3));
const sun=new T.DirectionalLight('#fff0cf',3.2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-35,right:35,top:40,bottom:-35,near:1,far:300});sun.shadow.bias=-.0003;sun.shadow.normalBias=.035;scene.add(sun,sun.target);
let seed=41;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
const mats=new Map();function mat(c){if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,roughness:.86}));return mats.get(c)}
function mesh(g,c,p,x=0,y=0,z=0){let m=new T.Mesh(g,mat(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;p.add(m);return m}
function box(p,x,y,z,w,h,d,c){return mesh(new T.BoxGeometry(w,h,d),c,p,x,y,z)}
function ball(p,x,y,z,r,c,sx=1,sy=1,sz=1){const m=mesh(new T.SphereGeometry(r,16,12),c,p,x,y,z);m.scale.set(sx,sy,sz);return m}
function cyl(p,x,y,z,rt,rb,h,c,n=16){return mesh(new T.CylinderGeometry(rt,rb,h,n),c,p,x,y,z)}
function beam(p,a,b,r,c){const v=new T.Vector3(...b).sub(new T.Vector3(...a)),m=cyl(p,0,0,0,r,r,v.length(),c,10);m.position.copy(new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m}
function height(s){return ROAD_HEIGHT(s)}
function roadRight(s){const a=ROAD_PATH.yaw(s);return new T.Vector3(Math.cos(a),0,Math.sin(a))}
function point(s,lateral=0){const p=ROAD_PATH.at(s);return new T.Vector3(p.x,height(s),p.z).addScaledVector(roadRight(s),lateral)}
function heading(s){return -ROAD_PATH.yaw(s)}
function drivePoint(s,lateral=0,choice=ride.branchChoice){return point(s,lateral+ADVENTURE.branchOffset(s,choice))}
function driveHeading(s){const a=drivePoint(s-2),b=drivePoint(s+2);return Math.atan2(-(b.x-a.x),-(b.z-a.z))}
// Continuous indexed 3D strips; both the road and the meadow follow the hills.
// Ground height beside the road: rolling meadow, flat canyon floor, 목표봉's slopes and the creek bed.
const F=ADVENTURE.fork,MT=ADVENTURE.mountain,CK=ADVENTURE.creek,sstep=ADVENTURE.sstep;
function groundAt(s,offset){const p=point(s,offset),mm=ADVENTURE.mountainMask(s),inFork=s>F.start-1000&&s<F.end+400,cx=ADVENTURE.creekX(s),mf=ADVENTURE.mountainField(p.x,p.z);
 if(mf>0||mm>0){const c=ROAD_PATH.at(s);p.y+=mf-ADVENTURE.mountainField(c.x,c.z)}
 let wave=Math.abs(offset)>12&&!inFork?Math.sin(s/650+offset*.04)*Math.min(9,(Math.abs(offset)-12)*.14)*(1-mm):0;
 if(cx!==null){const d=Math.abs(offset-cx);wave*=sstep(6,16,d);if(d<7)p.y-=1.5*(1-(d/7)**2)}
 p.y+=wave;return p}
function strip(halfWidth,color,yOffset=0,terrain=false){const verts=[],colors=[],indices=[],c=new T.Color(),steps=Math.ceil((ride.length+2200)/9),cols=terrain?24:2;
for(let i=0;i<=steps;i++){const s=-600+i*(ride.length+2200)/steps;for(let j=0;j<=cols;j++){const offset=(j/cols*2-1)*(terrain&&s>ADVENTURE.fork.start-200&&s<ADVENTURE.fork.end+200?55:halfWidth),p=terrain?groundAt(s,offset):point(s,offset+ADVENTURE.branchOffset(s,'safe'));p.y+=yOffset;if(terrain&&s>F.start-1400&&s<F.end+800&&Math.abs(offset)>9&&folded(p,s,Math.abs(offset)-1))p.y-=7;if(terrain&&Math.abs(offset)>14&&ADVENTURE.mountainField(p.x,p.z)>.5)p.y-=4;verts.push(p.x,p.y,p.z);c.set(terrain?ADVENTURE.biome(s).ground:halfWidth<9.5?ADVENTURE.biome(s).road:color);c.multiplyScalar(.94+.06*Math.sin(i*1.83+j*2.1));colors.push(c.r,c.g,c.b);if(i<steps&&j<cols){const a=i*(cols+1)+j;indices.push(a,a+cols+1,a+1,a+1,a+cols+1,a+cols+2)}}}
const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();const m=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}));m.receiveShadow=true;scene.add(m);return m;}
// Inside the hairpins the wide meadow folds over the other leg (at a different height) — sink the folded part under the ground that belongs there.
const foldRoads=[];for(let s=-600;s<=ride.length+600;s+=40)for(const ch of ['safe','cliff']){if(ch==='cliff'&&!(s>ADVENTURE.fork.start&&s<ADVENTURE.fork.end))continue;const p=drivePoint(s,0,ch);foldRoads.push(p.x,p.z,s)}
function folded(p,s,r){const r2=r*r;for(let i=0;i<foldRoads.length;i+=3){if(Math.abs(foldRoads[i+2]-s)<600)continue;const dx=foldRoads[i]-p.x,dz=foldRoads[i+1]-p.z;if(dx*dx+dz*dz<r2)return true}return false}
strip(30,'#91ad69',-.12,true);strip(9.65,'#b7b58b',-.025);strip(9,'#caa778');
// Two distinct drivable branches: the village detour is physically longer.
{const vertices=[],indices=[],uvs=[];for(let i=0;i<=360;i++){const s=ADVENTURE.fork.start+(ADVENTURE.fork.end-ADVENTURE.fork.start)*i/360;for(const side of [-1,1]){const p=drivePoint(s,side*9.3,'cliff');vertices.push(p.x,p.y+.012,p.z);uvs.push((side+1)/2,s/300)}if(i<360){let a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3)}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();const road=new T.Mesh(g,new T.MeshStandardMaterial({map:CANYON.roadTexture(T),side:T.DoubleSide,roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));road.receiveShadow=true;scene.add(road);}

// Raised, irregular stone paving follows the exact hill profile.
const paving=[];for(const [a,b] of ROAD_COBBLES)for(let s=a;s<b;s+=16)for(const choice of (s>ADVENTURE.fork.start&&s<ADVENTURE.fork.end?['safe','cliff']:['safe']))for(let col=0;col<12;col++)paving.push({s:s+(col%2)*7,x:-8.2+col*1.48,choice});
const stones=new T.InstancedMesh(new T.BoxGeometry(1.36,.13,.69),mat('#979c8e'),paving.length),stoneDummy=new T.Object3D();
paving.forEach((v,i)=>{stoneDummy.position.copy(drivePoint(v.s,v.x,v.choice));stoneDummy.position.y+=.065;stoneDummy.rotation.set(Math.atan((height(v.s+5)-height(v.s-5))/.5),heading(v.s),0);stoneDummy.scale.set(1,.7+(i%4)*.13,1);stoneDummy.updateMatrix();stones.setMatrixAt(i,stoneDummy.matrix);stones.setColorAt(i,new T.Color(['#929887','#b1ad99','#a09f91','#bdb7a3'][i%4]));});stones.receiveShadow=true;scene.add(stones);
// The tire tracks and scattered pale stones give the road texture without a flat background.
const detailGeo=new T.IcosahedronGeometry(1,0),detail=new T.InstancedMesh(detailGeo,mat('#c3b493'),1200),dummy=new T.Object3D();
for(let i=0;i<1200;i++){const s=rand()*ride.length,p=drivePoint(s,(rand()*2-1)*8.7,'safe');dummy.position.copy(p);dummy.position.y+=.015;dummy.scale.set(.04+rand()*.09,.018,.07+rand()*.13);dummy.rotation.set(0,rand()*6.28,0);dummy.updateMatrix();detail.setMatrixAt(i,dummy.matrix)}detail.receiveShadow=true;scene.add(detail);
// Instanced trees: many real 3D crowns with only a handful of draw calls.
const treeData=[];for(let s=150;s<ride.length+1800;s+=85)for(const side of [-1,1]){
 if(s>F.start-1500&&s<F.end+1000)continue;const lat=side*(12+rand()*17);if(landmarks.some(l=>Math.abs(l.z-s)<200&&Math.sign(l.x)===side))continue;
 const p=groundAt(s,lat);{const cx=ADVENTURE.creekX(s);if(cx!==null&&Math.abs(lat-cx)<7)continue}if(ADVENTURE.mountainField(p.x,p.z)>.5)continue;
 treeData.push({p,scale:.8+rand()*.85,pink:rand()>.35});}
function instanceTrees(kind,color,geo,offset,scale){const list=treeData.filter(d=>kind==='all'||d.pink===(kind==='pink'));const m=new T.InstancedMesh(geo,mat(color),list.length);list.forEach((d,i)=>{dummy.position.copy(d.p).add(new T.Vector3(...offset).multiplyScalar(d.scale));dummy.scale.set(...scale).multiplyScalar(d.scale);dummy.rotation.set(0,i*1.4,0);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix)});m.castShadow=true;m.receiveShadow=true;scene.add(m)}
instanceTrees('all','#8d7353',new T.CylinderGeometry(.16,.24,2.5,7),[0,1.25,0],[1,1,1]);
for(const [kind,colors] of [['pink',['#e4a9bb','#efbfcd','#d69ead']],['green',['#8bad64','#a2bd78','#739557']]])for(let i=0;i<3;i++)instanceTrees(kind,colors[i],new T.IcosahedronGeometry(1.5,1),[[0,3.1,0],[-.85,3.6,.2],[.85,2.85,0]][i],[1,i===1?.95:1.1,1]);
// Real mesh buildings are distance-culled, never converted to billboard images.
const worldObjects=[],labels=[];
const templates={};for(const name of VillageModels.names)templates[name]=VillageModels.create(name);
function placeModel(name,s,lat,scale=1){const root=templates[name].clone(true);root.position.copy(groundAt(s,lat));root.rotation.y=heading(s)+(lat<0?Math.PI*.4:-Math.PI*.4);root.scale.setScalar(scale);scene.add(root);worldObjects.push({root,s});return root}
for(let s=450,i=0;s<ride.length;s+=330,i++){const side=i%2?1:-1;if(landmarks.some(l=>Math.abs(l.z-s)<260)||s>F.start-1500&&s<F.end+1000||ADVENTURE.mountainMask(s)>0||s>CK.start-1500&&s<CK.end+1500)continue;placeModel(['cottage','rosehouse','shop'][i%3],s,side*(16+rand()*5),.8+rand()*.25)}
landmarks.forEach((l,i)=>{const root=placeModel(l.model,l.z,l.x*9+ADVENTURE.branchOffset(l.z,l.x>0?'cliff':'safe'),l.scale);const e=document.createElement('div');e.className='place-label';e.textContent=l.name;$('world-labels').appendChild(e);const box=new T.Box3().setFromObject(root);labels.push({e,s:l.z,index:i,position:new T.Vector3(root.position.x,box.max.y+1.2,root.position.z)})});
for(const s of [8800,46500,90000]){let root=placeModel('balloon',s,35,1.7);root.position.y+=20;root.userData.balloon=true;root.userData.baseY=root.position.y}
// Region-specific scenery, kept clear of every road segment.
const routeSamples=Array.from({length:Math.floor(ride.length/100)+1},(_,i)=>point(i*100));
function clearOfRoad(p,r=18){return routeSamples.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>r)}
// Canyon branch (default route): CANYON EXPRESS sandstone walls, ledges, pines and signs — see canyon.js.
const canyon=CANYON.build({T,scene,drivePoint,ride,fork:ADVENTURE.fork,landmarks,turns:ROAD_PATH.turns});
// 목표봉 (up and over) and the creek with its three fords — see mountain-creek.js.
const mc=MOUNTAIN_CREEK.build({T,scene,point,height,heading,groundAt,ride});
for(let s=82000;s<96000;s+=180){const p=point(s,40);if(!clearOfRoad(p,27))continue;const water=new T.Mesh(new T.PlaneGeometry(40,10),new T.MeshStandardMaterial({color:'#6aafb9',roughness:.3,metalness:.15,side:T.DoubleSide}));water.rotation.set(-Math.PI/2,0,heading(s));water.position.copy(p);water.position.y-=2;scene.add(water);for(let j=0;j<3;j++){const foam=box(scene,p.x+j*5,p.y-1.97,p.z,3,.025,.08,'#dce9d8');foam.rotation.y=heading(s)}}
for(let s=ADVENTURE.fork.start+300;s<ADVENTURE.fork.end-300;s+=480){placeModel('cottage',s,ADVENTURE.branchOffset(s,'safe')-15,.75)}
// Chevron road warnings before both hairpins.
for(const turn of ROAD_PATH.turns)for(let s=turn.start-360;s<turn.start;s+=65){const root=new T.Group();root.position.copy(drivePoint(s,0,'cliff'));root.rotation.y=heading(s);for(const sign of [-1,1]){const dash=box(root,sign*.6,.025,0,.14,.03,1.6,'#e2c77f');dash.rotation.y=sign*.7}scene.add(root)}
// Individual grass blades sway and bend away from nearby tires.
const grassList=[];for(let s=100;s<ride.length;s+=35)for(const side of [-1,1]){if(s>F.start-500&&s<F.end+500)continue;{const cx=ADVENTURE.creekX(s);if(cx!==null&&Math.abs(side*10.5-cx)<5)continue}grassList.push({s,side,p:drivePoint(s,side*(9.8+rand()*1.5),'safe')})}
const grass=new T.InstancedMesh(new T.PlaneGeometry(.22,.65),new T.MeshStandardMaterial({color:'#75915b',side:T.DoubleSide}),grassList.length);grass.frustumCulled=false;scene.add(grass);
let lastTrack=-100,trackCursor=0;const trackDummy=new T.Object3D(),tracks=new T.InstancedMesh(new T.PlaneGeometry(.22,.65),new T.MeshBasicMaterial({color:'#6c5540',transparent:true,opacity:.22,depthWrite:false,side:T.DoubleSide}),900);tracks.frustumCulled=false;scene.add(tracks);trackDummy.scale.setScalar(0);trackDummy.updateMatrix();for(let i=0;i<900;i++)tracks.setMatrixAt(i,trackDummy.matrix);
function updateGroundFX(dt){if(ride.mode==='playing'&&ride.airY<.1&&Math.abs(ride.pos-lastTrack)>7){lastTrack=ride.pos;trackDummy.position.copy(drivePoint(ride.pos-18,ride.player*9));trackDummy.position.y+=.025;trackDummy.rotation.set(-Math.PI/2,0,driveHeading(ride.pos));trackDummy.scale.setScalar(1);trackDummy.updateMatrix();tracks.setMatrixAt(trackCursor++%900,trackDummy.matrix);tracks.instanceMatrix.needsUpdate=true;}
 grassList.forEach((g,i)=>{const near=Math.max(0,1-bike.position.distanceTo(g.p)/3);dummy.position.copy(g.p);dummy.position.y+=.28;dummy.scale.setScalar(1);dummy.rotation.set(0,heading(g.s),Math.sin(time*2+i)*.12+g.side*near*.8);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix)});grass.instanceMatrix.needsUpdate=true;}
// A proper destination at the end of the route.
const postOffice=placeModel('rosehouse',ride.length+130,15,1.3);postOffice.rotation.y=-.6;
const finishArch=new T.Group();finishArch.position.copy(point(ride.length));finishArch.rotation.y=heading(ride.length);scene.add(finishArch);for(const x of [-8.5,8.5])cyl(finishArch,x,3.1,0,.18,.25,6.2,'#8e7754');beam(finishArch,[-8.5,6.2,0],[8.5,6.2,0],.16,'#8e7754');
for(let i=0;i<16;i++){const sh=new T.Shape();sh.moveTo(-.4,0);sh.lineTo(.4,0);sh.lineTo(0,-.8);sh.closePath();const flag=mesh(new T.ShapeGeometry(sh),i%2?'#e5ae72':'#71998a',finishArch,-7.5+i,6.1,0);flag.material=new T.MeshStandardMaterial({color:i%2?'#e5ae72':'#71998a',side:T.DoubleSide})}
// Ground and soft clouds share the 3D scene. Cone mountains were removed because the returning road could intersect them.
const bb=(()=>{let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(let s=0;s<=ride.length;s+=500){const q=ROAD_PATH.at(s);x0=Math.min(x0,q.x);x1=Math.max(x1,q.x);z0=Math.min(z0,q.z);z1=Math.max(z1,q.z)}return {x:(x0+x1)/2,z:(z0+z1)/2,w:x1-x0,d:z1-z0,z0,z1}})();
const sea=mesh(new T.PlaneGeometry(bb.w+4000,bb.d+4000),'#829a68',scene,bb.x,-12,bb.z);sea.rotation.x=-Math.PI/2;sea.castShadow=false;
const cloudGeo=new T.SphereGeometry(1,10,8),cloudMat=new T.MeshBasicMaterial({color:'#fff1db',fog:true});for(let i=0;i<110;i++){const g=new T.Group();g.position.set(bb.x+(rand()-.5)*(bb.w+600),70+rand()*40,bb.z1+80-rand()*(bb.d+600));for(let j=0;j<4;j++){const m=new T.Mesh(cloudGeo,cloudMat);m.scale.set(6+j,3+j*.5,4);m.position.set(j*6,Math.sin(j*2)*2,0);g.add(m)}scene.add(g)}
// Boy in a safari hat on a cherry-red scooter. Every part is a 3D mesh.
const bike=new T.Group();scene.add(bike);const lean=new T.Group();bike.add(lean);const wheels=[];
for(const z of [-.85,.9]){let wheel=new T.Group();wheel.position.set(0,.5,z);lean.add(wheel);const tire=mesh(new T.TorusGeometry(.38,.14,10,24),'#373b37',wheel);tire.rotation.y=Math.PI/2;const rim=cyl(wheel,0,0,0,.26,.26,.3,'#b3bcb5');rim.rotation.z=Math.PI/2;for(let i=0;i<8;i++){const a=i/8*Math.PI*2;beam(wheel,[0,0,0],[0,Math.sin(a)*.29,Math.cos(a)*.29],.022,'#d5d9ce')}wheels.push(wheel)}
ball(lean,0,.75,.4,.7,'#b85648',.65,.7,1.25);ball(lean,0,1.1,-.7,.75,'#c7614d',.7,1.2,.35);box(lean,0,.7,-.15,.72,.14,1.4,'#e6cead');ball(lean,0,1.3,.4,.55,'#665448',.8,.23,1.4);
beam(lean,[0,.65,-.85],[0,1.7,-.65],.08,'#c1c9c0');beam(lean,[-.65,1.7,-.6],[.65,1.7,-.6],.06,'#c1c9c0');for(const x of [-.65,.65]){beam(lean,[x,1.7,-.6],[x*1.1,2.15,-.62],.024,'#a9bdb5');ball(lean,x*1.1,2.17,-.62,.16,'#d9e8de',1,1,.3)}
ball(lean,0,1.35,-.93,.22,'#fff1c3',1,.8,.3);ball(lean,0,.93,1.01,.2,'#fa7454',1,.75,.3);beam(lean,[.5,.4,.15],[.5,.4,1.15],.09,'#b8bcb0');box(lean,0,1.27,.95,.75,.13,.45,'#b6bdb0');box(lean,0,1.5,.98,.68,.42,.33,'#ab7a4c');for(const x of [-.22,.22])box(lean,x,1.5,1.16,.07,.43,.03,'#e1c698');
const riderRig=new T.Group();lean.add(riderRig);
ball(riderRig,0,1.95,.07,.51,'#6293b0',.9,1.15,.7);ball(riderRig,0,2.72,-.03,.47,'#f0c79b',1,1,1);ball(riderRig,0,2.89,.09,.46,'#69503a',1,.8,.95);
const normalArms={};
for(const x of [-1,1]){normalArms[x]=[];normalArms[x].push(beam(riderRig,[x*.3,2.17,-.02],[x*.54,1.88,-.36],.16,'#6293b0'));normalArms[x].push(beam(riderRig,[x*.54,1.88,-.36],[x*.62,1.73,-.59],.115,'#f0c79b'));normalArms[x].push(ball(riderRig,x*.62,1.73,-.59,.13,'#f0c79b'));beam(riderRig,[x*.28,1.55,.3],[x*.4,1.04,-.1],.16,'#c6b78a');ball(riderRig,x*.4,.88,-.08,.23,'#735947',.7,.6,1.4);ball(riderRig,x*.46,2.68,0,.12,'#e6b889')}
ball(riderRig,0,2.99,0,.79,'#dcc690',1,.12,.9);ball(riderRig,0,3.16,0,.54,'#e5ce98',1,.62,.92);cyl(riderRig,0,3.06,0,.5,.51,.13,'#91734e');
ball(riderRig,0,1.98,.51,.39,'#6d9fb5',.86,1.1,.4);box(riderRig,0,1.92,.67,.4,.3,.08,'#87aec0');for(const x of [-.28,.28])beam(riderRig,[x,2.35,.2],[x,1.7,.41],.045,'#dfbd68');
// World-space reaching arm keeps the glove planted on the actual road surface.
const slideArm=new T.Group();scene.add(slideArm);slideArm.visible=false;
const upperSlide=mesh(new T.CylinderGeometry(.16,.16,1,10),'#6293b0',slideArm);
const lowerSlide=mesh(new T.CylinderGeometry(.115,.115,1,10),'#f0c79b',slideArm);
const slideGlove=ball(slideArm,0,0,0,.19,'#6e5740',1,.5,1.3);
function fitArm(m,a,b){const v=b.clone().sub(a);m.position.copy(a).add(b).multiplyScalar(.5);m.scale.y=v.length();m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize())}
const sparksData=new Float32Array(28*3),sparksGeo=new T.BufferGeometry();sparksGeo.setAttribute('position',new T.BufferAttribute(sparksData,3));
const sparks=new T.Points(sparksGeo,new T.PointsMaterial({color:'#ffd17c',size:.08,transparent:true,opacity:.9,depthWrite:false}));sparks.frustumCulled=false;scene.add(sparks);
let turnBlend=0;const warnedTurns=new Set();
for(const turn of ROAD_PATH.turns){const warning=new T.Group();warning.position.copy(drivePoint(turn.start-230,12.5,'cliff'));warning.rotation.y=heading(turn.start-230);scene.add(warning);cyl(warning,0,1.5,0,.08,.1,3,'#766149');
 const cv=document.createElement('canvas');cv.width=256;cv.height=192;const c=cv.getContext('2d');c.fillStyle='#e5ad4f';c.fillRect(0,0,256,192);c.fillStyle='#3d4839';c.font='bold 64px sans-serif';c.textAlign='center';c.fillText('170°',128,85);c.font='bold 32px sans-serif';c.fillText(turn.side>0?'HAIRPIN ↱':'HAIRPIN ↰',128,143);const texture=new T.CanvasTexture(cv);texture.colorSpace=T.SRGBColorSpace;const sign=new T.Mesh(new T.PlaneGeometry(2.6,1.95),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}));sign.position.y=3;warning.add(sign);
 for(let s=turn.start;s<=turn.end;s+=100){for(const side of [-1,1]){const gp=point(s,ADVENTURE.branchOffset(s,'safe')).distanceTo(point(s,ADVENTURE.branchOffset(s,'cliff')));if(side<0&&gp>.5&&gp<20)continue;const post=drivePoint(s,side*9.6,'cliff');const peg=cyl(scene,post.x,post.y+.5,post.z,.1,.1,1,'#b68e54',8);}}
}
// Collectible envelopes and solid road obstacles use the same coordinates as collision tests.
const itemMeshes=[];
for(const item of ride.items){let root=new T.Group();root.position.copy(drivePoint(item.z,item.x*9));scene.add(root);
 if(item.type==='letter'){box(root,0,1.2,0,.8,.52,.12,'#fff2cd');beam(root,[-.38,1.42,.08],[0,1.15,.08],.014,'#b98a58');beam(root,[0,1.15,.08],[.38,1.42,.08],.014,'#b98a58');ball(root,0,1.14,.095,.065,'#c47052');const halo=mesh(new T.TorusGeometry(.62,.024,6,32),'#e9c977',root,0,1.2,0);halo.material=new T.MeshBasicMaterial({color:'#f6d486'});
 }else{const inC=item.z>ADVENTURE.fork.start&&item.z<ADVENTURE.fork.end;const r=mesh(new T.DodecahedronGeometry(item.radius,1),inC?'#c08a5c':'#777466',root,0,item.radius*.7,0);if(inC)r.material=new T.MeshStandardMaterial({color:'#c08a5c',roughness:.9,flatShading:true});r.scale.set(1,.85,1);r.rotation.set(.15,item.id,.17);
   for(let j=0;j<5;j++){const a=j*2.4;const chip=mesh(new T.DodecahedronGeometry(.2+j*.045,0),inC?'#d4a272':'#948570',root,Math.cos(a)*(item.radius+1),.15,Math.sin(a)*(item.radius+.7));chip.scale.y=.6}
   const warn=mesh(new T.RingGeometry(item.radius+.6,item.radius+.72,36), '#d18f43',root,0,.04,0);warn.rotation.x=-Math.PI/2;warn.material=new T.MeshBasicMaterial({color:'#e3ac55',transparent:true,opacity:.6,side:T.DoubleSide});root.userData.warning=warn;
 }itemMeshes.push({item,root,baseY:root.position.y});}
// Recycled instanced dust puffs: dirt trails, grass smoke and rock-impact bursts.
const dustPool=Array.from({length:240},()=>({life:0,max:1,p:new T.Vector3(),v:new T.Vector3(),size:1}));let dustCursor=0,dustBudget=0,lastDustPos=0;
const dust=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),new T.MeshStandardMaterial({color:'#bea079',roughness:1,transparent:true,opacity:.26,depthWrite:false}),dustPool.length);dust.frustumCulled=false;scene.add(dust);
function burst(p,count,force=1,grass=false){for(let i=0;i<count;i++){const d=dustPool[dustCursor++%dustPool.length];d.life=d.max=.6+rand()*1.2;d.p.copy(p).add(new T.Vector3((rand()-.5)*1.5,.2,(rand()-.5)*1.5));d.v.set((rand()-.5)*force*7,1+rand()*force*3,(rand()-.5)*force*7);d.size=(.12+rand()*.25)*(.6+force*.4);d.grass=grass;}}
function updateDust(dt){const active=ride.mode==='playing',traveled=Math.min(2,Math.abs(ride.pos-lastDustPos)/20);lastDustPos=ride.pos;if(active&&!ride.crashing&&ride.speed>18&&ride.airY<.4){dustBudget+=traveled*(1.2+ride.speed*.002)*(ride.surface==='stone'?.22:1);const count=Math.floor(dustBudget);dustBudget-=count;const rear=drivePoint(ride.pos-19,ride.player*9);burst(rear,count,.3+ride.speed/600,Math.abs(ride.player)>.9)}
 dustPool.forEach((d,i)=>{if(active&&d.life>0){d.life-=dt;d.p.addScaledVector(d.v,dt);d.v.multiplyScalar(Math.exp(-dt*1.4));d.v.y+=dt*.45}const t=Math.max(0,d.life/d.max),size=t>0?d.size*(1-t)*4+ d.size*.4:0;dummy.position.copy(d.p);dummy.scale.setScalar(size*Math.min(1,t*4));dummy.rotation.set(0,i,0);dummy.updateMatrix();dust.setMatrixAt(i,dummy.matrix);dust.setColorAt(i,new T.Color(d.grass==='mud'?(i%2?'#7b6446':'#8f7a58'):d.grass?'#929579':i%3?'#c6aa80':'#aa8b66'))});dust.instanceMatrix.needsUpdate=true;if(dust.instanceColor)dust.instanceColor.needsUpdate=true;
}
// Drifting petals close to the rider, with a fixed reusable buffer.
const petalPositions=new Float32Array(180*3),petalGeo=new T.BufferGeometry();petalGeo.setAttribute('position',new T.BufferAttribute(petalPositions,3));const petals=new T.Points(petalGeo,new T.PointsMaterial({color:'#f5c5cb',size:.13,transparent:true,opacity:.8}));scene.add(petals);
// Camera-space peripheral wind streaks; the road and rider stay unobscured.
const windData=new Float32Array(64*6),windGeo=new T.BufferGeometry();windGeo.setAttribute('position',new T.BufferAttribute(windData,3));
const windMat=new T.LineBasicMaterial({color:'#fff4db',transparent:true,opacity:0,depthTest:false,depthWrite:false});
const wind=new T.LineSegments(windGeo,windMat);wind.frustumCulled=false;wind.renderOrder=10;camera.add(wind);scene.add(camera);
let windTravel=0;let jumpCameraBlend=0;
const sound=new RideSound();
// Muddy creek water on the camera lens (2D overlay between the 3D view and the HUD).
const mud=new MudScreen($('mud'));let mudT=0;let time=0,toastTime=0;
let bestScore=0,bestTime=null;try{const saved=JSON.parse(localStorage.getItem('dentphoto-record-v1')||'{}');bestScore=Number(saved.score)||0;bestTime=Number(saved.time)||null}catch(e){}
$('safe-route').onclick=()=>{if(ride.chooseBranch('safe'))notify('마을길 선택 · 낙석 없는 우회로')};$('cliff-route').onclick=()=>{if(ride.chooseBranch('cliff'))notify('협곡 헤어핀 선택 · 250km/h, 낙석을 조심하세요.')};
const landingRing=new T.Mesh(new T.RingGeometry(1.3,1.6,48),new T.MeshBasicMaterial({color:'#f1d886',transparent:true,opacity:.65,side:T.DoubleSide,depthWrite:false}));landingRing.rotation.x=-Math.PI/2;landingRing.visible=false;scene.add(landingRing);

function notify(text){$('toast').textContent=text;toastTime=2.6;$('toast').style.opacity=1}
function soundTone(freq){sound.chime(freq)}
function show(title,description,button){$('overlay').classList.remove('hidden');document.querySelector('.welcome h2').innerHTML=title;document.querySelector('.welcome p').innerHTML=description;$('start').innerHTML=button+' <span>↗</span>'}
function start(){const fresh=ride.mode!=='paused';ride.start();if(fresh){mud.clear();mudT=0;dustPool.forEach(d=>d.life=0);dustBudget=0;lastDustPos=0;warnedTurns.clear();turnBlend=0;jumpCameraBlend=0;lastTrack=-100;trackDummy.scale.setScalar(0);trackDummy.updateMatrix();for(let i=0;i<900;i++)tracks.setMatrixAt(i,trackDummy.matrix);tracks.instanceMatrix.needsUpdate=true;}keys.clear();$('overlay').classList.add('hidden');$('pause').textContent='Ⅱ';notify('↑ 또는 W로 출발! 3D 마을에서 편지 12통을 모아보세요.');syncCamera(true)}
function pause(){if(ride.mode==='playing'){ride.pause();keys.clear();show('잠시, 쉬어가요.','마을의 바람은 기다려 줄 거예요.','이어서 달리기');$('pause').textContent='▶';sound.silence()}else if(ride.mode==='paused')start()}
function finish(){keys.clear();sound.silence();if(embedded)try{parent.postMessage({dpRide:'finish',letters:ride.letters,score:ride.score,time:ride.elapsed,branch:ride.branchChoice},'*')}catch(e){}const isRecord=ride.score>bestScore;bestScore=Math.max(bestScore,ride.score);bestTime=bestTime===null?ride.elapsed:Math.min(bestTime,ride.elapsed);try{localStorage.setItem('dentphoto-record-v1',JSON.stringify({score:bestScore,time:bestTime}))}catch(e){}
show(isRecord?'새로운 최고 기록!':'마을에 도착했어요.',`${ride.score.toLocaleString()}점 · 최고 ${bestScore.toLocaleString()}점<br>편지 ${ride.letters}통 · 아슬아슬 회피 ${ride.nearMisses}회<br>${Math.floor(ride.elapsed/60)}분 ${Math.floor(ride.elapsed%60)}초 · 최단 ${Math.floor(bestTime/60)}분 ${Math.floor(bestTime%60)}초<br>${ride.branchChoice==='cliff'?'협곡 헤어핀':'마을 우회로'}로 달렸어요.`,'다시 여행하기')}
$('start').addEventListener('click',start);$('pause').addEventListener('click',pause);
// Opened from the DentPhoto village post office (iframe): ⌂ returns to the village.
const goHome=()=>{keys.clear();sound.silence();if(ride.mode==='playing')ride.pause();try{parent.postMessage({dpRide:'close'},'*')}catch(e){}};if(embedded){for(const id of ['home','home2']){$(id).hidden=false;$(id).addEventListener('click',goHome)}}
$('sound').addEventListener('click',async()=>{try{const muted=await sound.toggle();$('sound').textContent=muted?'♫':'♪';$('sound').setAttribute('aria-label',muted?'소리 켜기':'소리 끄기');notify(muted?'소리를 껐어요.':'엔진 · 바람 · 노면 효과음을 켰어요.')}catch(e){notify('이 브라우저에서 소리를 시작하지 못했어요.')}});
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if((k==='p'||k==='escape')&&!e.repeat)pause();else if(k==='enter'&&ride.mode!=='playing')start();else keys.add(k)});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>{keys.clear();if(ride.mode==='playing')pause()});
document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key)});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>keys.delete(b.dataset.key))});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();ride.pause();keys.clear();show('3D 화면이 잠시 멈췄어요.','다시 불러오면 여행을 새로 시작할 수 있어요.','새로 불러오기');$('start').onclick=()=>location.reload()});
const look=new T.Vector3(),cameraGoal=new T.Vector3(),projected=new T.Vector3();
function syncCamera(snap=false,dt=.016){const p=drivePoint(ride.pos,ride.player*9);bike.position.copy(p);bike.position.y+=ride.airY;bike.rotation.y=driveHeading(ride.pos);bike.rotation.x=Math.atan((height(ride.pos+10)-height(ride.pos-10))/.999);lean.rotation.z=-ride.steer*.16;const stoneShake=ride.surface==='stone'&&ride.mode==='playing'&&ride.airY<.1?Math.min(1,ride.speed/220):0;lean.position.y=Math.sin(time*16)*ride.speed*.00005+Math.sin(time*86)*stoneShake*.055;
 if(ride.crashing){lean.rotation.x=-ride.crashAge*3.7;lean.rotation.z=Math.sin(ride.crashAge*3)*.9;riderRig.position.set(Math.sin(ride.crashAge*4)*.6,Math.sin(Math.min(1,ride.crashAge/1.5)*Math.PI)*2.2,.6);riderRig.rotation.z=ride.crashAge*2.2;}
 else{lean.rotation.x=ride.jumping?Math.max(-.35,Math.min(.3,-ride.airV*.025)):-ride.airY*.08;riderRig.position.set(0,0,0);riderRig.rotation.set(0,0,0);}

 const desiredTurn=!ride.crashing&&!ride.jumping&&ride.airY<.1&&ride.drifting?ROAD_PATH.pose(ride.pos):0;
 turnBlend+=(desiredTurn-turnBlend)*(snap?1:1-Math.exp(-dt*9));if(ride.crashing||ride.jumping||ride.airY>.1)turnBlend=0;
 if(Math.abs(turnBlend)>.01){lean.rotation.z=-turnBlend*1.02-ride.steer*.07;lean.position.y-=Math.abs(turnBlend)*.08;riderRig.position.x=turnBlend*.17;riderRig.rotation.z=-turnBlend*.15;}
 const handSide=turnBlend>=0?1:-1,handDown=Math.abs(turnBlend)>.32;
 for(const side of [-1,1])normalArms[side].forEach(m=>m.visible=!(handDown&&side===handSide));
 slideArm.visible=handDown;sparks.visible=handDown&&ride.mode==='playing';
 if(handDown){bike.updateMatrixWorld(true);const shoulder=riderRig.localToWorld(new T.Vector3(handSide*.3,2.17,-.02));
 const hand=drivePoint(ride.pos-5,ride.player*9+handSide*2.05);hand.y+=.11;
 const elbow=shoulder.clone().lerp(hand,.54).addScaledVector(roadRight(ride.pos),handSide*.22);
 fitArm(upperSlide,shoulder,elbow);fitArm(lowerSlide,elbow,hand);slideGlove.position.copy(hand);
 for(let i=0;i<28;i++){const f=(time*6+i/28)%1;const v=drivePoint(ride.pos-f*55,ride.player*9+handSide*(2.05+f*.5));sparksData[i*3]=v.x;sparksData[i*3+1]=v.y+.1+Math.sin(f*Math.PI)*.35;sparksData[i*3+2]=v.z;}sparksGeo.attributes.position.needsUpdate=true;
 }
 const velocity=ride.mode==='playing'?Math.min(1,ride.speed/400):0;
 const back=drivePoint(ride.pos-(210-velocity*35),ride.player*9*.85);cameraGoal.copy(back);cameraGoal.y+=5.5-velocity*1.6;
 const target=drivePoint(ride.pos+190+velocity*120,ride.player*9*.35);target.y+=1.7+ride.airY*.55;
 const sideWanted=ride.jumping?Math.min(1,ride.flightAge*2.3)*(ride.airV<0?Math.min(1,ride.airY/12):1):0;
 jumpCameraBlend+=(sideWanted-jumpCameraBlend)*(snap?1:1-Math.exp(-dt*5));
 const right=roadRight(ride.pos);
 const sidePosition=p.clone().addScaledVector(right,13);sidePosition.y+=ride.airY+4;sidePosition.z+=2;
 cameraGoal.lerp(sidePosition,jumpCameraBlend);
 const landingAhead=drivePoint(ride.pos+Math.max(80,ride.speed*.32),ride.player*9*.4);const sideTarget=p.clone().lerp(landingAhead,.22);sideTarget.y=height(ride.pos)+ride.airY*.65+1.4;target.lerp(sideTarget,jumpCameraBlend);
 const k=snap?1:1-Math.exp(-dt*7);camera.position.lerp(cameraGoal,k);look.lerp(target,k);camera.lookAt(look);if(stoneShake){camera.position.y+=Math.sin(time*92)*stoneShake*.035;camera.rotateZ(Math.sin(time*74)*stoneShake*.004);}if(ride.mode==='playing'&&ride.shake>0){camera.position.x+=Math.sin(time*83)*ride.shake*.17;camera.position.y+=Math.sin(time*97)*ride.shake*.12;camera.rotateZ(Math.sin(time*61)*ride.shake*.014);}
 const fov=57+velocity*17+(ride.boost&&ride.mode==='playing'?5:0);camera.fov+=(fov-camera.fov)*k;camera.updateProjectionMatrix();
 sun.position.copy(p).add(new T.Vector3(-22,45,25).multiplyScalar(2.4));sun.target.position.copy(p);sun.target.updateMatrixWorld();
}
const mapPoints=Array.from({length:Math.floor(ride.length/100)+1},(_,i)=>ROAD_PATH.at(i*100));const mapBounds={minX:Math.min(...mapPoints.map(p=>p.x)),maxX:Math.max(...mapPoints.map(p=>p.x)),minZ:Math.min(...mapPoints.map(p=>p.z)),maxZ:Math.max(...mapPoints.map(p=>p.z))};
function mapXY(s,choice=null){const original=ROAD_PATH.at(s),a=ROAD_PATH.yaw(s),offset=choice?ADVENTURE.branchOffset(s,choice):0,p={x:original.x+Math.cos(a)*offset,z:original.z+Math.sin(a)*offset},k=Math.min(130/(mapBounds.maxX-mapBounds.minX||1),100/(mapBounds.maxZ-mapBounds.minZ||1));return [80+(p.x-(mapBounds.minX+mapBounds.maxX)/2)*k,65+(p.z-(mapBounds.minZ+mapBounds.maxZ)/2)*k]}
function drawMap(){const c=$('map').getContext('2d');c.clearRect(0,0,160,130);c.fillStyle='#e2e7cd';c.beginPath();c.ellipse(80,65,73,60,0,0,7);c.fill();c.lineWidth=5;c.strokeStyle='#fff9';c.beginPath();for(let s=0;s<=ride.length;s+=100){const p=mapXY(s);s?c.lineTo(...p):c.moveTo(...p)}c.stroke();for(const choice of ['safe','cliff']){c.strokeStyle=choice==='safe'?'#698b67':'#b98453';c.lineWidth=2;c.beginPath();for(let s=ADVENTURE.fork.start;s<=ADVENTURE.fork.end;s+=40){const p=mapXY(s,choice);s===ADVENTURE.fork.start?c.moveTo(...p):c.lineTo(...p)}c.stroke()}landmarks.forEach((l,i)=>{c.fillStyle=ride.visited.has(i)?'#c48a46':'#7a947c';c.beginPath();c.arc(...mapXY(l.z),2.5,0,7);c.fill()});c.fillStyle='#b77551';c.beginPath();c.arc(...mapXY(ride.pos,ride.branchChoice),4,0,7);c.fill()}
function hud(){const r=ride;document.body.classList.toggle('is-drifting',r.drifting);$('speed').textContent=String(Math.round(r.speed/2)).padStart(2,'0');$('needle').style.left=Math.min(100,r.speed/5.2)+'%';$('energy').style.width=r.energy+'%';$('letters').textContent=r.letters;$('distance').textContent=(r.pos/5000).toFixed(2)+' / '+(r.length/5000).toFixed(2)+' km';$('area').textContent=$('map-label').textContent=ADVENTURE.biome(r.pos,r.branchChoice).name;const next=landmarks.find(l=>l.z>r.pos);$('next-landmark').textContent=next?.name||'바닷바람 우체국';$('landmark-progress').textContent=`${r.visited.size} / 7곳 방문 · ${Math.round(((next?.z||r.length)-r.pos)/5)} m 앞`;drawMap();
$('score').textContent=String(r.score).padStart(5,'0');$('combo').textContent=r.combo?'COMBO ×'+r.combo+' · '+r.comboTime.toFixed(1)+'s':'CLEAN RIDE';$('best-score').textContent='BEST '+bestScore.toLocaleString();
const forkActive=r.mode==='playing'&&r.pos>=ADVENTURE.fork.chooseFrom&&r.pos<ADVENTURE.fork.start;$('fork-choice').hidden=!forkActive;
$('safe-route').classList.toggle('selected',r.branchChoice==='safe');$('cliff-route').classList.toggle('selected',r.branchChoice==='cliff');
const upcoming=ROAD_PATH.turns.find(t=>t.end>r.pos),hint=$('drive-hint');
if(r.crashing)hint.textContent='도로 복귀 중…';
else if(r.jumping)hint.textContent=r.airV<0&&r.airY<4?'지금 E! · PERFECT 착지':'착지 직전 E · 타이밍 보너스';
else if(r.drifting)hint.textContent='DRIFT '+Math.min(100,Math.round(r.driftCharge/1.1*100))+'% · 부스트 충전';
else if(upcoming&&upcoming.start-r.pos<650)hint.textContent=(upcoming.side>0?'↱':'↰')+' 170° '+Math.max(0,Math.round((upcoming.start-r.pos)/5))+'m · 자동 드리프트';
else if(r.pos>ADVENTURE.fork.start&&r.pos<ADVENTURE.fork.end)hint.textContent=r.branchChoice==='cliff'?'협곡 헤어핀 · 250km/h · ↓ 제동':'마을 우회로 · 안전 구간';else if(r.pos>MT.start-800&&r.pos<MT.end)hint.textContent=r.pos<MT.peak?'⛰ 목표봉 오르막 · 정상까지 '+Math.round((MT.peak-r.pos)/5)+' m':'⬇ 목표봉 내리막 · 속도 주의';else if(r.pos>CK.start-500&&r.pos<CK.end){const f=CK.fords.find(f=>f>r.pos);hint.textContent=f&&f-r.pos<900?'〰 '+Math.round((f-r.pos)/5)+' m 앞 개울 건너기 · 흙탕물!':'개울가 · 흙탕물이 튀어요'}else hint.textContent='';
hint.hidden=r.mode!=='playing'||!hint.textContent;
}
let last=performance.now(),frame=0;syncCamera(true);hud();
function tick(now){const dt=Math.min((now-last)/1000,.05);last=now;time+=dt;ride.update(dt,keys);
if(ride.mode==='playing')ROAD_PATH.turns.forEach((t,i)=>{if(ride.pos>t.start-350&&ride.pos<t.end&&!warnedTurns.has(i)){warnedTurns.add(i);notify('↪ 170° 헤어핀! S를 눌러 드리프트하세요.')}});
for(const event of ride.events){
if(event.type==='nearMiss'){soundTone(880);notify('아슬아슬 회피! +'+event.points+' · COMBO ×'+event.combo)}
if(event.type==='graze'){sound.impact(.3);burst(drivePoint(ride.pos,ride.player*9),15,.7);notify('바위 가장자리를 스쳤어요!')}
if(event.type==='drift'){soundTone(990);notify('DRIFT 성공! +'+event.points+' · 부스트 +35')}
if(event.type==='perfectLand'){soundTone(1100);burst(drivePoint(ride.pos,ride.player*9),25,.8);notify('PERFECT 착지! +'+event.points+' · 순간 가속')}
if(event.type==='letter'){soundTone(660);notify(ride.letters===12?'✉ 편지 12통 수집 완료! 우체국으로 가요.':'✉ 따뜻한 편지 +1')}if(event.type==='hit'){sound.impact(1.5);burst(drivePoint(ride.pos,ride.player*9),85,2.6);notify('쾅! 낙석 충돌 — 공중으로 튕겨 나갔어요!')}
if(event.type==='ford'){sound.impact(.6);burst(drivePoint(ride.pos,ride.player*9),70,2.2,'mud');mud.splash(.34,(Math.random()-.5)*1.4);notify('첨벙! 개울을 건넜어요 — 흙탕물이 앞을 가려요!')}
if(event.type==='grass'){sound.impact(.35);burst(drivePoint(ride.pos,ride.player*9),42,1.6,true);notify('풀숲 충격! 도로 쪽으로 튕겨 나갑니다.')}
if(event.type==='rockfall')notify('⚠ 앞쪽 낙석! 큰 바위를 피하세요.');
if(event.type==='rockland'){burst(drivePoint(event.z,event.x*9),60,2);if(Math.abs(event.z-ride.pos)<650)ride.shake=Math.max(ride.shake,.35);}
if(event.type==='jump'){soundTone(440);notify('언덕 점프! 오른쪽에서 비행을 따라갑니다.')}
if(event.type==='jumpLand'){sound.impact(.7);burst(drivePoint(ride.pos,ride.player*9),60,1.7);soundTone(95);notify('쿵! 착지 완료 — 다시 전속력!')}
if(event.type==='stone')notify('돌 포장길 — 덜덜덜! 핸들을 잡으세요.');
if(event.type==='land'){sound.impact(.8);burst(drivePoint(ride.pos,0),55,1.8);soundTone(90);notify('쿵! 도로 복귀 — 다시 가속하세요.');}
if(event.type==='landmark')notify('⌖ '+event.name+'에 도착했어요.');if(event.type==='finish')finish()}
if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').style.opacity=0}syncCamera(false,dt);
wheels.forEach(w=>w.rotation.x-=ride.mode==='playing'?ride.speed*1.35/20*dt/.5:0);bike.visible=true;updateDust(dt);updateGroundFX(dt);mc.update(time,dt);
// Riding beside the creek throws muddy water onto the lens — more when the bike runs close to the water.
{const cx=ride.mode==='playing'&&ride.pos>CK.start-300&&ride.pos<CK.end+300?ADVENTURE.creekX(ride.pos):null;if(cx!==null&&ride.speed>60&&!ride.jumping&&!ride.crashing){const px=ride.player*9,near=Math.max(0,Math.min(1,1-(Math.abs(px-cx)-3)/10));mudT-=dt*(.35+near*1.5)*Math.min(1,ride.speed/300);if(mudT<=0){mudT=.7+Math.random()*.6;const side=Math.sign(cx-px)||1;mud.splash(.05+near*.12,side*.8);burst(drivePoint(ride.pos-6,px+side*2),8,.9,'mud')}}}
if(ride.mode==='playing'||ride.mode==='finished')mud.update(dt);mud.draw();
for(const {root,s} of worldObjects){root.visible=s>ride.pos-800&&s<ride.pos+4400;if(root.userData.balloon)root.position.y=root.userData.baseY+Math.sin(time*.7+s)*.8}
for(const {item,root,baseY} of itemMeshes){root.position.copy(drivePoint(item.z,item.x*9));root.visible=!(item.type==='rock'&&item.z>ADVENTURE.fork.start&&item.z<ADVENTURE.fork.end&&ride.branchChoice==='safe')&&item.z>ride.pos-120&&item.z<ride.pos+4200&&!ride.collected.has(item.id);if(item.type==='letter'){root.position.y=baseY+Math.sin(time*2+item.id)*.13;root.rotation.y=heading(item.z)+Math.sin(time*.7+item.id)*.2}else{
 const age=ride.falling.get(item.id);const drop=age===undefined?0:Math.max(0,24*(1-(age/.9)**2));root.position.y=baseY+drop;
 root.rotation.z=age!==undefined&&age<.9?Math.sin(age*7)*.16:0;
 root.visible=root.visible&&age!==undefined;root.userData.warning.position.y=.04-drop;root.userData.warning.visible=age!==undefined&&age<1.3;
 }}
for(let i=0;i<180;i++){petalPositions[i*3]=bike.position.x+Math.sin(i*54.1+time*.15)*25;petalPositions[i*3+1]=bike.position.y+((i*.73-time*.23)%12+12)%12;petalPositions[i*3+2]=bike.position.z+Math.cos(i*3.1+time*.03)*35}petalGeo.attributes.position.needsUpdate=true;
camera.updateMatrixWorld();for(const l of labels){const dz=l.s-ride.pos;projected.copy(l.position).project(camera);const visible=dz>60&&dz<1500&&Math.abs(projected.x)<.85&&projected.y>-.65&&projected.y<.6&&projected.z<1;l.e.style.display=visible?'block':'none';if(visible){l.e.style.left=(projected.x*.5+.5)*innerWidth+'px';l.e.style.top=(-projected.y*.5+.5)*innerHeight+'px';l.e.textContent=(ride.visited.has(l.index)?'✓ ':'')+landmarks[l.index].name}}
sound.update(ride,time);
const rush=ride.mode==='playing'?T.MathUtils.smoothstep(ride.speed,150,460):0;
windMat.opacity=rush*.32;wind.visible=rush>.01;windTravel+=ride.mode==='playing'?ride.speed*dt*.018:0;
for(let i=0;i<64;i++){const side=i%2?1:-1,z=-3-((i*1.73-windTravel)%27+27)%27,x=side*(2.8+(i%7)*.6),y=Math.sin(i*7.13)*7;
 const at=i*6;windData[at]=x;windData[at+1]=y;windData[at+2]=z;windData[at+3]=x;windData[at+4]=y;windData[at+5]=z+(.5+rush*2.8);}
windGeo.attributes.position.needsUpdate=true;
const biome=ADVENTURE.biome(ride.pos,ride.branchChoice);scene.background.lerp(new T.Color(biome.sky),1-Math.exp(-dt*1.5));scene.fog.color.lerp(new T.Color(biome.fog),1-Math.exp(-dt*1.5));scene.fog.near+=((biome.fogNear||65)-scene.fog.near)*(1-Math.exp(-dt*1.5));scene.fog.far+=((biome.fogFar||230)-scene.fog.far)*(1-Math.exp(-dt*1.5));
landingRing.visible=ride.jumping;
if(ride.jumping){let t=0,s=ride.pos,y=ride.flightY,v=ride.airV;while(t<4){t+=.04;s+=ride.speed*1.35*.04*ADVENTURE.travelScale(s,ride.branchChoice);v-=16*.04;y+=v*.04;if(y<=height(s))break}landingRing.position.copy(drivePoint(s,ride.player*9));landingRing.position.y+=.05;landingRing.material.color.set(ride.airV<0&&ride.airY<4?'#a9e6a0':'#f1d886');}
if(frame++%4===0)hud();renderer.render(scene,camera);requestAnimationFrame(tick)}requestAnimationFrame(tick);
window.rideDebug={ride,start,keys,camera,renderer,canyon,scene,T,drivePoint,mud,snap:()=>syncCamera(true)};window.getGameState=()=>({mode:ride.mode,pos:ride.pos,speed:ride.speed,letters:ride.letters,energy:ride.energy,landmarksVisited:ride.visited.size,airHeight:ride.airY,crashing:ride.crashing,jumping:ride.jumping,surface:ride.surface,score:ride.score,combo:ride.combo,drifting:ride.drifting,branch:ride.branchChoice,renderer:'Three.js WebGL',drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
})();
