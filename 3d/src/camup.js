/* DentPhoto 마을 — 카메라 올리기 버전 (주소 끝에 ?cam=up)
   나무를 반투명하게 하는 대신, 카메라와 주인공 사이를 나뭇잎이 가리면 카메라가 주인공 둘레를 따라 위로 올라가
   내려다본다. 가리는 것이 없어지면 천천히 원래 높이로 내려온다. 기본 주소(?cam=up 없음)는 반투명 방식 그대로. */
(()=>{
if(!/[?&]cam=up\b/.test(location.search))return;
window.dpOccOff=1;   // 반투명 방식은 끈다
// 나뭇잎 덩어리를 모양 그대로 모은다 — 둥근 나무의 잎은 공, 소나무 잎은 원뿔. 6칸 격자에 넣어 둔다
const CELL=6,grid=new Map();let count=0;
const _m=new THREE.Matrix4(),_c=new THREE.Vector3(),_s=new THREE.Vector3(),_q=new THREE.Quaternion(),_p=new THREE.Vector3();
function leafy(g){if(!g)return false;const P=g.parameters||{};if(g.type==='IcosahedronGeometry')return P.radius>=1;if(g.type==='CylinderGeometry')return (P.radiusTop===0&&P.radiusBottom>=.8)||(P.radiusTop===.2&&P.radiusBottom===.32);return false}   // 잎(공 · 원뿔)과 나무 기둥
function skip(o){for(let p=o;p;p=p.parent){if(characterGroups.some(c=>c.root===p))return true;if(typeof npcGroups!=='undefined'&&npcGroups.some(n=>n.root===p))return true}return false}
function put(sh,R){const x0=Math.floor((sh.x-R)/CELL),x1=Math.floor((sh.x+R)/CELL),z0=Math.floor((sh.z-R)/CELL),z1=Math.floor((sh.z+R)/CELL);
  for(let i=x0;i<=x1;i++)for(let j=z0;j<=z1;j++){const k=i+','+j;let a=grid.get(k);if(!a)grid.set(k,a=[]);a.push(sh)}count++}
function addShape(g,m){const P=g.parameters||{};m.decompose(_p,_q,_s);const sc=Math.max(_s.x,_s.y,_s.z);
  if(g.type==='CylinderGeometry'&&P.radiusTop>0){_c.set(0,-P.height/2,0).applyMatrix4(m);put({k:2,x:_c.x,y:_c.y,z:_c.z,h:P.height*sc,rb:.3*sc,c:0},.3*sc);return}   // 기둥: 곧은 원기둥
  if(g.type==='CylinderGeometry'){_c.set(0,-P.height/2,0).applyMatrix4(m);put({k:1,x:_c.x,y:_c.y,z:_c.z,h:P.height*sc,rb:P.radiusBottom*sc,c:0},P.radiusBottom*sc);return}   // 원뿔: 밑면 중심 · 높이 · 밑면 반지름
  if(!g.boundingSphere)g.computeBoundingSphere();_c.copy(g.boundingSphere.center).applyMatrix4(m);const r=g.boundingSphere.radius*sc*.97;put({k:0,x:_c.x,y:_c.y,z:_c.z,r,c:0},r)}
function collect(){grid.clear();count=0;scene.updateMatrixWorld();scene.traverse(o=>{if(!o.isMesh||!leafy(o.geometry)||skip(o))return;
  if(o.isInstancedMesh){for(let i=0;i<o.count;i++){o.getMatrixAt(i,_m);_m.premultiply(o.matrixWorld);addShape(o.geometry,_m)}}else addShape(o.geometry,o.matrixWorld)})}
try{collect()}catch(e){console.error(e)}
if(typeof rebuildVillage==='function'){const _rv=rebuildVillage;rebuildVillage=function(){_rv.apply(this,arguments);try{collect();makeSolid();stampTrees()}catch(e){console.error(e)}}}
// 나무 속으로 걸어 들어가면 어느 카메라 자리에서도 잎이 머리를 덮으니, 이 버전에서는 머리 높이의 잎 둘레를 못 지나가게 한다
const solid=[];
function headR(sh){const y=terrainHeight(sh.x,sh.z)+1.3;if(sh.k===0){const d=y-sh.y;return Math.abs(d)<sh.r?Math.sqrt(sh.r*sh.r-d*d):0}const t=(y-sh.y)/sh.h;return t>=0&&t<=1?(sh.k===2?sh.rb:sh.rb*(1-t)):0}
function makeSolid(){solid.length=0;const seenS=new Set();grid.forEach(a=>a.forEach(sh=>{if(seenS.has(sh))return;seenS.add(sh);const r=headR(sh)*.95;if(r>.3)solid.push({x:sh.x,z:sh.z,r})}))}
function stampTrees(){for(const t of solid)stamp(WALK,t.x,t.z,t.r,0)}
// (이미 그 안에 서 있으면 빠져나갈 수 있게 그 나무는 봐준다)
const _wk=walkable;walkable=function(x,z){if(!_wk(x,z))return false;const arr=grid.get(Math.floor(x/CELL)+','+Math.floor(z/CELL));if(arr)for(const sh of arr){if(sh.sr==null)sh.sr=headR(sh)*.95;if(sh.sr>.3){const r2=sh.sr*sh.sr,px=player.x-sh.x,pz=player.z-sh.z;if(px*px+pz*pz<r2)continue;const dx=x-sh.x,dz=z-sh.z;if(dx*dx+dz*dz<r2)return false}}return true};
const _bw=buildWalkGrid;buildWalkGrid=function(){_bw.apply(this,arguments);try{stampTrees()}catch(e){console.error(e)}};
try{makeSolid();stampTrees()}catch(e){console.error(e)}
function inside(sh,x,y,z){if(sh.k===0){const dx=x-sh.x,dy=y-sh.y,dz=z-sh.z;return dx*dx+dy*dy+dz*dz<sh.r*sh.r}
  const t=(y-sh.y)/sh.h;if(t<0||t>1)return false;const dx=x-sh.x,dz=z-sh.z,R=sh.k===2?sh.rb:sh.rb*(1-t);return dx*dx+dz*dz<R*R}
// 선분 a(주인공 머리)→b(카메라)를 0.4칸마다 짚어 잎 속을 지나가나 본다. 머리가 이미 잎 속이면 그 잎은 어느 쪽이든 못 피하니 뺀다
let call=0;
function blocked(a,b){call++;const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,len=Math.hypot(dx,dy,dz),n=Math.max(2,Math.ceil(len/.4));
  for(let k=2;k<=n;k++){const t=k/n,x=a.x+dx*t,y=a.y+dy*t,z=a.z+dz*t,arr=grid.get(Math.floor(x/CELL)+','+Math.floor(z/CELL));if(!arr)continue;
    for(const sh of arr){if(sh.c!==call){sh.c=call;sh.hin=inside(sh,a.x,a.y,a.z)}if(!sh.hin&&inside(sh,x,y,z))return true}}
  return false}
// 후보 자리: 먼저 위로(높이각 +) 끝까지 → 옆으로 돌기(방위 ±) → 잎 아래로 낮추기(높이각 −). 덜 움직이는 순서로 찾는다
const MAXE=1.4,MINE=.04,CAND=[];for(let i=-3;i<=12;i++)for(const az of [0,.35,-.35,.7,-.7,1.05,-1.05,1.4,-1.4]){const de=i*.1;CAND.push({de,az,c:(de>=0?de:1.25-de)+Math.abs(az)*4})}CAND.sort((p,q)=>p.c-q.c);
const H=new THREE.Vector3(),T=new THREE.Vector3(),B2=new THREE.Vector3();   // H 머리 · B2 몸통 — 둘 다 보여야 '안 가림'
let curE=null,curA=0,hold=0,tW=0,wDE=0,wA=0;
function spot(out,e,az,ang0,L){const a=ang0+az;out.set(H.x+Math.sin(a)*L*Math.cos(e),H.y+L*Math.sin(e),H.z+Math.cos(a)*L*Math.cos(e));return out}
// updateCamera(산책 시점)가 원하는 카메라 자리를 정한 직후에 불린다 — 가리면 주인공 둘레로 들어 올린다
window.dpCamUp=function(pos,aim,h,dt){try{   // H: 보이는 주인공의 머리 높이
  const hr=(characterGroups.find(c=>c.root.visible)||{}).root;if(hr)H.set(hr.position.x,hr.position.y+1.3,hr.position.z);else H.set(player.x,h+1.3,player.z);const ox=pos.x-H.x,oz=pos.z-H.z,hl=Math.hypot(ox,oz)||1e-3,L=Math.hypot(hl,pos.y-H.y),e0=Math.atan2(pos.y-H.y,hl),ang0=Math.atan2(ox,oz);
  if((tW-=dt)<=0||curE==null){tW=.08;let found=false;for(const c of CAND){const e=Math.max(MINE,Math.min(MAXE,e0+c.de));spot(T,e,c.az,ang0,L);if(!blocked(H,T)&&!blocked(B2.set(H.x,H.y-.75,H.z),T)){wDE=e-e0;wA=c.az;found=true;break}}if(!found){wDE=MAXE-e0;wA=0}}   // 0.08초마다 다시 찾는다
  const wE=e0+wDE;
  if(curE==null||window.dpCamUpInstant){curE=wE;curA=wA}   // dpCamUpInstant: 시험용 — 바로 목표 자리로
  if(Math.abs(wE-e0)>Math.abs(curE-e0)+.01||Math.abs(wA)>Math.abs(curA)+.01){hold=.6;const k=Math.min(1,dt*5);curE+=(wE-curE)*k;curA+=(wA-curA)*k}
  else if((hold-=dt)<=0){const k=Math.min(1,dt*1.4);curE+=(wE-curE)*k;curA+=(wA-curA)*k}
  const e=curE;if(Math.abs(e-e0)<.005&&Math.abs(curA)<.005)return;
  spot(pos,e,curA,ang0,L);pos.y=Math.max(pos.y,terrainHeight(pos.x,pos.z)+.6);
  const w=Math.min(1,Math.max((e-e0)/(MAXE-e0),Math.abs(curA)/1.4*.6,(e0-e)/(e0-MINE+1e-3)*.5));aim.lerp(T.set(H.x,H.y-.4,H.z),w*.85)   // 많이 움직일수록 주인공 쪽을 본다
}catch(e){console.error(e)}};
window.dpCamUpInfo=()=>({count,curE,curA});window.dpCamUpSnap=()=>{curE=null};window.dpCamUpBlocked=(a,b)=>blocked(a,b);window.dpCamUpGrid=grid;window.dpCamUpAt=(x,y,z)=>(grid.get(Math.floor(x/CELL)+","+Math.floor(z/CELL))||[]).filter(sh=>Math.hypot(sh.x-x,sh.z-z)<4).map(sh=>({k:sh.k,x:+sh.x.toFixed(2),y:+sh.y.toFixed(2),z:+sh.z.toFixed(2),r:sh.r&&+sh.r.toFixed(2),h:sh.h&&+sh.h.toFixed(2),rb:sh.rb&&+sh.rb.toFixed(2),in:inside(sh,x,y,z)}));window.dpCamUpNear=(x,z)=>[...(grid.get(Math.floor(x/CELL)+","+Math.floor(z/CELL))||[])];   // 시험용: 바로 목표 높이로
setTimeout(()=>{try{toast('📷 카메라 올리기 버전 — 나무가 가리면 카메라가 위로 올라가요')}catch{}},2500);
})();
