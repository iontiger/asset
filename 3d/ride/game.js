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
const F=ADVENTURE.fork,MT=ADVENTURE.mountain,CK=ADVENTURE.creek,SN=ADVENTURE.snow,sstep=ADVENTURE.sstep,snowC=new T.Color('#f1f4f7');
function groundAt(s,offset){const p=point(s,offset),mm=ADVENTURE.mountainMask(s),inFork=s>F.start-1000&&s<F.end+400,cx=ADVENTURE.creekX(s),mf=ADVENTURE.mountainField(p.x,p.z);
 if(mf>0||mm>0){const c=ROAD_PATH.at(s);p.y+=mf-ADVENTURE.mountainField(c.x,c.z)}
 let wave=Math.abs(offset)>12&&!inFork?Math.sin(s/650+offset*.04)*Math.min(9,(Math.abs(offset)-12)*.14)*(1-mm):0;
 if(cx!==null){const d=Math.abs(offset-cx);wave*=sstep(6,16,d);if(d<7)p.y-=1.5*(1-(d/7)**2)}
 p.y+=wave;return p}
function strip(halfWidth,color,yOffset=0,terrain=false){const verts=[],colors=[],indices=[],c=new T.Color(),steps=Math.ceil((ride.length+2200)/9),cols=terrain?24:2;
for(let i=0;i<=steps;i++){const s=-600+i*(ride.length+2200)/steps;for(let j=0;j<=cols;j++){const offset=(j/cols*2-1)*(terrain&&s>ADVENTURE.fork.start-200&&s<ADVENTURE.fork.end+200?55:halfWidth),p=terrain?groundAt(s,offset):point(s,offset+ADVENTURE.branchOffset(s,'safe'));p.y+=yOffset;if(terrain&&s>F.start-1400&&s<F.end+800&&Math.abs(offset)>9&&folded(p,s,Math.abs(offset)-1))p.y-=7;if(terrain&&Math.abs(offset)>14&&ADVENTURE.mountainField(p.x,p.z)>.5)p.y-=4;verts.push(p.x,p.y,p.z);c.set(terrain?ADVENTURE.biome(s).ground:halfWidth<9.5?ADVENTURE.biome(s).road:color);{const sc=ADVENTURE.snowCover(s);if(sc>0)c.lerp(snowC,sc)}c.multiplyScalar(.94+.06*Math.sin(i*1.83+j*2.1));colors.push(c.r,c.g,c.b);if(i<steps&&j<cols){const a=i*(cols+1)+j;indices.push(a,a+cols+1,a+1,a+1,a+cols+1,a+cols+2)}}}
const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();const m=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}));m.receiveShadow=true;scene.add(m);return m;}
// Inside the hairpins the wide meadow folds over the other leg (at a different height) — sink the folded part under the ground that belongs there.
const foldRoads=[];for(let s=-600;s<=ride.length+600;s+=40)for(const ch of ['safe','cliff']){if(ch==='cliff'&&!(s>ADVENTURE.fork.start&&s<ADVENTURE.fork.end))continue;const p=drivePoint(s,0,ch);foldRoads.push(p.x,p.z,s)}
function folded(p,s,r){const r2=r*r;for(let i=0;i<foldRoads.length;i+=3){if(Math.abs(foldRoads[i+2]-s)<600)continue;const dx=foldRoads[i]-p.x,dz=foldRoads[i+1]-p.z;if(dx*dx+dz*dz<r2)return true}return false}
strip(30,'#91ad69',-.12,true);strip(9.65,'#b7b58b',-.025);strip(9,'#caa778');
// 폭설 평원: 길 위에 쌓인 눈 (바퀴가 반쯤 잠기는 깊이) + 길가 눈둑. 눈 깊이는 ADVENTURE.snowAmt 를 따른다.
const snowDepth=s=>SN.depth*ADVENTURE.snowAmt(s);
{const verts=[],colors=[],idx=[],c=new T.Color(),offs=[-13,-11.6,-10.6,-9.8,-9.2,-6,-3,0,3,6,9.2,9.8,10.6,11.6,13],lift=[0,.55,1.05,.75,1,1,1,1,1,1,1,.75,1.05,.55,0],n=Math.ceil((SN.end-SN.start+1200)/6);
 for(let i=0;i<=n;i++){const s=SN.start-600+i*6,d=snowDepth(s),sc=ADVENTURE.snowCover(s);offs.forEach((o,j)=>{const p=point(s,o);p.y+=(Math.abs(o)>9.3?Math.max(d,.5*sc):d)*lift[j]*(Math.abs(o)>9.3?1.5:1)+.015*sc-.03*(1-sc);verts.push(p.x,p.y,p.z);c.set(Math.abs(o)<2.2?'#e4e9ee':'#f6f8fa').multiplyScalar(.95+.05*Math.sin(i*1.3+j*2.7));colors.push(c.r,c.g,c.b);if(i<n&&j<offs.length-1){const a=i*offs.length+j;idx.push(a,a+offs.length,a+1,a+1,a+offs.length,a+offs.length+1)}})}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();const m=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:.92,side:T.DoubleSide}));m.receiveShadow=true;scene.add(m)}
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
 if(s>F.start-1500&&s<F.end+1000||ADVENTURE.snowCover(s)>0)continue;const lat=side*(12+rand()*17);if(landmarks.some(l=>Math.abs(l.z-s)<200&&Math.sign(l.x)===side))continue;
 const p=groundAt(s,lat);{const cx=ADVENTURE.creekX(s);if(cx!==null&&Math.abs(lat-cx)<7)continue}if(ADVENTURE.mountainField(p.x,p.z)>.5)continue;
 treeData.push({p,scale:.8+rand()*.85,pink:rand()>.35});}
function instanceTrees(kind,color,geo,offset,scale){const list=treeData.filter(d=>kind==='all'||d.pink===(kind==='pink'));const m=new T.InstancedMesh(geo,mat(color),list.length);list.forEach((d,i)=>{dummy.position.copy(d.p).add(new T.Vector3(...offset).multiplyScalar(d.scale));dummy.scale.set(...scale).multiplyScalar(d.scale);dummy.rotation.set(0,i*1.4,0);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix)});m.castShadow=true;m.receiveShadow=true;scene.add(m)}
instanceTrees('all','#8d7353',new T.CylinderGeometry(.16,.24,2.5,7),[0,1.25,0],[1,1,1]);
for(const [kind,colors] of [['pink',['#e4a9bb','#efbfcd','#d69ead']],['green',['#8bad64','#a2bd78','#739557']]])for(let i=0;i<3;i++)instanceTrees(kind,colors[i],new T.IcosahedronGeometry(1.5,1),[[0,3.1,0],[-.85,3.6,.2],[.85,2.85,0]][i],[1,i===1?.95:1.1,1]);
// Real mesh buildings are distance-culled, never converted to billboard images.
const worldObjects=[],labels=[];
const templates={};for(const name of VillageModels.names)templates[name]=VillageModels.create(name);
function placeModel(name,s,lat,scale=1){const root=templates[name].clone(true);root.position.copy(groundAt(s,lat));root.rotation.y=heading(s)+(lat<0?Math.PI*.4:-Math.PI*.4);root.scale.setScalar(scale);scene.add(root);worldObjects.push({root,s});return root}
for(let s=450,i=0;s<ride.length;s+=330,i++){const side=i%2?1:-1;if(landmarks.some(l=>Math.abs(l.z-s)<260)||s>F.start-1500&&s<F.end+1000||ADVENTURE.mountainMask(s)>0||s>CK.start-1500&&s<CK.end+1500||ADVENTURE.snowCover(s-300)>0||ADVENTURE.snowCover(s+300)>0)continue;placeModel(['cottage','rosehouse','shop'][i%3],s,side*(16+rand()*5),.8+rand()*.25)}
landmarks.forEach((l,i)=>{const root=placeModel(l.model,l.z,l.x*9+ADVENTURE.branchOffset(l.z,l.x>0?'cliff':'safe'),l.scale);const e=document.createElement('div');e.className='place-label';e.textContent=l.name;$('world-labels').appendChild(e);const box=new T.Box3().setFromObject(root);labels.push({e,s:l.z,index:i,position:new T.Vector3(root.position.x,box.max.y+1.2,root.position.z)})});
for(const s of [8800,46500,79500]){let root=placeModel('balloon',s,35,1.7);root.position.y+=20;root.userData.balloon=true;root.userData.baseY=root.position.y}
// Region-specific scenery, kept clear of every road segment.
const routeSamples=Array.from({length:Math.floor(ride.length/100)+1},(_,i)=>point(i*100));
function clearOfRoad(p,r=18){return routeSamples.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>r)}
// 폭설 평원: 눈 덮인 전나무 · 눈더미 · 눈사람 (나무 몇 종류를 인스턴스로)
{const pines=[],drifts=[];for(let s=SN.start-500;s<SN.end+700;s+=60)for(const side of [-1,1]){const lat=side*(16+rand()*20),p=groundAt(s,lat);if(rand()<.55&&clearOfRoad(p,15))pines.push({p,k:.6+rand()*.55,r:rand()*6});if(rand()<.5)drifts.push({p:groundAt(s+30,side*(11.5+rand()*12)),k:.6+rand()*1.3,r:rand()*6})}
 const put=(list,geo,color,f)=>{const m=new T.InstancedMesh(geo,mat(color),list.length);list.forEach((d,i)=>{f(d);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix)});m.castShadow=true;m.receiveShadow=true;scene.add(m)};
 put(pines,new T.CylinderGeometry(.18,.26,1.6,6),'#6d5a45',d=>{dummy.position.copy(d.p);dummy.position.y+=.8*d.k;dummy.scale.setScalar(d.k);dummy.rotation.set(0,d.r,0)});
 [[2.3,2.6,1.9,'#2f5a46'],[1.8,2.2,3.3,'#356550'],[1.25,1.9,4.6,'#3b6d57']].forEach(([r,h,y,c])=>{put(pines,new T.ConeGeometry(r,h,8),c,d=>{dummy.position.copy(d.p);dummy.position.y+=y*d.k;dummy.scale.setScalar(d.k);dummy.rotation.set(0,d.r,0)});
   put(pines,new T.ConeGeometry(r*.82,h*.45,8),'#f4f7fa',d=>{dummy.position.copy(d.p);dummy.position.y+=(y+h*.3)*d.k;dummy.scale.setScalar(d.k);dummy.rotation.set(0,d.r,0)})});
 put(drifts,new T.SphereGeometry(1,12,8),'#f3f6f9',d=>{dummy.position.copy(d.p);dummy.scale.set(2.4*d.k,.7*d.k,1.5*d.k);dummy.rotation.set(0,d.r,0)});
 for(const [s,lat] of [[87600,13],[91800,-14],[96200,12.5]]){const g=new T.Group();g.position.copy(groundAt(s,lat));g.rotation.y=heading(s)+(lat>0?-1.2:1.2);scene.add(g);ball(g,0,.9,0,.95,'#f6f8fb');ball(g,0,2.2,0,.68,'#f6f8fb');ball(g,0,3.2,0,.48,'#f6f8fb');
   ball(g,0,3.2,.47,.09,'#e8823a',.6,.6,2.2);for(const x of [-.17,.17])ball(g,x,3.35,.42,.06,'#2b2b2b');cyl(g,0,3.7,0,.34,.34,.12,'#2b2b2b');cyl(g,0,3.95,0,.24,.24,.45,'#2b2b2b');cyl(g,0,2.75,0,.5,.55,.16,'#d9473b');for(const x of [-1,1])beam(g,[x*.6,2.3,0],[x*1.5,2.9,0],.05,'#6d5a45');worldObjects.push({root:g,s})}}
// Canyon branch (default route): CANYON EXPRESS sandstone walls, ledges, pines and signs — see canyon.js.
const canyon=CANYON.build({T,scene,drivePoint,ride,fork:ADVENTURE.fork,landmarks,turns:ROAD_PATH.turns});
// 목표봉 (up and over) and the creek with its three fords — see mountain-creek.js.
const mc=MOUNTAIN_CREEK.build({T,scene,point,height,heading,groundAt,ride});
for(let s=82000;s<96000;s+=180){const p=point(s,40);if(!clearOfRoad(p,27))continue;const ice=ADVENTURE.snowCover(s)>.5,water=new T.Mesh(new T.PlaneGeometry(40,10),new T.MeshStandardMaterial({color:ice?'#cfe2ea':'#6aafb9',roughness:ice?.15:.3,metalness:.15,side:T.DoubleSide}));water.rotation.set(-Math.PI/2,0,heading(s));water.position.copy(p);water.position.y-=2;scene.add(water);for(let j=0;j<(ice?0:3);j++){const foam=box(scene,p.x+j*5,p.y-1.97,p.z,3,.025,.08,'#dce9d8');foam.rotation.y=heading(s)}}
for(let s=ADVENTURE.fork.start+300;s<ADVENTURE.fork.end-300;s+=480){placeModel('cottage',s,ADVENTURE.branchOffset(s,'safe')-15,.75)}
// Chevron road warnings before both hairpins.
for(const turn of ROAD_PATH.turns)for(let s=turn.start-360;s<turn.start;s+=65){const root=new T.Group();root.position.copy(drivePoint(s,0,'cliff'));root.rotation.y=heading(s);for(const sign of [-1,1]){const dash=box(root,sign*.6,.025,0,.14,.03,1.6,'#e2c77f');dash.rotation.y=sign*.7}scene.add(root)}
// Individual grass blades sway and bend away from nearby tires.
const grassList=[];for(let s=100;s<ride.length;s+=35)for(const side of [-1,1]){if(s>F.start-500&&s<F.end+500||ADVENTURE.snowCover(s)>0)continue;{const cx=ADVENTURE.creekX(s);if(cx!==null&&Math.abs(side*10.5-cx)<5)continue}grassList.push({s,side,p:drivePoint(s,side*(9.8+rand()*1.5),'safe')})}
const grass=new T.InstancedMesh(new T.PlaneGeometry(.22,.65),new T.MeshStandardMaterial({color:'#75915b',side:T.DoubleSide}),grassList.length);grass.frustumCulled=false;scene.add(grass);
let lastTrack=-100,trackCursor=0;const trackDummy=new T.Object3D(),tracks=new T.InstancedMesh(new T.PlaneGeometry(.22,.65),new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.24,depthWrite:false,side:T.DoubleSide}),900);const trackDirt=new T.Color('#6c5540'),trackSnow=new T.Color('#7d8da0');tracks.frustumCulled=false;scene.add(tracks);trackDummy.scale.setScalar(0);trackDummy.updateMatrix();for(let i=0;i<900;i++)tracks.setMatrixAt(i,trackDummy.matrix);
function updateGroundFX(dt){if(ride.mode==='playing'&&ride.airY<.1&&Math.abs(ride.pos-lastTrack)>7){lastTrack=ride.pos;trackDummy.position.copy(drivePoint(ride.pos-18,ride.player*9));const sd=snowDepth(ride.pos-18);trackDummy.position.y+=.025+sd;trackDummy.rotation.set(-Math.PI/2,0,driveHeading(ride.pos));trackDummy.scale.set(sd>.05?1.9:1,1,1);trackDummy.updateMatrix();tracks.setColorAt(trackCursor%900,sd>.05?trackSnow:trackDirt);tracks.setMatrixAt(trackCursor++%900,trackDummy.matrix);tracks.instanceMatrix.needsUpdate=true;if(tracks.instanceColor)tracks.instanceColor.needsUpdate=true;}
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
  // 편지는 두 배 크기 (가운데가 땅에서 1.6 높이)
  const big=new T.Group();while(root.children.length)big.add(root.children[0]);big.scale.setScalar(2);big.position.y=1.6-1.2*2;root.add(big);
 }else{const inC=item.z>ADVENTURE.fork.start&&item.z<ADVENTURE.fork.end;const r=mesh(new T.DodecahedronGeometry(item.radius,1),inC?'#c08a5c':'#777466',root,0,item.radius*.7,0);if(inC)r.material=new T.MeshStandardMaterial({color:'#c08a5c',roughness:.9,flatShading:true});r.scale.set(1,.85,1);r.rotation.set(.15,item.id,.17);
   for(let j=0;j<5;j++){const a=j*2.4;const chip=mesh(new T.DodecahedronGeometry(.2+j*.045,0),inC?'#d4a272':'#948570',root,Math.cos(a)*(item.radius+1),.15,Math.sin(a)*(item.radius+.7));chip.scale.y=.6}
   const warn=mesh(new T.RingGeometry(item.radius+.6,item.radius+.72,36), '#d18f43',root,0,.04,0);warn.rotation.x=-Math.PI/2;warn.material=new T.MeshBasicMaterial({color:'#e3ac55',transparent:true,opacity:.6,side:T.DoubleSide});root.userData.warning=warn;
 }itemMeshes.push({item,root,baseY:root.position.y});}
// Recycled instanced dust puffs: dirt trails, grass smoke and rock-impact bursts.
const dustPool=Array.from({length:240},()=>({life:0,max:1,p:new T.Vector3(),v:new T.Vector3(),size:1}));let dustCursor=0,dustBudget=0,lastDustPos=0;
const dustTint=new T.Color('#bea079'),dust=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),new T.MeshStandardMaterial({color:'#ffffff',roughness:1,transparent:true,opacity:.26,depthWrite:false}),dustPool.length);dust.frustumCulled=false;scene.add(dust);
function burst(p,count,force=1,grass=false){for(let i=0;i<count;i++){const d=dustPool[dustCursor++%dustPool.length];d.life=d.max=.6+rand()*1.2;d.p.copy(p).add(new T.Vector3((rand()-.5)*1.5,.2,(rand()-.5)*1.5));d.v.set((rand()-.5)*force*7,1+rand()*force*3,(rand()-.5)*force*7);d.size=(.12+rand()*.25)*(.6+force*.4);d.grass=grass;}}
function updateDust(dt){const active=ride.mode==='playing',traveled=Math.min(2,Math.abs(ride.pos-lastDustPos)/20);lastDustPos=ride.pos;if(active&&!ride.crashing&&ride.speed>18&&ride.airY<.4){dustBudget+=traveled*(1.2+ride.speed*.002)*(ride.surface==='stone'?.22:1);const count=Math.floor(dustBudget);dustBudget-=count;const rear=drivePoint(ride.pos-19,ride.player*9);if(ride.snow>.3){rear.y+=snowDepth(ride.pos);burst(rear,count*2,.45+ride.speed/500,'snow')}else burst(rear,count,.3+ride.speed/600,Math.abs(ride.player)>.9)}
 dustPool.forEach((d,i)=>{if(active&&d.life>0){d.life-=dt;d.p.addScaledVector(d.v,dt);d.v.multiplyScalar(Math.exp(-dt*1.4));d.v.y+=dt*.45}const t=Math.max(0,d.life/d.max),size=t>0?d.size*(1-t)*4+ d.size*.4:0;dummy.position.copy(d.p);dummy.scale.setScalar(size*Math.min(1,t*4));dummy.rotation.set(0,i,0);dummy.updateMatrix();dust.setMatrixAt(i,dummy.matrix);dust.setColorAt(i,d.grass==='snow'?new T.Color(i%2?'#f5f8fb':'#dfe7ef'):new T.Color(d.grass==='mud'?(i%2?'#7b6446':'#8f7a58'):d.grass?'#929579':i%3?'#c6aa80':'#aa8b66').multiply(dustTint))});dust.instanceMatrix.needsUpdate=true;if(dust.instanceColor)dust.instanceColor.needsUpdate=true;
}
// Drifting petals close to the rider, with a fixed reusable buffer.
const petalPositions=new Float32Array(180*3),petalGeo=new T.BufferGeometry();petalGeo.setAttribute('position',new T.BufferAttribute(petalPositions,3));const petals=new T.Points(petalGeo,new T.PointsMaterial({color:'#f5c5cb',size:.13,transparent:true,opacity:.8}));scene.add(petals);
// 폭설: 카메라 둘레에서 떨어지는 눈송이 + 화면 가장자리 성에
const FLAKES=1600,snowPos=new Float32Array(FLAKES*3),snowGeo=new T.BufferGeometry();snowGeo.setAttribute('position',new T.BufferAttribute(snowPos,3));
const flakeTex=(()=>{const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d'),g=x.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.45,'rgba(255,255,255,.85)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,32,32);return new T.CanvasTexture(c)})();
const snowMat=new T.PointsMaterial({color:'#ffffff',map:flakeTex,size:.26,transparent:true,opacity:0,depthWrite:false,fog:false});const snowfall=new T.Points(snowGeo,snowMat);snowfall.frustumCulled=false;snowfall.visible=false;scene.add(snowfall);
const frost=$('frost');
// 편지 수집 '띠링~': 편지가 빙글 돌며 떠올라 사라지고, 금빛 반짝이가 터지고, 화면에서 봉투가 편지함으로 날아간다
const gotAt=new Map(),SPARK=160,sparkPos=new Float32Array(SPARK*3),sparkVel=new Float32Array(SPARK*3),sparkLife=new Float32Array(SPARK),sparkGeo=new T.BufferGeometry();sparkGeo.setAttribute('position',new T.BufferAttribute(sparkPos,3));
const sparkSize=new Float32Array(SPARK);sparkGeo.setAttribute('size',new T.BufferAttribute(sparkSize,1));let sparkCursor=0;
const sparkles=new T.Points(sparkGeo,new T.PointsMaterial({color:'#ffd86a',map:flakeTex,size:.24,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));sparkles.frustumCulled=false;scene.add(sparkles);
function sparkleBurst(p){for(let k=0;k<26;k++){const i=sparkCursor++%SPARK,a=k/26*Math.PI*2,up=rand();sparkPos.set([p.x,p.y,p.z],i*3);sparkVel.set([Math.cos(a)*(2+rand()*3),2.5+up*5,Math.sin(a)*(2+rand()*3)],i*3);sparkLife[i]=.55+rand()*.45}}
function updateSparkles(dt){let any=false;for(let i=0;i<SPARK;i++){if(sparkLife[i]>0){sparkLife[i]-=dt;any=true;for(let k=0;k<3;k++)sparkPos[i*3+k]+=sparkVel[i*3+k]*dt;sparkVel[i*3+1]-=9*dt;for(const k of [0,2])sparkVel[i*3+k]*=Math.exp(-dt*2.5)}else sparkPos[i*3+1]=-9999}sparkGeo.attributes.position.needsUpdate=true;sparkles.visible=any}
function dingFX(item){const p=drivePoint(item.z,item.x*9);p.y+=1.6;sparkleBurst(p);projected.copy(p).project(camera);const x=(projected.x*.5+.5)*innerWidth,y=(-projected.y*.5+.5)*innerHeight;
  const word=document.createElement('div');word.className='ding-word';word.innerHTML='띠링~ <b>+100</b>';word.style.left=x+'px';word.style.top=y+'px';document.body.appendChild(word);word.addEventListener('animationend',()=>word.remove());setTimeout(()=>word.remove(),4000);
  const env=document.querySelector('.mail-count .envelope'),r=env.getBoundingClientRect(),fly=document.createElement('div');fly.className='ding-fly';fly.textContent='✉';fly.style.left=x+'px';fly.style.top=y+'px';document.body.appendChild(fly);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{fly.style.transform=`translate(${r.left+r.width/2-x}px,${r.top+r.height/2-y}px) scale(.55) rotate(-360deg)`;fly.style.opacity='.2'}));
  let landed=false;const land=()=>{if(landed)return;landed=true;fly.remove();const m=document.querySelector('.mail-count');m.classList.remove('bump');void m.offsetWidth;m.classList.add('bump')};fly.addEventListener('transitionend',land);setTimeout(land,2500)}
// Camera-space peripheral wind streaks; the road and rider stay unobscured.
const windData=new Float32Array(64*6),windGeo=new T.BufferGeometry();windGeo.setAttribute('position',new T.BufferAttribute(windData,3));
const windMat=new T.LineBasicMaterial({color:'#fff4db',transparent:true,opacity:0,depthTest:false,depthWrite:false});
const wind=new T.LineSegments(windGeo,windMat);wind.frustumCulled=false;wind.renderOrder=10;camera.add(wind);scene.add(camera);
let windTravel=0;let jumpCameraBlend=0;
const sound=new RideSound();
// Muddy creek water on the camera lens (2D overlay between the 3D view and the HUD).
const mud=new MudScreen($('mud'));let mudT=0;let time=0,toastTime=0;
let bestScore=0,bestTime=null;try{const saved=JSON.parse(localStorage.getItem('dentphoto-record-v1')||'{}');bestScore=Number(saved.score)||0;bestTime=Number(saved.time)||null}catch(e){}
$('safe-route').onclick=()=>{if(ride.chooseBranch('safe'))notify('마을길 선택 · 한적한 우회로')};$('cliff-route').onclick=()=>{if(ride.chooseBranch('cliff'))notify('협곡 헤어핀 선택 · 250km/h 질주!')};
const landingRing=new T.Mesh(new T.RingGeometry(1.3,1.6,48),new T.MeshBasicMaterial({color:'#f1d886',transparent:true,opacity:.65,side:T.DoubleSide,depthWrite:false}));landingRing.rotation.x=-Math.PI/2;landingRing.visible=false;scene.add(landingRing);

function notify(text){$('toast').textContent=text;toastTime=2.6;$('toast').style.opacity=1}
function soundTone(freq){sound.chime(freq)}
function show(title,description,button){$('overlay').classList.remove('hidden');document.querySelector('.welcome h2').innerHTML=title;document.querySelector('.welcome p').innerHTML=description;$('start').innerHTML=button+' <span>↗</span>'}
function start(){const fresh=ride.mode!=='paused';ride.start();sound.musicLoad();if(fresh){sound.musicReset();gotAt.clear();sparkLife.fill(0);mud.clear();mudT=0;dustPool.forEach(d=>d.life=0);dustBudget=0;lastDustPos=0;warnedTurns.clear();turnBlend=0;jumpCameraBlend=0;lastTrack=-100;trackDummy.scale.setScalar(0);trackDummy.updateMatrix();for(let i=0;i<900;i++)tracks.setMatrixAt(i,trackDummy.matrix);tracks.instanceMatrix.needsUpdate=true;}keys.clear();$('overlay').classList.add('hidden');$('pause').textContent='Ⅱ';notify(touchMode?'자동으로 출발! 화면 왼쪽 · 오른쪽을 눌러 방향을 바꿔요.':'↑ 또는 W로 출발! 3D 마을에서 편지 80통을 모아보세요.');syncCamera(true)}
function pause(){if(ride.mode==='playing'){ride.pause();keys.clear();show('잠시, 쉬어가요.','마을의 바람은 기다려 줄 거예요.','이어서 달리기');$('pause').textContent='▶';sound.silence()}else if(ride.mode==='paused')start()}
function finish(){keys.clear();sound.silence();if(embedded)try{parent.postMessage({dpRide:'finish',letters:ride.letters,score:ride.score,time:ride.elapsed,branch:ride.branchChoice},'*')}catch(e){}const isRecord=ride.score>bestScore;bestScore=Math.max(bestScore,ride.score);bestTime=bestTime===null?ride.elapsed:Math.min(bestTime,ride.elapsed);try{localStorage.setItem('dentphoto-record-v1',JSON.stringify({score:bestScore,time:bestTime}))}catch(e){}
show(isRecord?'새로운 최고 기록!':'마을에 도착했어요.',`${ride.score.toLocaleString()}점 · 최고 ${bestScore.toLocaleString()}점<br>편지 ${ride.letters}통 · 아슬아슬 회피 ${ride.nearMisses}회<br>${Math.floor(ride.elapsed/60)}분 ${Math.floor(ride.elapsed%60)}초 · 최단 ${Math.floor(bestTime/60)}분 ${Math.floor(bestTime%60)}초<br>${ride.branchChoice==='cliff'?'협곡 헤어핀':'마을 우회로'}로 달렸어요.`,'다시 여행하기')}
$('start').addEventListener('click',start);$('pause').addEventListener('click',pause);
// Opened from the DentPhoto village post office (iframe): ⌂ returns to the village.
const goHome=()=>{keys.clear();sound.silence();if(ride.mode==='playing')ride.pause();try{parent.postMessage({dpRide:'close'},'*')}catch(e){}};if(embedded){for(const id of ['home','home2']){$(id).hidden=false;$(id).addEventListener('click',goHome)}}
// 소리 버튼: 스피커 아이콘 (켜짐 = 소리 물결, 꺼짐 = X)
const SPEAKER=on=>`<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor"/>${on?'<path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.2 6.5a8 8 0 0 1 0 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>':'<path d="M15.5 9.5l5 5M20.5 9.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>'}</svg>`;
$('sound').innerHTML=SPEAKER(!sound.muted);$('sound').title=sound.muted?'소리 켜기':'소리 끄기';$('sound').setAttribute('aria-label',$('sound').title);
for(const ev of ['pointerdown','keydown'])addEventListener(ev,()=>{if(!sound.muted)sound.unlock()},{capture:true});
$('sound').addEventListener('click',async()=>{try{const muted=await sound.toggle();$('sound').innerHTML=SPEAKER(!muted);$('sound').title=muted?'소리 켜기':'소리 끄기';$('sound').setAttribute('aria-label',muted?'소리 켜기':'소리 끄기');notify(muted?'소리를 껐어요.':'엔진 · 바람 · 노면 효과음을 켰어요.')}catch(e){notify('이 브라우저에서 소리를 시작하지 못했어요.')}});
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if((k==='p'||k==='escape')&&!e.repeat)pause();else if(k==='enter'&&ride.mode!=='playing')start();else keys.add(k)});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>{keys.clear();if(ride.mode==='playing')pause()});
// 휴대폰(터치 화면): 자동으로 계속 가속하고, 화면 가운데를 기준으로 왼쪽을 누르면 왼쪽, 오른쪽을 누르면 오른쪽으로 방향을 튼다.
// 네 모서리 카드와 아래 버튼은 숨기고(CSS .touch-mode), 가운데 안내 문구만 남긴다.
let touchMode=matchMedia('(pointer:coarse)').matches&&('ontouchstart' in window||navigator.maxTouchPoints>0);
document.body.classList.toggle('touch-mode',touchMode);
const steerTouches=new Map();
function steerFromTouches(){keys.delete('arrowleft');keys.delete('arrowright');const xs=[...steerTouches.values()];if(!xs.length)return;const x=xs[xs.length-1];keys.add(x<innerWidth/2?'arrowleft':'arrowright')}
{const ignore=t=>t.closest&&t.closest('button,a,#overlay,.fork-choice,header');
 // 감지가 빗나가도 첫 손가락 터치에서 터치 모드로 바꾼다
 addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&!touchMode){touchMode=true;document.body.classList.add('touch-mode');$('game').style.touchAction='none'}if(!touchMode||e.pointerType==='mouse'||ignore(e.target)||ride.mode!=='playing')return;steerTouches.set(e.pointerId,e.clientX);steerFromTouches()});
 addEventListener('pointermove',e=>{if(!steerTouches.has(e.pointerId))return;steerTouches.set(e.pointerId,e.clientX);steerFromTouches()});
 for(const ev of ['pointerup','pointercancel'])addEventListener(ev,e=>{if(steerTouches.delete(e.pointerId))steerFromTouches()});
 if(touchMode)$('game').style.touchAction='none'}
document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key)});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>keys.delete(b.dataset.key))});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();ride.pause();keys.clear();show('3D 화면이 잠시 멈췄어요.','다시 불러오면 여행을 새로 시작할 수 있어요.','새로 불러오기');$('start').onclick=()=>location.reload()});
const look=new T.Vector3(),cameraGoal=new T.Vector3(),projected=new T.Vector3();
function syncCamera(snap=false,dt=.016){const p=drivePoint(ride.pos,ride.player*9);bike.position.copy(p);bike.position.y+=ride.airY;bike.rotation.y=driveHeading(ride.pos)-ride.slip*.55;bike.rotation.x=Math.atan((height(ride.pos+10)-height(ride.pos-10))/.999);lean.rotation.z=-ride.steer*.16+(ride.snow>0&&ride.mode==='playing'?Math.sin(time*5.3)*.05*ride.snow*Math.min(1,ride.speed/150):0);const stoneShake=ride.surface==='stone'&&ride.mode==='playing'&&ride.airY<.1?Math.min(1,ride.speed/220):0;lean.position.y=Math.sin(time*16)*ride.speed*.00005+Math.sin(time*86)*stoneShake*.055;
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
// 왼쪽 위 코스 카드의 진행 막대: 출발 → 우체국 가로선 위에 명소 점과 지금 위치
function drawProgress(r){const box=$('cp-ticks');if(!box.childElementCount)landmarks.forEach(l=>{const t=document.createElement('i');t.title=l.name;box.appendChild(t)});const len=r.length||1;[...box.children].forEach((t,i)=>{t.style.left=Math.min(100,landmarks[i].z/len*100)+'%';t.classList.toggle('on',r.visited.has(i))});const f=Math.max(0,Math.min(1,r.pos/len))*100;$('cp-fill').style.width=f+'%';$('cp-dot').style.left=f+'%'}
// 점수판: 점수가 오를 때마다 숫자가 굴러 오르고 +N 이 떠오르며, 1000점을 넘을 때마다 화면 가운데 큰 축하
let shownScore=0,lastScore=0;
function scorePop(delta){const b=$('scoreboard');b.classList.remove('gain');void b.offsetWidth;b.classList.add('gain');const pop=document.createElement('div');pop.className='score-pop';pop.innerHTML='+'+delta.toLocaleString()+(ride.combo>1?'<small>×'+ride.combo+'</small>':'');b.appendChild(pop);pop.addEventListener('animationend',()=>pop.remove());setTimeout(()=>pop.remove(),2500)}
function milestoneFX(k){const b=$('scoreboard');b.classList.remove('milestone');void b.offsetWidth;b.classList.add('milestone');setTimeout(()=>b.classList.remove('milestone'),1700);document.querySelector('.milestone-fx')?.remove();const fx=document.createElement('div');fx.className='milestone-fx';const cols=['#ffcf4d','#f08a5d','#7cc6a4','#f5a6c0','#7fb4e8','#fff3c4'];let html='<div class="rays"></div><div class="big"><b>'+(k*1000).toLocaleString()+'<small>점</small></b><span>돌파!</span></div>';for(let i=0;i<46;i++){const a=i/46*Math.PI*2+Math.random()*.3,d=180+Math.random()*320;html+=`<i style="--c:${cols[i%6]};--x:${(Math.cos(a)*d)|0}px;--y:${(Math.sin(a)*d+120)|0}px;--r:${(Math.random()*900-450)|0}deg;--d:${(Math.random()*.15).toFixed(2)}s"></i>`}fx.innerHTML=html;document.body.appendChild(fx);setTimeout(()=>fx.remove(),2600);sound.fanfare()}
function updateScore(r){if(r.score<lastScore)lastScore=shownScore=r.score;const delta=r.score-lastScore;if(delta>0){scorePop(delta);const k=Math.floor(r.score/1000);if(k>Math.floor(lastScore/1000))milestoneFX(k);lastScore=r.score}shownScore=Math.min(r.score,shownScore+Math.max(1,(r.score-shownScore)*.12));$('score').textContent=String(Math.round(shownScore)).padStart(5,'0')}
function hud(){const r=ride;document.body.classList.toggle('is-drifting',r.drifting);document.body.classList.toggle('is-boosting',r.mode==='playing'&&keys.has(' '));$('speed').textContent=String(Math.round(r.speed/2)).padStart(2,'0');$('needle').style.left=Math.min(100,r.speed/5.2)+'%';$('letters').textContent=r.letters;$('letters').classList.toggle('goal',r.letters>=80);$('distance').textContent=(r.pos/5000).toFixed(2)+' / '+(r.length/5000).toFixed(2)+' km';$('area').textContent=ADVENTURE.biome(r.pos,r.branchChoice).name;const next=landmarks.find(l=>l.z>r.pos);$('next-landmark').textContent=next?.name||'바닷바람 우체국';$('landmark-progress').textContent=`${r.visited.size} / 7곳 방문 · ${Math.round(((next?.z||r.length)-r.pos)/5)} m 앞`;drawProgress(r);
updateScore(r);$('combo').textContent=r.combo?'COMBO ×'+r.combo+' · '+r.comboTime.toFixed(1)+'s':'CLEAN RIDE';$('best-score').textContent='BEST '+bestScore.toLocaleString();
const forkActive=r.mode==='playing'&&r.pos>=ADVENTURE.fork.chooseFrom&&r.pos<ADVENTURE.fork.start;$('fork-choice').hidden=!forkActive;
$('safe-route').classList.toggle('selected',r.branchChoice==='safe');$('cliff-route').classList.toggle('selected',r.branchChoice==='cliff');
const upcoming=ROAD_PATH.turns.find(t=>t.end>r.pos),hint=$('drive-hint');
if(r.crashing)hint.textContent='도로 복귀 중…';
else if(r.jumping)hint.textContent=touchMode?'두둥실 · 공중 비행 중':r.airV<0&&r.airY<4?'지금 E! · PERFECT 착지':'착지 직전 E · 타이밍 보너스';
else if(r.drifting)hint.textContent='DRIFT '+Math.min(100,Math.round(r.driftCharge/1.1*100))+'% · 부스트 충전';
else if(upcoming&&upcoming.start-r.pos<650)hint.textContent=(upcoming.side>0?'↱':'↰')+' 170° '+Math.max(0,Math.round((upcoming.start-r.pos)/5))+'m · 자동 드리프트';
else if(r.pos>ADVENTURE.fork.start&&r.pos<ADVENTURE.fork.end)hint.textContent=r.branchChoice==='cliff'?(touchMode?'협곡 헤어핀 · 250km/h':'협곡 헤어핀 · 250km/h · ↓ 제동'):'마을 우회로 · 안전 구간';else if(r.pos>MT.start-800&&r.pos<MT.end)hint.textContent=r.pos<MT.peak?'⛰ 목표봉 오르막 · 정상까지 '+Math.round((MT.peak-r.pos)/5)+' m':'⬇ 목표봉 내리막 · 속도 주의';else if(r.snow>.05)hint.textContent='❄ 폭설 · 바퀴가 눈에 잠겼어요 — 미끄러우니 핸들을 일찍 살짝';else if(r.pos>CK.start-500&&r.pos<CK.end){const f=CK.fords.find(f=>f>r.pos);hint.textContent=f&&f-r.pos<900?'〰 '+Math.round((f-r.pos)/5)+' m 앞 개울 건너기 · 흙탕물!':'개울가 · 흙탕물이 튀어요'}else hint.textContent='';
hint.hidden=r.mode!=='playing'||!hint.textContent;
}
let last=performance.now(),frame=0;syncCamera(true);hud();
function tick(now){const dt=Math.min((now-last)/1000,.05);last=now;time+=dt;if(touchMode){if(ride.mode==='playing')keys.add('arrowup');else{keys.delete('arrowup');steerTouches.clear();keys.delete('arrowleft');keys.delete('arrowright')}}ride.update(dt,keys);
if(ride.mode==='playing')ROAD_PATH.turns.forEach((t,i)=>{if(ride.pos>t.start-350&&ride.pos<t.end&&!warnedTurns.has(i)){warnedTurns.add(i);notify('↪ 170° 헤어핀! S를 눌러 드리프트하세요.')}});
for(const event of ride.events){
if(event.type==='nearMiss'){soundTone(880);notify('아슬아슬 회피! +'+event.points+' · COMBO ×'+event.combo)}
if(event.type==='graze'){sound.impact(.3);burst(drivePoint(ride.pos,ride.player*9),15,.7);notify('바위 가장자리를 스쳤어요!')}
if(event.type==='drift'){soundTone(990);notify('DRIFT 성공! +'+event.points+' · 부스트 +35')}
if(event.type==='perfectLand'){soundTone(1100);burst(drivePoint(ride.pos,ride.player*9),25,.8);notify('PERFECT 착지! +'+event.points+' · 순간 가속')}
if(event.type==='letter'){sound.ding();gotAt.set(event.id,time);const it=ride.items.find(o=>o.id===event.id);if(it)dingFX(it);notify(ride.letters===80?'✉ 편지 80통 수집 완료! 우체국으로 가요.':'✉ 따뜻한 편지 +1')}if(event.type==='hit'){sound.impact(1.5);burst(drivePoint(ride.pos,ride.player*9),85,2.6);notify('쾅! 낙석 충돌 — 공중으로 튕겨 나갔어요!')}
if(event.type==='ford'){sound.impact(.6);burst(drivePoint(ride.pos,ride.player*9),70,2.2,'mud');mud.splash(.34,(Math.random()-.5)*1.4);notify('첨벙! 개울을 건넜어요 — 흙탕물이 앞을 가려요!')}
if(event.type==='grass'){sound.impact(.35);burst(drivePoint(ride.pos,ride.player*9),42,1.6,true);notify('풀숲 충격! 도로 쪽으로 튕겨 나갑니다.')}
if(event.type==='rockfall')notify('⚠ 앞쪽 낙석! 큰 바위를 피하세요.');
if(event.type==='rockland'){burst(drivePoint(event.z,event.x*9),60,2);if(Math.abs(event.z-ride.pos)<650)ride.shake=Math.max(ride.shake,.35);}
if(event.type==='jump'){soundTone(440);sound.musicStart();notify('언덕 점프! 오른쪽에서 비행을 따라갑니다.')}
if(event.type==='jumpLand'){sound.impact(.7);burst(drivePoint(ride.pos,ride.player*9),60,1.7);soundTone(95);notify('쿵! 착지 완료 — 다시 전속력!')}
if(event.type==='stone')notify('돌 포장길 — 덜덜덜! 핸들을 잡으세요.');
if(event.type==='snowIn'){sound.impact(.4);burst(drivePoint(ride.pos,ride.player*9),50,1.4,'snow');notify('❄ 갑자기 폭설! 바퀴가 눈에 반쯤 잠겨요 — 느리고 미끄러워요.')}
if(event.type==='snowOut')notify('눈길을 빠져나왔어요 — 다시 속도를 내요!');
if(event.type==='land'){sound.impact(.8);burst(drivePoint(ride.pos,0),55,1.8);soundTone(90);notify('쿵! 도로 복귀 — 다시 가속하세요.');}
if(event.type==='landmark')notify('⌖ '+event.name+'에 도착했어요.');if(event.type==='finish')finish()}
if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').style.opacity=0}syncCamera(false,dt);
wheels.forEach(w=>w.rotation.x-=ride.mode==='playing'?ride.speed*1.35/20*dt/.5:0);bike.visible=true;updateDust(dt);updateGroundFX(dt);updateSparkles(dt);mc.update(time,dt);
// Riding beside the creek throws muddy water onto the lens — more when the bike runs close to the water.
{const cx=ride.mode==='playing'&&ride.pos>CK.start-300&&ride.pos<CK.end+300?ADVENTURE.creekX(ride.pos):null;if(cx!==null&&ride.speed>60&&!ride.jumping&&!ride.crashing){const px=ride.player*9,near=Math.max(0,Math.min(1,1-(Math.abs(px-cx)-3)/10));mudT-=dt*(.35+near*1.5)*Math.min(1,ride.speed/300);if(mudT<=0){mudT=.7+Math.random()*.6;const side=Math.sign(cx-px)||1;mud.splash(.05+near*.12,side*.8);burst(drivePoint(ride.pos-6,px+side*2),8,.9,'mud')}}}
if(ride.mode==='playing'||ride.mode==='finished')mud.update(dt);mud.draw();
for(const {root,s} of worldObjects){root.visible=s>ride.pos-800&&s<ride.pos+4400;if(root.userData.balloon)root.position.y=root.userData.baseY+Math.sin(time*.7+s)*.8}
for(const {item,root,baseY} of itemMeshes){root.position.copy(drivePoint(item.z,item.x*9));root.visible=!(item.type==='rock'&&item.z>ADVENTURE.fork.start&&item.z<ADVENTURE.fork.end&&ride.branchChoice==='safe')&&item.z>ride.pos-120&&item.z<ride.pos+4200&&!ride.collected.has(item.id);if(item.type==='letter'){root.position.y=baseY+Math.sin(time*2+item.id)*.13;root.rotation.y=heading(item.z)+Math.sin(time*.7+item.id)*.2;
  // 먹은 편지: 0.7초 동안 빙글빙글 돌며 위로 솟았다가 반짝 커지고 사라진다
  const got=gotAt.get(item.id);if(got!==undefined&&ride.collected.has(item.id)){const a=time-got;if(a<.7){root.visible=true;root.position.y=baseY+a*7+Math.sin(a*Math.PI)*1.2;root.rotation.y=heading(item.z)+a*22;root.scale.setScalar((1+a*.7)*Math.max(0,1-(a/.7)**3))}else root.visible=false}else root.scale.setScalar(1)}else{
 const age=ride.falling.get(item.id);const drop=age===undefined?0:Math.max(0,24*(1-(age/.9)**2));root.position.y=baseY+drop;
 root.rotation.z=age!==undefined&&age<.9?Math.sin(age*7)*.16:0;
 root.visible=root.visible&&age!==undefined;root.userData.warning.position.y=.04-drop;root.userData.warning.visible=age!==undefined&&age<1.3;
 }}
{const sa=ADVENTURE.snowAmt(ride.pos),fall=sa>.01;snowfall.visible=fall;petals.visible=!fall;frost.style.opacity=(sa*.9).toFixed(3);if(fall){snowMat.opacity=.95*sa;const c=camera.position,f=new T.Vector3();camera.getWorldDirection(f);
  for(let i=0;i<FLAKES;i++){const h=((i*.618-time*(2.6+(i%5)*.35))%14+14)%14,x=Math.sin(i*12.9898)*.5,z=Math.cos(i*78.233)*.5;
   snowPos[i*3]=c.x+f.x*14+x*44+Math.sin(time*.8+i)*.6-h*.55;snowPos[i*3+1]=c.y-6+h*1.15;snowPos[i*3+2]=c.z+f.z*14+z*44+Math.cos(time*.6+i*.7)*.6}snowGeo.attributes.position.needsUpdate=true}}
for(let i=0;i<180;i++){petalPositions[i*3]=bike.position.x+Math.sin(i*54.1+time*.15)*25;petalPositions[i*3+1]=bike.position.y+((i*.73-time*.23)%12+12)%12;petalPositions[i*3+2]=bike.position.z+Math.cos(i*3.1+time*.03)*35}petalGeo.attributes.position.needsUpdate=true;
camera.updateMatrixWorld();for(const l of labels){const dz=l.s-ride.pos;projected.copy(l.position).project(camera);const visible=dz>60&&dz<1500&&Math.abs(projected.x)<.85&&projected.y>-.65&&projected.y<.6&&projected.z<1;l.e.style.display=visible?'block':'none';if(visible){l.e.style.left=(projected.x*.5+.5)*innerWidth+'px';l.e.style.top=(-projected.y*.5+.5)*innerHeight+'px';l.e.textContent=(ride.visited.has(l.index)?'✓ ':'')+landmarks[l.index].name}}
sound.update(ride,time);sound.musicSync(ride);
const rush=ride.mode==='playing'?T.MathUtils.smoothstep(ride.speed,150,460):0;
windMat.opacity=rush*.32;wind.visible=rush>.01;windTravel+=ride.mode==='playing'?ride.speed*dt*.018:0;
for(let i=0;i<64;i++){const side=i%2?1:-1,z=-3-((i*1.73-windTravel)%27+27)%27,x=side*(2.8+(i%7)*.6),y=Math.sin(i*7.13)*7;
 const at=i*6;windData[at]=x;windData[at+1]=y;windData[at+2]=z;windData[at+3]=x;windData[at+4]=y;windData[at+5]=z+(.5+rush*2.8);}
windGeo.attributes.position.needsUpdate=true;
const biome=ADVENTURE.biome(ride.pos,ride.branchChoice);scene.background.lerp(new T.Color(biome.sky),1-Math.exp(-dt*1.5));scene.fog.color.lerp(new T.Color(biome.fog),1-Math.exp(-dt*1.5));scene.fog.near+=((biome.fogNear||65)-scene.fog.near)*(1-Math.exp(-dt*1.5));scene.fog.far+=((biome.fogFar||230)-scene.fog.far)*(1-Math.exp(-dt*1.5));
landingRing.visible=ride.jumping;
if(ride.jumping){let t=0,s=ride.pos,y=ride.flightY,v=ride.airV;while(t<4){t+=.04;s+=ride.speed*1.35*.04*ADVENTURE.travelScale(s,ride.branchChoice);v-=16*.04;y+=v*.04;if(y<=height(s))break}landingRing.position.copy(drivePoint(s,ride.player*9));landingRing.position.y+=.05;landingRing.material.color.set(ride.airV<0&&ride.airY<4?'#a9e6a0':'#f1d886');}
if(frame++%4===0)hud();renderer.render(scene,camera);requestAnimationFrame(tick)}requestAnimationFrame(tick);
window.rideDebug={ride,start,keys,camera,renderer,canyon,scene,T,drivePoint,mud,snowfall,sound,snap:()=>syncCamera(true)};window.getGameState=()=>({mode:ride.mode,pos:ride.pos,speed:ride.speed,letters:ride.letters,energy:ride.energy,landmarksVisited:ride.visited.size,airHeight:ride.airY,crashing:ride.crashing,jumping:ride.jumping,surface:ride.surface,score:ride.score,combo:ride.combo,drifting:ride.drifting,branch:ride.branchChoice,renderer:'Three.js WebGL',drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
})();
