/* 뉴욕 시내 — 갈림길에서 '2 · 마을길'을 고르면 지나가는 빌딩 숲 (렌더링과 무관한 배치 · 신호 · 단속 · 차량 시뮬레이션).
   - 동서남북 격자의 직선 도로를 좌회전 4번 · 우회전 4번 하며 달려 원래 길(갈림길 끝)과 다시 만난다. 아스팔트 왕복 1차선.
   - 입구 신호에서 0 km/h 까지 멈춘 뒤 직접 출발한다(협곡의 250 km/h 고정 없음). 신호 위반 -200 · 과속(60 km/h 초과) 카메라 -150.
   - 첫 좌회전 뒤 W 42 ST 는 양쪽 차선이 꽉 막힌 교통 체증: 앞에 차가 있으면 더 나아갈 수 없다.
   단위: 길이 u = 월드 단위(협곡 길과 같은 비율, s 20 = 1 u). 갈림길 구간 s 20000–40000 을 시내 길 0–Lc 에 비례로 대응한다. */
(function(root){
 const path=root.ROAD_PATH||(typeof require==='function'?require('./road-path.js'):null);
 const A=root.ADVENTURE||(typeof require==='function'?require('./adventure.js'):null);
 const FK=A.fork,sstep=A.sstep,CR=9,LANE=2.5,HALF=4.95,WALK=9.5,YC=3.8,LIMIT=60;
 // 갈림길 시작점 기준 지역 좌표 (R = 오른쪽, F = 앞)
 const P0=path.at(FK.start),P1=path.at(FK.end),yaw0=path.yaw(FK.start);
 const fx=Math.sin(yaw0),fz=-Math.cos(yaw0),rx=Math.cos(yaw0),rz=Math.sin(yaw0);
 const world=(R,F)=>({x:P0.x+rx*R+fx*F,z:P0.z+rz*R+fz*F});
 const local=(x,z)=>{const dx=x-P0.x,dz=z-P0.z;return {R:dx*rx+dz*rz,F:dx*fx+dz*fz}};
 const end=local(P1.x,P1.z);
 // 꼭짓점: 북 → 좌(서) → 우(북) → 우(동) → 우(남) → 좌(동) → 우(남) → 좌(동) → 좌(북) → 원래 길
 const V=[[0,0],[0,55],[-110,55],[-110,160],[80,160],[80,70],[150,70],[150,-260],[end.R,-260],[end.R,end.F]];
 const NAMES=['BROADWAY','W 42 ST','7 AV','W 57 ST','5 AV','E 50 ST','PARK AV','E 14 ST','BOWERY'];
 const segs=[];
 for(let k=0;k<V.length-1;k++){const a=V[k],b=V[k+1],len=Math.hypot(b[0]-a[0],b[1]-a[1]),dir=[(b[0]-a[0])/len,(b[1]-a[1])/len];segs.push({k,a,b,len,dir,right:[dir[1],-dir[0]],name:NAMES[k]})}
 const LAST=segs.length-1;
 // 경로: 직선 + 모서리마다 반지름 CR 곡선(2차 베지어). 0.5 u 간격으로 다시 표본.
 const raw=[];let acc=0;const addPt=(R,F)=>{if(raw.length){const p=raw[raw.length-1];acc+=Math.hypot(R-p[0],F-p[1])}raw.push([R,F,acc])};
 const marks=[];
 segs.forEach((g,k)=>{const s0=k?CR:0,s1=g.len-(k<LAST?CR:0);const n=Math.max(1,Math.ceil(s1-s0));
  for(let i=0;i<=n;i++){if(i===0&&k>0)continue;const d=s0+(s1-s0)*i/n;addPt(g.a[0]+g.dir[0]*d,g.a[1]+g.dir[1]*d)}
  g.uS0=k?marks[k-1].ub:0;g.dS0=s0;g.dS1=s1;g.uS1=acc;
  if(k<LAST){const h=segs[k+1],c=g.b,p=[c[0]-g.dir[0]*CR,c[1]-g.dir[1]*CR],q=[c[0]+h.dir[0]*CR,c[1]+h.dir[1]*CR],ua=acc;
   for(let i=1;i<=24;i++){const t=i/24,u=1-t;addPt(u*u*p[0]+2*u*t*c[0]+t*t*q[0],u*u*p[1]+2*u*t*c[1]+t*t*q[1])}
   const cross=g.dir[0]*h.dir[1]-g.dir[1]*h.dir[0];marks.push({k,ua,ub:acc,side:cross>0?-1:1,to:h.name})}});
 const Lc=acc,STEP=.5,N=Math.ceil(Lc/STEP)+1,LR=new Float32Array(N),LF=new Float32Array(N);
 {let j=0;for(let i=0;i<N;i++){const u=Math.min(Lc,i*STEP);while(j<raw.length-2&&raw[j+1][2]<u)j++;const a=raw[j],b=raw[j+1],f=b[2]>a[2]?(u-a[2])/(b[2]-a[2]):0;LR[i]=a[0]+(b[0]-a[0])*f;LF[i]=a[1]+(b[1]-a[1])*f}}
 function localAt(u){u=Math.max(0,Math.min(Lc,u));const f=u/STEP,i=Math.min(N-2,Math.floor(f)),t=f-i;return [LR[i]+(LR[i+1]-LR[i])*t,LF[i]+(LF[i+1]-LF[i])*t]}
 // s(협곡과 같은 진행 값) ↔ u(시내 길이). 갈림길 앞뒤는 s 20 = 1 u.
 const SPAN=FK.end-FK.start,travelScale=SPAN/20/Lc;
 const uOf=s=>s<FK.start?(s-FK.start)/20:s>FK.end?Lc+(s-FK.end)/20:(s-FK.start)/SPAN*Lc;
 const sOf=u=>u<0?FK.start+u*20:u>Lc?FK.end+(u-Lc)*20:FK.start+u/Lc*SPAN;
 // 길 높이: 입구 30 u 동안 시내 바닥(YC)까지 오르고, 출구 45 u 동안 원래 길 높이로 내려간다.
 let h0=null,h1=null;
 function y(u){if(h0===null){h0=root.ROAD_HEIGHT(FK.start);h1=root.ROAD_HEIGHT(FK.end)}return u<30?h0+(YC-h0)*sstep(0,30,u):u>Lc-45?YC+(h1-YC)*sstep(Lc-45,Lc,u):YC}
 // 좌우 폭: 협곡 길(반폭 9)에서 시내 길(반폭 4.95)로 부드럽게 좁아진다.
 const inner=u=>Math.min(sstep(0,25,u),sstep(Lc,Lc-25,u));
 const latScale=u=>1-.45*inner(u);
 // 시내에서는 가운데(0)가 오른쪽 차선 한가운데가 되도록 옮긴다(우측 통행).
 const laneShift=u=>LANE*inner(u);
 const latOf=(u,player)=>laneShift(u)+player*9*latScale(u);
 function segOf(u){for(let k=0;k<LAST;k++)if(u<(marks[k].ua+marks[k].ub)/2)return k;return LAST}
 // 경로 위 u 와 좌우(월드 단위) → 그 구간 직선 기준 (d 앞, lat 오른쪽)
 function onSeg(u,lat,k=segOf(u)){const g=segs[k],p=localAt(u),dx=p[0]-g.a[0],dz=p[1]-g.a[1];const n=pathNormal(u);return {k,d:dx*g.dir[0]+dz*g.dir[1],lat:dx*g.right[0]+dz*g.right[1]+lat*(n[0]*g.right[0]+n[1]*g.right[1])}}
 function pathNormal(u){const a=localAt(u-.6),b=localAt(u+.6),l=Math.hypot(b[0]-a[0],b[1]-a[1])||1;return [(b[1]-a[1])/l,-(b[0]-a[0])/l]}
 function point(s,lat){const u=uOf(s),p=localAt(u),n=pathNormal(u),L=laneShift(u)+lat*latScale(u),w=world(p[0]+n[0]*L,p[1]+n[1]*L);return {x:w.x,y:y(u),z:w.z}}
 const segPoint=(k,d,lat)=>{const g=segs[k];return [g.a[0]+g.dir[0]*d+g.right[0]*lat,g.a[1]+g.dir[1]*d+g.right[1]*lat]};
 const uAt=(k,d)=>segs[k].uS0+(d-segs[k].dS0);
 // 신호등(정지선 위치): 입구 신호는 무조건 빨간불 → 0 km/h 정차. trigger=false 는 초록불 그대로 통과.
 const lights=[{k:0,d:55-WALK-4.5,gate:true},{k:2,d:105-WALK-4.5,trigger:true},{k:3,d:95-WALK-4.5,trigger:false,cross:95},{k:4,d:90-WALK-4.5,trigger:true},{k:6,d:110-WALK-4.5,trigger:true,cross:110},{k:6,d:230-WALK-4.5,trigger:true,cross:230}];
 lights.forEach((l,i)=>{l.i=i;l.u=uAt(l.k,l.d)});
 const cameras=[{k:2,d:45},{k:3,d:150},{k:6,d:55},{k:6,d:170}];cameras.forEach((c,i)=>{c.i=i;c.u=uAt(c.k,c.d)});
 // 가로지르는 길(신호가 있는 교차로 + W 57 ST 에서 W 42 ST 까지 내려가는 길)
 const crossStreets=[{k:3,d:95,from:-40,to:105},{k:6,d:110,from:-45,to:110},{k:6,d:230,from:-45,to:110}];   // from/to: 그 구간 오른쪽(+) 기준 가로 길이
 const jam={k:1};jam.u0=segs[1].uS0;jam.u1=segs[1].uS1;

 // ── 차량: 구간 직선 위 d · 차선(+1 같은 방향 / -1 맞은편). v 는 u/s.
 function newCars(){const cars=[];let id=0;
  // W 42 ST 교통 체증: 내 차선은 꼬리부터 머리까지 꽉, 맞은편도 꽉
  for(let d=15;d<=140;d+=7.2)cars.push({id:id++,k:1,d,lane:1,v:0,jam:true,taxi:id%3===0,c:id%7});
  for(let d=124;d>=13;d-=7.4)cars.push({id:id++,k:1,d,lane:-1,v:0,jam:true,parked:true,taxi:id%4===0,c:id%7});   // 맞은편은 꼼짝 않는다
  // 다른 길: 맞은편 차선으로 차들이 지나간다(내가 그 차선에 있으면 멈춰 준다)
  for(const k of [2,3,4,5,6,7]){const g=segs[k];for(let d=g.len+30,j=0;d>-30;d-=34+((k*7+j*13)%5)*7,j++)cars.push({id:id++,k,d,lane:-1,v:7,flow:true,taxi:(id+k)%3===0,c:(id*3+k)%7})}
  return cars}
 function newState(){return {lights:lights.map(()=>({state:'green',t:0,wait:0,done:false,ran:false})),cams:cameras.map(()=>false),cars:newCars(),jamOn:false,jamT:0,inside:false,bumpT:0,jamNoted:false}}
 const toSim=v=>v*20/1.35,toU=v=>v*1.35/20;
 function pen(r,kind,pts,extra){r.score=Math.max(0,r.score-pts);r.combo=0;r.comboTime=0;r.events.push(Object.assign({type:'penalty',kind,points:-pts},extra||{}))}
 // 지금 가장 가까운 앞쪽 신호(정지선까지 남은 u 포함)
 function nextLight(r){const st=r.city;if(!st)return null;const pu=uOf(r.pos);for(const l of lights){const s=st.lights[l.i];if(l.u>pu-1)return {l,s,dist:l.u-pu}}return null}
 // 매 프레임: 신호 · 차량 상태를 바꾼다(속도 계산 전에)
 function update(r,dt){const st=r.city;const pu=uOf(r.pos),pspd=toU(r.speed);
  for(const l of lights){const s=st.lights[l.i],dist=l.u-pu;
   if(l.gate){if(!s.done){s.state='red';if(dist>-1&&dist<34&&r.speed<4)s.wait+=dt;if(s.wait>1.2){s.state='green';s.done=true;r.events.push({type:'cityGo'})}}continue}
   if(l.trigger&&!s.done&&s.state==='green'&&dist>0&&dist<70){s.state='yellow';s.t=0}
   if(s.state==='yellow'){s.t+=dt;if(s.t>2){s.state='red';s.t=0;s.wait=0}}
   else if(s.state==='red'){s.t+=dt;if(dist>0&&dist<34&&r.speed<4)s.wait+=dt;if(!s.ran&&(s.wait>1.4||s.t>11)){s.state='green';s.done=true}if(s.ran&&s.t>2.5)s.state='green'}}
  // 교통 체증은 내가 W 42 ST 에 가까이 와야 움직이기 시작한다(그 전엔 꽉 서 있다)
  if(!st.jamOn&&pu>jam.u0-30&&r.mode==='playing')st.jamOn=true;if(st.jamOn)st.jamT+=dt;
  const me=pu>-5&&pu<Lc+5?onSeg(pu,latOf(pu,r.player)):null;
  const groups=new Map();for(const c of st.cars){if(c.gone)continue;const key=c.k*2+(c.lane>0?1:0);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c)}
  for(const list of groups.values()){const lane=list[0].lane,g=segs[list[0].k];list.sort((a,b)=>(b.d-a.d)*lane);
   for(let i=0;i<list.length;i++){const c=list[i];let target;
    if(c.parked){c.v=0;continue}
    if(c.jam){if(!st.jamOn){c.v=0;continue}target=5.8*(1-Math.cos(st.jamT*2*Math.PI/5))}else target=c.flow?7:0;
    // 맞은편 차도 같은 신호를 본다: 교차로 건너편 정지선 앞에서 선다(이미 교차로에 들어선 차는 그대로)
    if(c.flow)for(const l of lights){if(l.k!==c.k||l.cross===undefined||st.lights[l.i].state==='green')continue;const stopD=l.cross+WALK+4.5,m=c.d-2.6-stopD;if(m>-1&&m<60)target=Math.min(target,Math.max(0,m*1.6))}
    if(i>0){const ahead=list[i-1],gap=(ahead.d-c.d)*lane-6.4;target=Math.min(target,Math.max(0,gap*1.6))}
    // 내가 이 차 앞(진행 방향)에 같은 차선으로 있으면 기다린다
    if(me&&me.k===c.k&&Math.abs(me.lat-lane*LANE)<3){const gap=(me.d-c.d)*lane-4.4;if(gap>-2.5)target=Math.min(target,Math.max(0,(gap-1)*1.6))}
    c.v+=Math.max(-14*dt,Math.min(6*dt,target-c.v));c.d+=c.v*lane*dt;
    if(c.flow&&c.d<-45)c.d+=g.len+90;
    if(c.jam&&lane>0&&c.d>g.len+38)c.gone=true}}
  st.bumpT=Math.max(0,st.bumpT-dt);
 }
 // 속도 상한: 입구 · 빨간불(자동 정차 모드) 정지선 앞에서 서서히 0, 모서리에선 천천히
 function cap(r){const st=r.city,pu=uOf(r.pos);let c=Infinity;
  for(const l of lights){const s=st.lights[l.i],dist=l.u-pu;if(dist<-1||dist>140)continue;if(s.state!=='green'&&(l.gate||r.autoStop))c=Math.min(c,68.8*Math.sqrt(Math.max(0,dist-2.5)))}
  for(const m of marks)if(pu<m.ub&&pu>m.ua-70)c=Math.min(c,150+68.8*Math.sqrt(Math.max(0,m.ua-pu)));
  if(r.autoStop&&pu>0&&pu<Lc)c=Math.min(c,112);
  return c}
 // 이동한 뒤: 앞차에 막힘 · 신호 위반 · 과속 단속
 function after(r,before,dt){const st=r.city,u0=uOf(before);let pu=uOf(r.pos);
  const me=pu>0&&pu<Lc?onSeg(pu,latOf(pu,r.player)):null;
  // 교차로 안(모서리 곡선)에서는 막지 않는다 — 직선 구간에서만 앞차에 막힌다
  if(me&&me.d>=segs[me.k].dS0-1){let limit=Infinity,carV=0,jamCar=false;
   for(const c of st.cars){if(c.gone||c.k!==me.k)continue;if(Math.abs(c.lane*LANE-me.lat)>=2.95)continue;if(c.d<me.d-2.6)continue;const m=c.d-5.4;if(m<limit){limit=m;carV=c.lane>0?c.v:0;jamCar=!!c.jam}}
   if(me.d>limit){const back=me.d-limit;pu-=back;r.pos=Math.max(before,sOf(pu));const was=r.speed;r.speed=Math.min(r.speed,toSim(carV));
    if(was>140&&st.bumpT<=0){st.bumpT=1.2;r.shake=Math.max(r.shake,.45);r.events.push({type:'bump'})}
    if(jamCar&&!st.jamNoted){st.jamNoted=true;r.events.push({type:'jam'})}}}
  if(!st.inside&&pu>=0&&pu<Lc){st.inside=true;r.events.push({type:'cityIn'})}
  if(st.inside&&pu>=Lc){st.inside=false;r.events.push({type:'cityOut'})}
  for(const l of lights){const s=st.lights[l.i];if(u0<l.u&&pu>=l.u){if(s.state==='red'&&!s.ran){s.ran=true;s.t=0;pen(r,'signal',200)}s.done=true}}
  for(const c of cameras){if(st.cams[c.i]||!(u0<c.u&&pu>=c.u))continue;st.cams[c.i]=true;const kmh=Math.round(r.speed/2);if(kmh>LIMIT)pen(r,'speed',150,{kmh});else r.events.push({type:'camOk',kmh})}
 }
 const api={P0,yaw0,world,local,V,segs,marks,Lc,travelScale,uOf,sOf,y,YC,latScale,localAt,pathNormal,point,segPoint,onSeg,segOf,uAt,lights,cameras,crossStreets,jam,
  CR,LANE,HALF,WALK,LIMIT,laneShift,latOf,newState,update,cap,after,nextLight,toSim,toU,
  inCity:(s,choice)=>choice==='safe'&&s>FK.start&&s<FK.end};
 root.CITY=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
