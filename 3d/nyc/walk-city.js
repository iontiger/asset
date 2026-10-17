/* 뉴욕 거리 산책(3d/nyc) — 걸어 다니는 시내 배치. ../ride/city.js 와 같은 모양(C)을 만들어 ../ride/city-scene.js 가 그대로 그린다.
   - 차는 없다(cars: []) · 단속 카메라 · 배달 · 체증 없음. 신호등은 보행 신호처럼 빨강 ↔ 초록을 되풀이하고, 빨간불이면 횡단보도 사람들이 건넌다.
   - 좌표: R 동쪽 · F 북쪽 (월드 x = R, z = -F). 진행 값 s = 길 따라 잰 길이 u (걷는 사람에게 가장 가까운 길 위 점).
   make(opt) → C. opt: V(꼭짓점) · names · lights[{k,d}] · crossStreets · BB · EXCL · NOB · vents · stacks · npc · brick */
(function(root){
 function make(opt){
  const CR=9,LANE=2.5,HALF=4.95,WALK=9.5,YC=3.8,V=opt.V,NAMES=opt.names;
  const world=(R,F)=>({x:R,z:-F}),local=(x,z)=>({R:x,F:-z});
  const segs=[];for(let k=0;k<V.length-1;k++){const a=V[k],b=V[k+1],len=Math.hypot(b[0]-a[0],b[1]-a[1]),dir=[(b[0]-a[0])/len,(b[1]-a[1])/len];segs.push({k,a,b,len,dir,right:[dir[1],-dir[0]],name:NAMES[k]})}
  const LAST=segs.length-1,raw=[],marks=[];let acc=0;const addPt=(R,F)=>{if(raw.length){const p=raw[raw.length-1];acc+=Math.hypot(R-p[0],F-p[1])}raw.push([R,F,acc])};
  segs.forEach((g,k)=>{const s0=k?CR:0,s1=g.len-(k<LAST?CR:0),n=Math.max(1,Math.ceil(s1-s0));
   for(let i=0;i<=n;i++){if(i===0&&k>0)continue;const d=s0+(s1-s0)*i/n;addPt(g.a[0]+g.dir[0]*d,g.a[1]+g.dir[1]*d)}
   g.uS0=k?marks[k-1].ub:0;g.dS0=s0;g.dS1=s1;g.uS1=acc;
   if(k<LAST){const h=segs[k+1],c=g.b,p=[c[0]-g.dir[0]*CR,c[1]-g.dir[1]*CR],q=[c[0]+h.dir[0]*CR,c[1]+h.dir[1]*CR],ua=acc;
    for(let i=1;i<=24;i++){const t=i/24,u=1-t;addPt(u*u*p[0]+2*u*t*c[0]+t*t*q[0],u*u*p[1]+2*u*t*c[1]+t*t*q[1])}
    const cross=g.dir[0]*h.dir[1]-g.dir[1]*h.dir[0];marks.push({k,ua,ub:acc,side:cross>0?-1:1,to:h.name})}});
  const Lc=acc,STEP=.5,N=Math.ceil(Lc/STEP)+1,LR=new Float32Array(N),LF=new Float32Array(N);
  {let j=0;for(let i=0;i<N;i++){const u=Math.min(Lc,i*STEP);while(j<raw.length-2&&raw[j+1][2]<u)j++;const a=raw[j],b=raw[j+1],f=b[2]>a[2]?(u-a[2])/(b[2]-a[2]):0;LR[i]=a[0]+(b[0]-a[0])*f;LF[i]=a[1]+(b[1]-a[1])*f}}
  function localAt(u){u=Math.max(0,Math.min(Lc,u));const f=u/STEP,i=Math.min(N-2,Math.floor(f)),t=f-i;return [LR[i]+(LR[i+1]-LR[i])*t,LF[i]+(LF[i+1]-LF[i])*t]}
  function pathNormal(u){const a=localAt(u-.6),b=localAt(u+.6),l=Math.hypot(b[0]-a[0],b[1]-a[1])||1;return [(b[1]-a[1])/l,-(b[0]-a[0])/l]}
  function segOf(u){for(let k=0;k<LAST;k++)if(u<(marks[k].ua+marks[k].ub)/2)return k;return LAST}
  function onSeg(u,lat,k=segOf(u)){const g=segs[k],p=localAt(u),dx=p[0]-g.a[0],dz=p[1]-g.a[1];return {k,d:dx*g.dir[0]+dz*g.dir[1],lat:dx*g.right[0]+dz*g.right[1]+lat}}
  const segPoint=(k,d,lat)=>{const g=segs[k];return [g.a[0]+g.dir[0]*d+g.right[0]*lat,g.a[1]+g.dir[1]*d+g.right[1]*lat]};
  const uAt=(k,d)=>segs[k].uS0+(d-segs[k].dS0);
  function point(s,lat){const p=localAt(s),n=pathNormal(s),w=world(p[0]+n[0]*lat,p[1]+n[1]*lat);return {x:w.x,y:YC,z:w.z}}
  // 길 위에서 (R,F) 에 가장 가까운 u (걷는 사람의 '진행 값' — 신호 · 사람 · 비둘기 거리 계산에 쓴다)
  function nearestU(R,F){let best=0,bd=1e18;for(let i=0;i<N;i+=2){const d=(LR[i]-R)**2+(LF[i]-F)**2;if(d<bd){bd=d;best=i}}return best*STEP}
  const lights=(opt.lights||[]).map((l,i)=>Object.assign({},l,{i,u:uAt(l.k,l.d)}));
  // 걸을 수 있는 길(차도 + 양쪽 보도): city-scene 과 같은 규칙으로 길 목록을 만든다 (경로 · 모서리 막다른 길 · 가로 길)
  const streets=[];const addStreet=(a,b,main)=>{if(Math.abs(a[0]-b[0])<.01)streets.push({axis:'F',c:a[0],lo:Math.min(a[1],b[1]),hi:Math.max(a[1],b[1]),main});else streets.push({axis:'R',c:a[1],lo:Math.min(a[0],b[0]),hi:Math.max(a[0],b[0]),main})};
  segs.forEach(s=>addStreet(s.a,s.b,true));
  for(let k=1;k<segs.length;k++){const v=V[k],di=segs[k-1].dir,dout=segs[k].dir;addStreet(v,[v[0]+di[0]*40,v[1]+di[1]*40],false);addStreet(v,[v[0]-dout[0]*40,v[1]-dout[1]*40],false)}
  for(const cs of opt.crossStreets||[])addStreet(segPoint(cs.k,cs.d,cs.from),segPoint(cs.k,cs.d,cs.to),false);
  // 그 점이 길 안이면 {road: 차도 위?} (아니면 null)
  function onStreet(R,F){let hit=null;for(const s of streets){const t=s.axis==='F'?F:R,q=s.axis==='F'?R-s.c:F-s.c;if(t<s.lo-WALK||t>s.hi+WALK||Math.abs(q)>WALK)continue;const road=Math.abs(q)<HALF&&t>=s.lo-HALF&&t<=s.hi+HALF;if(road)return {road:true};hit={road:false}}return hit}
  return {walk:true,P0:{x:0,z:0},yaw0:0,world,local,V,segs,marks,Lc,travelScale:1,uOf:s=>s,sOf:u=>u,y:()=>YC,YC,latScale:()=>1,laneShift:()=>0,latOf:(u,p)=>p,
   localAt,pathNormal,point,segPoint,onSeg,segOf,uAt,lights,cameras:[],crossStreets:opt.crossStreets||[],deliveries:[],jam:{k:-1},
   CR,LANE,HALF,WALK,LIMIT:25,BB:opt.BB,EXCL:opt.EXCL,NOB:opt.NOB,vents:opt.vents,stacks:opt.stacks,npc:opt.npc,brick:opt.brick,noCenter:opt.noCenter,
   streets,onStreet,nearestU,inCity:()=>true,toU:v=>v,toSim:v=>v,
   newState(){return {deliveries:[],delivered:0,lights:lights.map((l,i)=>({state:i%2?'red':'green',t:(i*3.7)%9,wait:0,done:false,ran:false})),cams:[],cars:[],inside:true,bumpT:0}},
   // 보행 신호: 초록 11초 → 노랑 2초 → 빨강 9초 (빨간불 = 차 신호가 멈춤이라 횡단보도로 사람들이 건넌다)
   updateLights(st,dt){for(const s of st.lights){s.t+=dt;if(s.state==='green'&&s.t>11){s.state='yellow';s.t=0}else if(s.state==='yellow'&&s.t>2){s.state='red';s.t=0}else if(s.state==='red'&&s.t>9){s.state='green';s.t=0}}}}}
 root.NYC_WALK_CITY={make};if(typeof module!=='undefined')module.exports={make};
})(typeof window!=='undefined'?window:globalThis);
