/* 골목 배달부 — 둥근 작은 행성 위 언덕 골목 마을 (DentPhoto Village · Alley Postman)
   - 마을은 34×34 칸(한 칸 3m) 격자: 7×7 블록 사이로 한 칸 폭 골목, 가운데 종탑 광장. 골목 몇 토막은 막혀 막다른 길이 생기지만
     걸을 수 있는 칸은 언제나 모두 이어진다. 집은 1~2층으로 낮고, 블록의 40% 쯤은 마당 · 텃밭 · 빈터 · 주차장이라 하늘이 넓게 보인다.
   - 땅은 언덕(groundH): 평평한 단과 가파른 비탈이 번갈아 나오는 계단식 지형. 가파른 골목 칸은 돌계단(난간)이 되고 주인공은 계단 높이를 밟는다.
   - 모든 재질은 curve() 로 둥근 행성처럼 휘어 보인다: 정점 셰이더에서 주인공과 멀수록 y 를 d²·k 만큼 내린다(논리 좌표는 평평한 그대로).
   - 전봇대와 축 늘어진 전깃줄 · 볼록거울 · 자판기 · 경트럭 같은 골목 살림. 집 · 지붕 · 소품은 정점 색으로 몇 개의 메시로 합친다.
   PM_TOWN.build({scene,seed}) → {G,CH,N,CS,HW,cx,ci,houses,post,homes,plaza,colliders,blockedCell,camBlock,groundY,groundH,district,…} */
'use strict';
(function(root){
const T=THREE;
function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const CS=3,NB=7,BS=4,N=NB*(BS+1)-1,HW=N*CS/2;
const cx=i=>(i+.5)*CS-HW,ci=x=>Math.floor((x+HW)/CS);

/* ── 작은 행성 휨 · 툰 재질 · 외곽선 ── */
const CURVE={uCurve:{value:.0062},uCC:{value:new T.Vector2()},uOW:{value:.03}};
const BEND=`vec4 mvPosition=vec4(transformed,1.0);
#ifdef USE_INSTANCING
mvPosition=instanceMatrix*mvPosition;
#endif
vec4 pmW=modelMatrix*mvPosition;vec2 pmD=pmW.xz-uCC;pmW.y-=dot(pmD,pmD)*uCurve;
mvPosition=viewMatrix*pmW;gl_Position=projectionMatrix*mvPosition;`;
function curve(mat,outline){
 mat.onBeforeCompile=sh=>{sh.uniforms.uCurve=CURVE.uCurve;sh.uniforms.uCC=CURVE.uCC;sh.uniforms.uOW=CURVE.uOW;
  sh.vertexShader='uniform float uCurve;uniform vec2 uCC;uniform float uOW;\n'+sh.vertexShader.replace('#include <project_vertex>',(outline?'transformed+=normalize(normal)*uOW;\n':'')+BEND)};
 mat.customProgramCacheKey=()=>outline?'pm-outline':'pm-curve';return mat}
const GRAD=(()=>{const t=new T.DataTexture(new Uint8Array([120,200,255]),3,1,T.RedFormat);t.minFilter=t.magFilter=T.NearestFilter;t.generateMipmaps=false;t.needsUpdate=true;return t})();
const toonCache=new Map();
function toon(o){if(typeof o==='string'){if(!toonCache.has(o))toonCache.set(o,curve(new T.MeshToonMaterial({color:o,gradientMap:GRAD})));return toonCache.get(o)}return curve(new T.MeshToonMaterial(Object.assign({gradientMap:GRAD},o)))}
const OUT=curve(new T.MeshBasicMaterial({color:'#2f302c',side:T.BackSide}),true);
// 둥근 몸(머리 · 몸통)에 뒤집은 껍데기를 덧씌워 만화 외곽선을 낸다
function outline(group,minVerts=40){const list=[];group.traverse(m=>{if(m.isMesh&&!m.userData.noOutline&&m.geometry.attributes.position.count>=minVerts&&!(m.material&&m.material.isMeshBasicMaterial))list.push(m)});
 list.forEach(m=>{const o=new T.Mesh(m.geometry,OUT);o.userData.noOutline=true;o.castShadow=false;o.receiveShadow=false;m.add(o)})}

/* ── 합치기 도구 ── */
const _q=new T.Quaternion(),_e=new T.Euler(),_v=new T.Vector3(),_s=new T.Vector3();
function M(x,y,z,ry=0,sx=1,sy=1,sz=1,rx=0,rz=0){_e.set(rx,ry,rz);_q.setFromEuler(_e);return new T.Matrix4().compose(_v.set(x,y,z),_q,_s.set(sx,sy,sz))}
function mergeGeos(parts,attrs){let n=0;for(const p of parts)n+=p.attributes.position.count;const out=new T.BufferGeometry();
 for(const a of attrs){const sz=parts[0].attributes[a].itemSize,arr=new Float32Array(n*sz);let o=0;for(const p of parts){arr.set(p.attributes[a].array,o);o+=p.attributes[a].array.length}out.setAttribute(a,new T.BufferAttribute(arr,sz))}return out}
function Builder(){const parts=[],edges=[];const col=new T.Color();
 return{parts,add(geo,m,c,edge){const g=geo.index?geo.toNonIndexed():geo.clone();g.applyMatrix4(m);const n=g.attributes.position.count,a=new Float32Array(n*3);col.set(c);for(let k=0;k<n;k++){a[k*3]=col.r;a[k*3+1]=col.g;a[k*3+2]=col.b}g.setAttribute('color',new T.BufferAttribute(a,3));
   if(!g.attributes.uv)g.setAttribute('uv',new T.BufferAttribute(new Float32Array(n*2),2));parts.push(g);if(edge){const e=new T.EdgesGeometry(geo,30);e.applyMatrix4(m);edges.push(e)}},
  line(pts){const a=[];for(let k=0;k<pts.length-1;k++)a.push(pts[k].x,pts[k].y,pts[k].z,pts[k+1].x,pts[k+1].y,pts[k+1].z);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(a,3));edges.push(g)},
  mesh(mat,shadow=true){if(!parts.length)return null;const m=new T.Mesh(mergeGeos(parts,['position','normal','uv','color']),mat);m.castShadow=shadow;m.receiveShadow=true;m.frustumCulled=false;return m},
  lines(mat){if(!edges.length)return null;const l=new T.LineSegments(mergeGeos(edges,['position']),mat);l.frustumCulled=false;return l}}}
const BOX=new T.BoxGeometry(1,1,1),CYL=new T.CylinderGeometry(.5,.5,1,12),CYL6=new T.CylinderGeometry(.5,.5,1,7),BLOB=new T.IcosahedronGeometry(1,1),CONE4=new T.ConeGeometry(.5,1,4);
function prism(w,h,len){const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(0,h);s.closePath();const g=new T.ExtrudeGeometry(s,{depth:len,bevelEnabled:false});g.translate(0,0,-len/2);return g}
function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t}
const sm=t=>t<=0?0:t>=1?1:t*t*(3-2*t);

/* ── 언덕 — 평평한 단과 가파른 비탈이 번갈아 나오는 계단식 지형(광장은 평평) ── */
const TER=2.4,PLAZA_H=(()=>{const f=rawF(0,0),q=f/TER,k=Math.floor(q),fr=q-k;return (k+(fr<.6?0:sm((fr-.6)/.4)))*TER})();
function rawF(x,z){return 4+x*.055-z*.05+Math.sin(x*.07+1)*1.7+Math.cos(z*.065-.5)*1.5+Math.sin((x+z)*.04)*1.9+Math.cos((x-z)*.09)*.6}
function groundH(x,z){const f=rawF(x,z),q=f/TER,k=Math.floor(q),fr=q-k,h=(k+(fr<.6?0:sm((fr-.6)/.4)))*TER;
 const r=Math.max(Math.abs(x),Math.abs(z)),w=sm((r-9.5)/5);let y=PLAZA_H+(h-PLAZA_H)*w;
 const out=Math.max(Math.abs(x),Math.abs(z))-HW;if(out>0)y+=Math.min(1,out/24)*(Math.sin(x*.06)*Math.cos(z*.05)*5+Math.sin(x*.021+z*.027)*7+5);return y}

const WALLS=[['#efe6d2','크림색'],['#e3b9a1','살구색'],['#e8c8c4','분홍색'],['#bcd3bf','민트색'],['#b9cfd8','하늘색'],['#ecd89a','노란색'],['#cfc2dc','연보라색'],['#c9a68c','벽돌색'],['#f3f0e8','하얀색'],['#c8cfb1','연두색'],['#c5c3b8','회색']];
const ROOFS=['#b5654a','#9c5a4a','#5f8380','#6b6a86','#c4875c','#4f6a7c','#8a5050','#77806f'];
const DOORS=[['#3f6e9e','파란'],['#b84b45','빨간'],['#3f7d5a','초록'],['#71548f','보라'],['#d0902f','주황'],['#6b4630','밤색']];
const ACCENT=['#ffffff','#5f8380','#b84b45','#3f6e9e','#6b6a86','#d0902f','#5a7f5a'];
const DIST={n:'빨래줄 골목',e:'등불 골목',s:'고양이 골목',w:'화분 골목',c:'종탑 광장'};

function build({scene,seed=20261017}){
 const R=rng(seed),ri=n=>Math.floor(R()*n),pick=a=>a[ri(a.length)];
 /* ═══ 1. 격자 — 0 집 · 1 골목 · 2 광장 · 4 종탑 · 7 마당 ═══ */
 const G=new Uint8Array(N*N),CH=new Float32Array(N*N),HID=new Int16Array(N*N).fill(-1);
 const at=(i,j)=>i<0||j<0||i>=N||j>=N?0:G[j*N+i],set=(i,j,v)=>{G[j*N+i]=v};
 const walk=v=>v===1||v===2||v===7,road=v=>v===1||v===2;
 for(let j=0;j<N;j++)for(let i=0;i<N;i++)if(i%5===4||j%5===4)set(i,j,1);
 const PB=3;for(let a=-1;a<=4;a++)for(let b=-1;b<=4;b++)set(PB*5+a,PB*5+b,2);
 function connected(){let tot=0,s=-1;for(let k=0;k<N*N;k++)if(road(G[k])){tot++;if(s<0)s=k}if(s<0)return true;const seen=new Uint8Array(N*N),st=[s];seen[s]=1;let c=0;
  while(st.length){const k=st.pop();c++;const i=k%N,j=(k-i)/N;for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=i+di,b=j+dj;if(a<0||b<0||a>=N||b>=N)continue;const kk=b*N+a;if(!seen[kk]&&road(G[kk])){seen[kk]=1;st.push(kk)}}}return c===tot}
 const segs=[];for(let a=0;a<NB-1;a++)for(let b=0;b<NB;b++){segs.push({v:true,a,b});segs.push({v:false,a,b})}
 for(const s of segs){if(R()>.38)continue;const cells=[];for(let k=0;k<4;k++)cells.push(s.v?[s.a*5+4,s.b*5+k]:[s.b*5+k,s.a*5+4]);
  if(cells.some(([i,j])=>at(i,j)!==1))continue;cells.forEach(([i,j])=>set(i,j,0));if(!connected())cells.forEach(([i,j])=>set(i,j,1))}
 const TW={i:PB*5,j:PB*5};set(TW.i,TW.j,4);

 /* ═══ 2. 집 나누기 → 몇 채는 마당으로 ═══ */
 let houses=[];
 for(let j=0;j<N;j++)for(let i=0;i<N;i++){if(at(i,j)!==0||HID[j*N+i]>=0)continue;
  const free=(a,b)=>at(a,b)===0&&HID[b*N+a]<0;let w=1,h=1;const mw=1+ri(2),mh=1+ri(2);
  while(w<mw&&free(i+w,j))w++;
  while(h<mh){let ok=true;for(let a=0;a<w;a++)if(!free(i+a,j+h)){ok=false;break}if(!ok)break;h++}
  const id=houses.length;for(let a=0;a<w;a++)for(let b=0;b<h;b++)HID[(j+b)*N+i+a]=id;
  houses.push({id,i0:i,j0:j,w,h,x:cx(i+(w-1)/2),z:cx(j+(h-1)/2),W:w*CS,D:h*CS})}
 const facesOf=hs=>{const out=[];for(let a=0;a<hs.w;a++)for(let b=0;b<hs.h;b++){const i=hs.i0+a,j=hs.j0+b;
  for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const v=at(i+di,j+dj);if(!walk(v))continue;out.push({i,j,ni:i+di,nj:j+dj,nx:di,nz:dj,x:cx(i)+di*CS/2,z:cx(j)+dj*CS/2,t:v})}}return out};
 // 우체국: 광장을 보는 가장 큰 집
 let post=null;{let best=-1;for(const hs of houses)for(const f of facesOf(hs)){if(f.t!==2)continue;const sc=(f.z>0?40:0)+hs.w*hs.h*3-Math.abs(f.x)*2+(f.nz<0?30:0);if(sc>best){best=sc;post=hs;post._f=f}}}
 // 마당: 집 40% 쯤을 비운다(우체국 · 광장 둘레 집은 남김)
 const keep=[];for(const hs of houses){const pl=Math.max(Math.abs(hs.x),Math.abs(hs.z))<12;if(hs===post||(!pl&&R()<.42)){if(hs!==post){for(let a=0;a<hs.w;a++)for(let b=0;b<hs.h;b++){set(hs.i0+a,hs.j0+b,7);HID[(hs.j0+b)*N+hs.i0+a]=-1}hs.yard=true;continue}}keep.push(hs)}
 const yards=houses.filter(h=>h.yard);houses=keep;houses.forEach((h,k)=>{h.id=k;for(let a=0;a<h.w;a++)for(let b=0;b<h.h;b++)HID[(h.j0+b)*N+h.i0+a]=k});
 for(const hs of houses){
  const cs=[];for(const [a,b] of [[0,0],[1,0],[0,1],[1,1],[.5,.5]])cs.push(groundH(hs.x+(a-.5)*hs.W,hs.z+(b-.5)*hs.D));hs.b0=Math.min(...cs);hs.b1=Math.max(...cs);
  const pl=Math.max(Math.abs(hs.x),Math.abs(hs.z))<14,r=R();hs.floors=pl?1+ri(2):(r<.55?1:r<.92?2:3);hs.H=hs.floors===1?3.6:3.4+(hs.floors-1)*2.7;
  const wc=pick(WALLS);Object.assign(hs,{wall:wc[0],wallName:wc[1],roof:pick(ROOFS),accent:pick(ACCENT),gable:R()<.55,top:hs.b1+hs.H,faces:facesOf(hs)});
  for(let a=0;a<hs.w;a++)for(let b=0;b<hs.h;b++)CH[(hs.j0+b)*N+hs.i0+a]=hs.top;
  const ok=hs.faces.filter(f=>f.t!==7);const f=ok.length?pick(ok):null;hs.door=f?{x:f.x,z:f.z,nx:f.nx,nz:f.nz,i:f.ni,j:f.nj,face:f,col:pick(DOORS)}:null}
 {const f=post._f;post.door={x:f.x,z:f.z,nx:f.nx,nz:f.nz,i:f.ni,j:f.nj,face:post.faces.find(o=>o.i===f.i&&o.j===f.j&&o.nx===f.nx&&o.nz===f.nz)||f,col:['#b84b45','빨간']};
  Object.assign(post,{wall:'#f3eee2',roof:'#b84b45',gable:true,accent:'#b84b45',isPost:true,floors:2,H:6.1});post.top=post.b1+post.H;for(let a=0;a<post.w;a++)for(let b=0;b<post.h;b++)CH[(post.j0+b)*N+post.i0+a]=post.top}
 CH[TW.j*N+TW.i]=groundH(cx(TW.i),cx(TW.j))+15;
 function districtKey(x,z){if(Math.max(Math.abs(x),Math.abs(z))<13)return 'c';return Math.abs(x)>Math.abs(z)?(x>0?'e':'w'):(z>0?'s':'n')}
 const district=(x,z)=>DIST[districtKey(x,z)];
 // 동네 사람 15집 — 광장 밖에서 서로 멀리, 네 골목에 고르게, 골목을 보는 문
 const cands=houses.filter(h=>h.door&&h!==post&&districtKey(h.door.x,h.door.z)!=='c'&&h.door.face.t===1);
 const homes=[];while(homes.length<15&&cands.length){let best=null,bd=-Infinity;const cnt={n:0,e:0,s:0,w:0};homes.forEach(h=>cnt[districtKey(h.door.x,h.door.z)]++);
  for(const h of cands){if(homes.includes(h))continue;const dk=districtKey(h.door.x,h.door.z);let d=homes.length?Math.min(...homes.map(o=>Math.hypot(o.door.x-h.door.x,o.door.z-h.door.z))):Math.hypot(h.door.x,h.door.z);d-=cnt[dk]*7;d+=R()*3;if(d>bd){bd=d;best=h}}
  if(!best)break;homes.push(best)}
 const usedWall=new Set();homes.forEach((h,k)=>{h.door.col=DOORS[k%DOORS.length];let tries=0;while(usedWall.has(h.wall+districtKey(h.x,h.z))&&tries++<8){const w=pick(WALLS);h.wall=w[0];h.wallName=w[1]}usedWall.add(h.wall+districtKey(h.x,h.z));h.isHome=true});

 /* ═══ 3. 계단 — 가파른 골목 칸 ═══ */
 const STAIR=new Map();   // k → {ax:'x'|'z',n,e0}
 for(let j=0;j<N;j++)for(let i=0;i<N;i++){const v=at(i,j);if(v!==1&&v!==2)continue;const x=cx(i),z=cx(j),dx=groundH(x+CS/2,z)-groundH(x-CS/2,z),dz=groundH(x,z+CS/2)-groundH(x,z-CS/2);
  const wx=road(at(i-1,j))&&road(at(i+1,j)),wz=road(at(i,j-1))&&road(at(i,j+1)),ax=wx&&!wz?'x':wz&&!wx?'z':Math.abs(dx)>=Math.abs(dz)?'x':'z',d=Math.abs(ax==='x'?dx:dz);if(d<.55)continue;STAIR.set(j*N+i,{ax,n:Math.max(3,Math.round(d/.3)),d})}
 function groundY(x,z){const i=ci(x),j=ci(z),s=STAIR.get(j*N+i);if(!s)return groundH(x,z);
  const e0=(s.ax==='x'?cx(i):cx(j))-CS/2,p=s.ax==='x'?x:z,t=Math.max(0,Math.min(.9999,(p-e0)/CS)),k=Math.floor(t*s.n);
  const a=e0+k/s.n*CS,b=e0+(k+1)/s.n*CS;return s.ax==='x'?Math.max(groundH(a,z),groundH(b,z)):Math.max(groundH(x,a),groundH(x,b))}

 /* ═══ 4. 짓기 ═══ */
 const B=Builder(),BR=Builder(),WIRE=Builder();
 const glassLit=[],glassDark=[],frames=[],shutters=[],boxes=[],flowers=[],doorsI=[],lampsI=[];
 const colliders=[];
 const darker=(c,k)=>{const o=new T.Color(c);o.offsetHSL(0,-.02,-k);return '#'+o.getHexString()};
 for(const hs of houses){const {x,z,W,D,H,b0,b1}=hs,bot=b0-1.2,top=b1+H;
  B.add(BOX,M(x,(bot+top)/2,z,0,W,top-bot,D),hs.wall,true);
  B.add(BOX,M(x,(bot+b1+.5)/2,z,0,W+.08,b1+.5-bot,D+.08),darker(hs.wall,.13));
  B.add(BOX,M(x,top-.1,z,0,W+.16,.22,D+.16),darker(hs.wall,-.04));
  if(hs.floors>1)B.add(BOX,M(x,b1+3.35,z,0,W+.06,.12,D+.06),darker(hs.wall,.07));
  if(hs.gable){const along=W>=D,len=(along?W:D)+.5,wd=(along?D:W)+.7,rh=.8+Math.min(W,D)*.2;B.add(prism(wd,rh,len),M(x,top,z,along?Math.PI/2:0),hs.roof,true);
   if(R()<.4){B.add(BOX,M(x+(R()-.5)*W*.4,top+rh*.6,z+(R()-.5)*D*.4,0,.45,1.3,.45),darker(hs.wall,.1),true)}}
  else{for(const [ox,oz,w,d] of [[0,D/2,W,.16],[0,-D/2,W,.16],[W/2,0,.16,D],[-W/2,0,.16,D]])B.add(BOX,M(x+ox,top+.22,z+oz,0,w+.16,.44,d+.16),darker(hs.wall,-.04));
   B.add(BOX,M(x,top+.02,z,0,W-.1,.06,D-.1),'#a9a597');const r=R();
   if(r<.4){B.add(CYL,M(x+W*.2,top+.85,z-D*.15,0,1,1.4,1),'#d6d3c8',true);B.add(CYL,M(x+W*.2,top+1.6,z-D*.15,0,1.1,.12,1.1),'#b2ad9f')}
   else if(r<.6){for(const s of [-1,1])B.add(BOX,M(x+s*W*.25,top+.45,z,0,.7,.5,.5),'#d8d6cf',true)}   // 실외기
   else{for(let k=0;k<3;k++){const px=x+(R()-.5)*(W-1),pz=z+(R()-.5)*(D-1);BR.add(CYL,M(px,top+.25,pz,0,.5,.4,.5),'#b86f4c');BR.add(BLOB,M(px,top+.62,pz,0,.36,.32,.36),pick(['#6f9f62','#83b26f','#5a8a5a']))}}}
  // 바깥벽 배관 · 실외기
  if(R()<.5){const f=hs.faces[ri(hs.faces.length)];if(f){const ry=Math.atan2(f.nx,f.nz),ox=Math.cos(ry)*(CS/2-.25),oz=-Math.sin(ry)*(CS/2-.25);B.add(CYL6,M(f.x+f.nx*.1+ox,(groundH(f.x,f.z)+top)/2,f.z+f.nz*.1+oz,0,.12,top-groundH(f.x,f.z),.12),'#9a9a8e')}}
  for(const f of hs.faces){const ry=Math.atan2(f.nx,f.nz),px=f.x+f.nx*.02,pz=f.z+f.nz*.02,isDoor=hs.door&&hs.door.face===f,gf=groundH(f.x,f.z);
   const winAt=(y,big)=>{const m=M(px,y,pz,ry,big?1.5:1,big?1.1:1,1);frames.push({m,c:hs.accent});(R()<.55?glassLit:glassDark).push(m);
    if(!big&&R()<.4){for(const s of [-1,1])shutters.push({m:M(px+Math.cos(ry)*s*.66,y,pz-Math.sin(ry)*s*.66,ry),c:hs.accent==='#ffffff'?'#5f8380':hs.accent})}
    if(!big&&R()<.35){boxes.push(M(px+f.nx*.14,y-.66,pz+f.nz*.14,ry));for(let k=-1;k<=1;k++)flowers.push({m:M(px+f.nx*.18+Math.cos(ry)*k*.28,y-.48,pz+f.nz*.18-Math.sin(ry)*k*.28,0,.13,.13,.13),c:pick(['#e98a9c','#f0cf68','#fbf6ea','#d8664f','#b98fd8'])})}};
   for(let k=2;k<=hs.floors;k++)if(R()<.85)winAt(b1+3.35+(k-2)*2.7+1.35);
   if(isDoor){doorsI.push({m:M(px,gf+1.1,pz,ry),c:hs.door.col[0]});B.add(BOX,M(f.x+f.nx*.3,gf+.07,f.z+f.nz*.3,ry,1.3,.14,.6),'#cfc8b8');lampsI.push(M(px+Math.cos(ry)*.85,gf+2.35,pz-Math.sin(ry)*.85,ry))}
   else if(R()<.55)winAt(Math.max(gf,b0)+1.55,R()<.2)}}
 // 마당 — 텃밭 · 나무 정원 · 빈터 · 주차장(분홍 경트럭) · 자판기, 골목 쪽엔 낮은 블록 담
 const pots=[],cats=[];
 const tree=(x,z,s=1,y=groundH(x,z))=>{B.add(CYL,M(x,y+1.1*s,z,0,.34*s,2.2*s,.34*s),'#7d6249',true);const gc=pick(['#6fa36a','#7fb06f','#5f935f','#8cbb7b']);B.add(BLOB,M(x,y+2.9*s,z,0,1.5*s,1.2*s,1.5*s),gc,true);B.add(BLOB,M(x+.7*s,y+3.6*s,z+.2*s,0,1.05*s,.9*s,1.05*s),gc,true);B.add(BLOB,M(x-.6*s,y+3.4*s,z-.5*s,0,1*s,.85*s,1*s),gc,true);colliders.push({x,z,r:.45*s})};
 const bench=(x,z,ry)=>{const y=groundH(x,z);B.add(BOX,M(x,y+.45,z,ry,1.6,.1,.5),'#a07a55',true);B.add(BOX,M(x-Math.sin(ry)*.22,y+.75,z-Math.cos(ry)*.22,ry,1.6,.45,.08),'#a07a55',true);for(const s of [-1,1])B.add(BOX,M(x+Math.cos(ry)*s*.65,y+.22,z-Math.sin(ry)*s*.65,ry,.1,.44,.45),'#5e5a52');colliders.push({x,z,r:.7})};
 const vend=(x,z,ry)=>{const y=groundH(x,z);B.add(BOX,M(x,y+.95,z,ry,.95,1.9,.7),pick(['#e8b93a','#f3f0e8','#d8463d','#4f8ac0']),true);B.add(BOX,M(x+Math.sin(ry)*.36,y+1.25,z+Math.cos(ry)*.36,ry,.75,.7,.02),'#cfe6ef');B.add(BOX,M(x+Math.sin(ry)*.36,y+.5,z+Math.cos(ry)*.36,ry,.5,.18,.03),'#333');colliders.push({x,z,r:.6})};
 const truck=(x,z,ry)=>{const y=groundH(x,z),c='#e3a99a',s=Math.sin(ry),co=Math.cos(ry);const P=(f,u,h)=>[x+s*f+co*u,y+h,z+co*f-s*u];
  const p1=P(.7,0,.95);B.add(BOX,M(...p1,ry,1.5,1.1,1.3),c,true);const p2=P(-.6,0,.7);B.add(BOX,M(...p2,ry,1.5,.25,1.8),c,true);for(const u of [-.7,.7]){const pr=P(-.6,u,1);B.add(BOX,M(...pr,ry,.06,.5,1.8),c)}
  const pw=P(1.3,0,1.05);B.add(BOX,M(...pw,ry,1.3,.5,.04),'#9fc7cf');for(const f of [.9,-1])for(const u of [-.68,.68]){const pq=P(f,u,.3);B.add(CYL,M(...pq,ry,.55,.25,.55,0,Math.PI/2),'#2f302c')}
  const pl=P(1.36,0,.55);B.add(BOX,M(...pl,ry,1.2,.18,.04),'#3c3c38');colliders.push({x,z,r:1.4})};
 const field=(x0,z0,w,d)=>{for(let k=0;k<Math.floor(d/.9);k++){const z=z0-d/2+.45+k*.9;B.add(BOX,M(x0,groundH(x0,z)+.18,z,0,w-.6,.36,.5),'#7d6047');for(let m=0;m<Math.floor((w-.6)/.6);m++){const x=x0-(w-.6)/2+.3+m*.6;BR.add(BLOB,M(x,groundH(x,z)+.5,z,0,.24,.2,.24),pick(['#7bb26a','#8fc27a','#6aa05e']))}}};
 for(const y of yards){const x=cx(y.i0+(y.w-1)/2),z=cx(y.j0+(y.h-1)/2),W=y.w*CS,D=y.h*CS,r=R();
  if(r<.3)field(x,z,W,D);else if(r<.55){tree(x+(R()-.5)*W*.3,z+(R()-.5)*D*.3,.8+R()*.4);for(let k=0;k<3;k++){const px=x+(R()-.5)*(W-1.2),pz=z+(R()-.5)*(D-1.2);BR.add(BLOB,M(px,groundH(px,pz)+.35,pz,0,.55,.45,.55),pick(['#7fb06f','#e8a0b4','#f0cf68','#6f9f62']))}}
  else if(r<.72&&W*D>=18)truck(x,z,ri(4)*Math.PI/2);else if(r<.86)bench(x,z,ri(4)*Math.PI/2);
  // 골목 쪽 낮은 담(한두 면은 터 둔다)
  for(let a=0;a<y.w;a++)for(let b=0;b<y.h;b++){const i=y.i0+a,j=y.j0+b;for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){if(!road(at(i+di,j+dj))||R()<.45)continue;
   const ex=cx(i)+di*(CS/2-.12),ez=cx(j)+dj*(CS/2-.12),len=CS,g1=groundH(ex-dj*len/2,ez-di*len/2),g2=groundH(ex+dj*len/2,ez+di*len/2),g=Math.min(g1,g2),h2=Math.max(g1,g2)+1.05;
   B.add(BOX,M(ex,(g-.4+h2)/2,ez,0,dj?len:.24,h2-g+.4,di?len:.24),'#c9c4b6',true);colliders.push({box:[ex-(dj?len/2:.12),ez-(di?len/2:.12),ex+(dj?len/2:.12),ez+(di?len/2:.12)]});
   if(R()<.25&&!a&&!b)vend(cx(i)+di*(CS/2-.7),cx(j)+dj*(CS/2-.7),Math.atan2(di,dj))}}}
 // 계단 — 칸을 가로지르는 디딤돌 + 가장자리 난간
 for(const [k,s] of STAIR){const i=k%N,j=(k-i)/N,x=cx(i),z=cx(j),e0=(s.ax==='x'?x:z)-CS/2,bot=Math.min(groundH(x-CS/2,z-CS/2),groundH(x+CS/2,z+CS/2),groundH(x-CS/2,z+CS/2),groundH(x+CS/2,z-CS/2))-.6;
  const tops=[];for(let m=0;m<s.n;m++){const a=e0+m/s.n*CS,b=e0+(m+1)/s.n*CS,c=(a+b)/2;const top=s.ax==='x'?Math.max(groundH(a,z),groundH(b,z)):Math.max(groundH(x,a),groundH(x,b));tops.push([c,top]);
   const dep=CS/s.n+.002;B.add(BOX,s.ax==='x'?M(c,(bot+top)/2,z,0,dep,top-bot,CS):M(x,(bot+top)/2,c,0,CS,top-bot,dep),m%2?'#d9d4c6':'#d2ccbd',true)}
  for(const side of [-1,1]){const ni=s.ax==='x'?i:i+side,nj=s.ax==='x'?j+side:j;if(walk(at(ni,nj)))continue;const off=side*(CS/2-.2),pts=tops.map(([c,t])=>s.ax==='x'?new T.Vector3(c,t+.9,z+off):new T.Vector3(x+off,t+.9,c));
   for(let m=0;m<pts.length-1;m++){const a=pts[m],b=pts[m+1],mid=a.clone().add(b).multiplyScalar(.5),l=a.distanceTo(b),mm=new T.Matrix4().lookAt(a,b,new T.Vector3(0,1,0));mm.multiply(new T.Matrix4().makeRotationX(Math.PI/2));mm.setPosition(mid);mm.scale(new T.Vector3(.05,l,.05));B.add(CYL6,mm,'#8a8f88')}
   for(const p of [pts[0],pts[pts.length-1]])B.add(CYL6,M(p.x,p.y-.45,p.z,0,.06,.9,.06),'#8a8f88')}}
 // 종탑
 {const x=cx(TW.i),z=cx(TW.j),g=groundH(x,z),h=15;B.add(BOX,M(x,g+h/2-.5,z,0,2.4,h+1,2.4),'#ece2cb',true);B.add(BOX,M(x,g+.4,z,0,2.6,.8,2.6),'#c4b79d');B.add(BOX,M(x,g+h-3.2,z,0,2.6,.25,2.6),'#c4b79d');
  B.add(BOX,M(x,g+h+.1,z,0,2.7,.25,2.7),'#c4b79d');B.add(CONE4,M(x,g+h+1.6,z,Math.PI/4,3.5,3,3.5),'#4f6a7c',true);B.add(CYL,M(x,g+h+3.4,z,0,.06,.9,.06),'#6b5a45');
  const face=canvasTex(256,256,(c)=>{c.fillStyle='#fffaf0';c.beginPath();c.arc(128,128,120,0,7);c.fill();c.strokeStyle='#2f302c';c.lineWidth=10;c.stroke();for(let k=0;k<12;k++){const a=k/12*Math.PI*2;c.fillStyle='#2f302c';c.fillRect(124+Math.sin(a)*96,124-Math.cos(a)*96,8,8)}});
  const fm=curve(new T.MeshBasicMaterial({map:face,transparent:true}));for(const [nx,nz] of [[0,1],[1,0],[0,-1],[-1,0]]){const p=new T.Mesh(new T.CircleGeometry(.85,24),fm);p.position.set(x+nx*1.22,g+h-1.6,z+nz*1.22);p.rotation.y=Math.atan2(nx,nz);scene.add(p)}
  const bell=new T.Mesh(new T.ConeGeometry(.45,.7,12,1,true),toon({color:'#d0a041',side:T.DoubleSide}));bell.position.set(x,g+h-2.4,z);scene.add(bell);
  for(const [nx,nz] of [[0,1],[1,0],[0,-1],[-1,0]])B.add(BOX,M(x+nx*1.17,g+h-2.4,z+nz*1.17,Math.atan2(nx,nz),1.2,1.6,.1),'#3b3a40')}
 // 광장 — 분수 · 나무 · 벤치
 const fountain={x:0,z:0},PH=PLAZA_H;{B.add(CYL,M(0,PH+.3,0,0,4.2,.6,4.2),'#d4cbb8',true);B.add(CYL,M(0,PH+.58,0,0,3.7,.08,3.7),'#79bcc8');B.add(CYL,M(0,PH+1.1,0,0,.5,1.2,.5),'#d4cbb8',true);B.add(CYL,M(0,PH+1.75,0,0,1.5,.2,1.5),'#d4cbb8',true);B.add(CYL,M(0,PH+1.86,0,0,1.3,.06,1.3),'#8fc8d4');B.add(BLOB,M(0,PH+2.15,0,0,.28,.4,.28),'#d4cbb8');colliders.push({x:0,z:0,r:2.2})}
 tree(6.6,-6.6,1.05);tree(-6.6,6.6,1);bench(4.6,2.8,-Math.PI/2);bench(-2.8,-5,0);
 // 화분 · 고양이 자리
 for(let j=0;j<N;j++)for(let i=0;i<N;i++){if(at(i,j)!==1||STAIR.has(j*N+i))continue;const x=cx(i),z=cx(j),dk=districtKey(x,z);
  for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){if(at(i+di,j+dj)!==0)continue;if(R()<(dk==='w'?.5:.14)){const t=(R()-.5)*1.8,px=x+di*(CS/2-.34)+(dj?t:0),pz=z+dj*(CS/2-.34)+(di?t:0);pots.push([px,pz,.7+R()*.6])}}}
 for(const [x,z,s] of pots){const y=groundY(x,z);BR.add(CYL,M(x,y+.22*s,z,0,.42*s,.44*s,.42*s),pick(['#b86f4c','#a96646','#d6c8aa','#6f8fa0']));BR.add(BLOB,M(x,y+.6*s,z,0,.32*s,.3*s,.32*s),pick(['#6f9f62','#83b26f','#5a8a5a','#e98a9c']))}
 for(const hs of houses){if(!hs.door||hs.isHome||hs.isPost)continue;const dk=districtKey(hs.x,hs.z);if(R()<(dk==='s'?.3:.05)){const sd=R()<.5?-1:1;cats.push({x:hs.door.x+hs.door.nx*.6+sd*hs.door.nz*.85,z:hs.door.z+hs.door.nz*.6+sd*hs.door.nx*.85,ry:Math.atan2(hs.door.nx,hs.door.nz)+(R()-.5)})}}
 cats.forEach(c=>c.y=groundY(c.x,c.z));

 /* ═══ 5. 전봇대 · 전깃줄 · 볼록거울 · 표지판 ═══ */
 const poles=[];
 const pole=(x,z,tr)=>{const g=groundH(x,z),h=8.4;B.add(CYL,M(x,g+h/2,z,0,.3,h,.3),'#7f8a82',true);B.add(BOX,M(x,g+.6,z,0,.34,1.2,.34),'#e3c13c');for(let k=0;k<3;k++)B.add(BOX,M(x,g+.25+k*.35,z,0,.36,.12,.36),'#2f302c');
  B.add(BOX,M(x,g+h-.5,z,0,1.6,.12,.14),'#6a726c',true);B.add(BOX,M(x,g+h-1.1,z,0,1.2,.1,.12),'#6a726c',true);for(const s of [-.7,0,.7])B.add(CYL6,M(x+s,g+h-.38,z,0,.08,.16,.08),'#e6e2d6');
  if(tr){B.add(CYL,M(x+.38,g+h-2.2,z,0,.62,1,.62),'#8e958c',true);B.add(CYL,M(x+.38,g+h-1.66,z,0,.66,.08,.66),'#6a726c')}
  for(let k=0;k<6;k++)B.add(BOX,M(x+(k%2?.18:-.18),g+2.4+k*.55,z,k%2?0:Math.PI/2,.32,.05,.05),'#5a605b');
  colliders.push({x,z,r:.22});const p={x,z,g,h};poles.push(p);return p};
 const sag=(a,b,s)=>{const pts=[];for(let k=0;k<=10;k++){const t=k/10;pts.push(new T.Vector3(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t-Math.sin(Math.PI*t)*s,a.z+(b.z-a.z)*t))}return pts};
 const runs=[];for(const vert of [false,true])for(let a=0;a<NB-1;a++){const L=a*5+4;let run=[];for(let k=0;k<=N;k++){const i=vert?L:k,j=vert?k:L,v=k<N?at(i,j):0;if(v===1||v===2){run.push(k)}else{if(run.length>=3)runs.push({vert,L,run});run=[]}}}
 for(const r of runs){const side=((r.L*7)%2?1:-1),list=[];for(let m=1;m<r.run.length;m+=3){const k=r.run[m],x=r.vert?cx(r.L)+side*(CS/2-.3):cx(k),z=r.vert?cx(k):cx(r.L)+side*(CS/2-.3);if(Math.hypot(x,z)<6)continue;list.push(pole(x,z,R()<.3))}
  for(let m=0;m<list.length-1;m++){const p=list[m],q=list[m+1];for(const [dy,off] of [[-.4,-.7],[-.4,.7],[-.4,0],[-1.05,.5]]){const A=new T.Vector3(p.x+(r.vert?off:0),p.g+p.h+dy,p.z+(r.vert?0:off)),Bv=new T.Vector3(q.x+(r.vert?off:0),q.g+q.h+dy,q.z+(r.vert?0:off));WIRE.line(sag(A,Bv,.55+R()*.35))}}
  // 집으로 가는 인입선
  for(const p of list){if(R()<.6){const hs=houses[ri(houses.length)];const near=houses.filter(h=>Math.hypot(h.x-p.x,h.z-p.z)<9);const h=near.length?near[ri(near.length)]:null;if(h){const A=new T.Vector3(p.x,p.g+p.h-1.05,p.z),Bv=new T.Vector3(h.x+(p.x-h.x)*.45,h.top-.3,h.z+(p.z-h.z)*.45);WIRE.line(sag(A,Bv,.35))}}}}
 // 볼록거울 · 삼각 표지판 — 몇몇 골목 모퉁이
 for(let a=0;a<NB-1;a++)for(let b=0;b<NB-1;b++){if(R()>.35)continue;const i=a*5+4,j=b*5+4;if(at(i,j)!==1)continue;const x=cx(i)+CS/2-.3,z=cx(j)+CS/2-.3,g=groundH(x,z);
  if(R()<.6){B.add(CYL6,M(x,g+1.4,z,0,.08,2.8,.08),'#d36a3c');const m=new T.Mesh(new T.CircleGeometry(.42,20),toon({color:'#cfe2e6',emissive:'#6f8f99',emissiveIntensity:.2}));m.position.set(x-.12,g+2.9,z-.12);m.rotation.y=Math.PI*1.25;scene.add(m);B.add(CYL,M(x-.08,g+2.9,z-.08,Math.PI*1.25,.95,.95,.08,Math.PI/2),'#d36a3c')}
  else{B.add(CYL6,M(x,g+1.2,z,0,.06,2.4,.06),'#8a8f88');B.add(new T.CylinderGeometry(.5,.5,.06,3),M(x-.05,g+2.55,z-.05,Math.PI*1.25,1,1,1,Math.PI/2),'#c9493f')}
  colliders.push({x,z,r:.15})}

 /* ═══ 6. 바닥 — 골목(콘크리트 · 흰 줄) · 광장 · 마당(풀) 을 칸마다 그린 무늬 한 장 ═══ */
 const PX=32,gtex=canvasTex(N*PX,N*PX,(c,w,h)=>{const r2=rng(5);
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const v=at(i,j),x=i*PX,y=j*PX;
   if(v===7){c.fillStyle='#a3c58c';c.fillRect(x,y,PX,PX);for(let k=0;k<10;k++){c.fillStyle=r2()<.5?'#95b97f':'#b3d29b';c.fillRect(x+r2()*PX,y+r2()*PX,1.5,3)}}
   else if(v===2){c.fillStyle='#ddd3be';c.fillRect(x,y,PX,PX);c.strokeStyle='rgba(120,100,80,.25)';c.lineWidth=1;for(let k=0;k<4;k++){c.strokeRect(x+(k%2)*PX/2,y+Math.floor(k/2)*PX/2,PX/2,PX/2)}}
   else if(v===1){c.fillStyle='#b9bbb3';c.fillRect(x,y,PX,PX);c.fillStyle='rgba(60,60,55,.12)';c.fillRect(x,y,PX,1);for(let k=0;k<4;k++){c.fillStyle='rgba(255,255,255,.08)';c.fillRect(x+r2()*PX,y+r2()*PX,4,2)}
    // 골목 가장자리 흰 줄 · 가운데 점선(곧은 골목)
    c.fillStyle='rgba(250,250,240,.85)';const hz=i%5===4&&j%5!==4,vt=j%5===4&&i%5!==4;if(vt){c.fillRect(x,y+3,PX,2);c.fillRect(x,y+PX-5,PX,2);if(i%2)c.fillRect(x+6,y+PX/2-1,PX-12,2)}if(hz){c.fillRect(x+3,y,2,PX);c.fillRect(x+PX-5,y,2,PX);if(j%2)c.fillRect(x+PX/2-1,y+6,2,PX-12)}}
   else{c.fillStyle='#a8a090';c.fillRect(x,y,PX,PX)}}});
 const gg=new T.PlaneGeometry(N*CS,N*CS,N*4,N*4).rotateX(-Math.PI/2);{const p=gg.attributes.position;for(let k=0;k<p.count;k++)p.setY(k,groundH(p.getX(k),p.getZ(k)));gg.computeVertexNormals()}
 const ground=new T.Mesh(gg,toon({color:'#ffffff',map:gtex,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));ground.position.y=.01;ground.receiveShadow=true;ground.frustumCulled=false;scene.add(ground);
 const grassT=canvasTex(256,256,(c,w,h)=>{c.fillStyle='#a3c58c';c.fillRect(0,0,w,h);const r2=rng(9);for(let k=0;k<900;k++){c.fillStyle=r2()<.5?'#97bb80':'#b0d19a';c.fillRect(r2()*w,r2()*h,2,5)}for(let k=0;k<26;k++){c.fillStyle=r2()<.5?'#fbf6ea':'#f2c6d2';c.beginPath();c.arc(r2()*w,r2()*h,2.2,0,7);c.fill()}});grassT.wrapS=grassT.wrapT=T.RepeatWrapping;grassT.repeat.set(80,80);
 const og=new T.PlaneGeometry(420,420,150,150).rotateX(-Math.PI/2);{const p=og.attributes.position;for(let k=0;k<p.count;k++){const x=p.getX(k),z=p.getZ(k);p.setY(k,groundH(x,z)-(Math.max(Math.abs(x),Math.abs(z))<HW?.15:0))}og.computeVertexNormals()}
 const grass=new T.Mesh(og,toon({color:'#ffffff',map:grassT}));grass.receiveShadow=true;grass.frustumCulled=false;scene.add(grass);
 // 마을 둘레 — 나무 숲 · 비탈 밭
 {const r2=rng(77);for(let k=0;k<90;k++){const a=r2()*Math.PI*2,d=HW+6+r2()*70,x=Math.cos(a)*d,z=Math.sin(a)*d;if(Math.max(Math.abs(x),Math.abs(z))<HW+4)continue;const y=groundH(x,z),s=1.2+r2()*1.4;
  if(r2()<.5){BR.add(CYL,M(x,y+1*s,z,0,.3*s,2*s,.3*s),'#7d6249');BR.add(new T.ConeGeometry(1.3*s,3.4*s,7),M(x,y+3.4*s,z),pick(['#5d8f68','#6a9f6a','#4f845f']))}else{BR.add(CYL,M(x,y+1*s,z,0,.3*s,2*s,.3*s),'#7d6249');BR.add(BLOB,M(x,y+2.8*s,z,0,1.5*s,1.3*s,1.5*s),pick(['#78ad6d','#86b878','#94c384']))}}}

 const VC=toon({color:'#ffffff',vertexColors:true}),walls=B.mesh(VC),small=BR.mesh(VC);scene.add(walls);small&&scene.add(small);
 const edgeMat=curve(new T.LineBasicMaterial({color:'#2f302c',transparent:true,opacity:.7}));const ed=B.lines(edgeMat);ed&&scene.add(ed);
 const wireMat=curve(new T.LineBasicMaterial({color:'#2f302c',transparent:true,opacity:.85}));const wl=WIRE.lines(wireMat);wl&&scene.add(wl);
 /* 창 · 덧창 · 꽃상자 · 문 · 등 — 인스턴스 */
 const inst=(geo,mat,list,col,shadow)=>{if(!list.length)return null;const m=new T.InstancedMesh(geo,mat,list.length);list.forEach((it,k)=>{m.setMatrixAt(k,it.m||it);if(col)m.setColorAt(k,new T.Color(it.c))});m.castShadow=!!shadow;m.receiveShadow=true;m.frustumCulled=false;scene.add(m);return m};
 const frameG=new T.BoxGeometry(1.02,1.28,.12),glassG=new T.BoxGeometry(.8,1.04,.08).translate(0,0,.04),shutG=new T.BoxGeometry(.32,1.2,.06).translate(0,0,.05),boxG=new T.BoxGeometry(.95,.24,.3),flowerG=new T.IcosahedronGeometry(1,0),doorG=new T.BoxGeometry(1.05,2.2,.14);
 inst(frameG,toon('#ffffff'),frames,true);
 const litMat=toon({color:'#f3e3b0',emissive:'#ffc46b',emissiveIntensity:0}),darkMat=toon({color:'#86aab8',emissive:'#ffcf86',emissiveIntensity:0});
 inst(glassG,litMat,glassLit);inst(glassG,darkMat,glassDark);inst(shutG,toon('#ffffff'),shutters,true);inst(boxG,toon('#7d6249'),boxes);inst(flowerG,toon('#ffffff'),flowers,true);inst(doorG,toon('#ffffff'),doorsI,true,true);
 const lampG=new T.CylinderGeometry(.09,.13,.3,6).translate(0,.18,.24),bulbMat=curve(new T.MeshBasicMaterial({color:'#fff1c4'}));
 inst(lampG,toon('#8f8a7a'),lampsI);inst(new T.SphereGeometry(.11,10,8).translate(0,-.02,.24),bulbMat,lampsI);
 // 빨랫줄 — 빨래줄 골목의 마주 보는 집 사이(낮은 집 지붕 아래)
 const cloth=[],lineG=Builder();
 for(let j=0;j<N;j++)for(let i=0;i<N;i++){if(at(i,j)!==1||STAIR.has(j*N+i))continue;const x=cx(i),z=cx(j),dk=districtKey(x,z);if(R()>(dk==='n'?.35:.07))continue;
  const ew=at(i-1,j)===0&&at(i+1,j)===0,ns=at(i,j-1)===0&&at(i,j+1)===0;if(!ew&&!ns)continue;const g=groundH(x,z),lim=ew?Math.min(CH[j*N+i-1],CH[j*N+i+1]):Math.min(CH[(j-1)*N+i],CH[(j+1)*N+i]),y=Math.min(lim-.5,g+3.6);if(y-g<2.6)continue;
  const a=ew?new T.Vector3(x-CS/2,y,z):new T.Vector3(x,y,z-CS/2),b=ew?new T.Vector3(x+CS/2,y,z):new T.Vector3(x,y,z+CS/2);lineG.line(sag(a,b,.25));
  const n=2+ri(3);for(let k=0;k<n;k++){const t=(k+.5)/n,p=a.clone().lerp(b,t);p.y-=Math.sin(Math.PI*t)*.25;cloth.push({x:p.x,y:p.y,z:p.z,ry:ew?0:Math.PI/2,w:.45+R()*.35,h:.55+R()*.4,c:pick(['#e98a9c','#9cc7e0','#fbf6ea','#f0cf68','#a8d5ba','#c3b1e1','#d8664f']),ph:R()*6})}}
 const ll=lineG.lines(wireMat);ll&&scene.add(ll);
 const clothM=new T.InstancedMesh(new T.PlaneGeometry(1,1).translate(0,-.5,0),toon({color:'#ffffff',side:T.DoubleSide}),Math.max(1,cloth.length));clothM.count=cloth.length;clothM.castShadow=true;clothM.frustumCulled=false;cloth.forEach((c,k)=>clothM.setColorAt(k,new T.Color(c.c)));scene.add(clothM);

 /* 간판 · 우체통 */
 function signMesh(text,sub,bg,fg,w=2.4,h=.7){const tex=canvasTex(512,Math.round(512*h/w),(c,W,H)=>{c.fillStyle=bg;c.beginPath();c.roundRect(4,4,W-8,H-8,26);c.fill();c.strokeStyle='rgba(47,48,44,.85)';c.lineWidth=6;c.stroke();c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';c.font=`800 ${sub?54:H>300?H*.6:64}px "Jua","Gaegu","Apple SD Gothic Neo","Malgun Gothic",sans-serif`;c.fillText(text,W/2,sub?58:H/2+2);if(sub){c.font='600 30px "Jua","Apple SD Gothic Neo",sans-serif';c.globalAlpha=.8;c.fillText(sub,W/2,112)}});
  return new T.Mesh(new T.PlaneGeometry(w,h),curve(new T.MeshBasicMaterial({map:tex,transparent:true})))}
 function setSign(hs,text,sub,bg='#fffaf0',fg='#2f302c'){const d=hs.door,ry=Math.atan2(d.nx,d.nz),gf=groundH(d.x,d.z);const g=new T.Group();g.position.set(d.x+d.nx*.04,gf+2.95,d.z+d.nz*.04);g.rotation.y=ry;scene.add(g);
  const aw=new T.Mesh(new T.BoxGeometry(1.7,.08,.75),toon(hs.accent==='#ffffff'?'#b84b45':hs.accent));aw.position.set(0,-.38,.36);aw.rotation.x=.28;aw.castShadow=true;g.add(aw);
  const s=signMesh(text,sub,bg,fg,1.9,.56);s.position.set(0,.18,.03);g.add(s);
  const arm=new T.Mesh(new T.BoxGeometry(.05,.05,.9),toon('#3b3a40'));arm.position.set(1.15,.25,.45);g.add(arm);
  const hang=signMesh(Array.from(text)[0],'',bg,fg,.62,.62);hang.position.set(1.15,-.16,.8);hang.rotation.y=Math.PI/2;hang.material.side=T.DoubleSide;g.add(hang);return g}
 setSign(post,'✉ 골목 우체국','ALLEY POST OFFICE','#b84b45','#fffaf0');
 {const d=post.door,ry=Math.atan2(d.nx,d.nz),s=Math.cos(ry),c=-Math.sin(ry);const px=d.x+d.nx*.6+s*1.3,pz=d.z+d.nz*.6+c*1.3;const pb=new T.Group();pb.position.set(px,groundH(px,pz),pz);pb.rotation.y=ry;scene.add(pb);
  const red=toon('#d0453d');const b1=new T.Mesh(new T.CylinderGeometry(.34,.34,1.1,16),red);b1.position.y=.75;b1.castShadow=true;pb.add(b1);const b2=new T.Mesh(new T.SphereGeometry(.34,16,8,0,Math.PI*2,0,Math.PI/2),red);b2.position.y=1.3;pb.add(b2);
  const sl=new T.Mesh(new T.BoxGeometry(.36,.05,.05),toon('#2f302c'));sl.position.set(0,1.05,.33);pb.add(sl);const ft=new T.Mesh(new T.CylinderGeometry(.22,.26,.2,12),toon('#3b3a40'));ft.position.y=.1;pb.add(ft);outline(pb,20);colliders.push({x:px,z:pz,r:.45})}

 /* ── 판정 ── */
 function blockedCell(i,j){const v=at(i,j);return !(v===1||v===2||v===7)}
 function camBlock(x,y,z){if(y<groundY(x,z)+.3)return true;const i=ci(x),j=ci(z);if(i<0||j<0||i>=N||j>=N)return false;const v=G[j*N+i];if(v===0||v===4)return y<CH[j*N+i]+.9;return false}
 const plaza={x:0,z:0,r:7,y:PLAZA_H};
 const _o=new T.Object3D();
 function update(t,dt,px,pz,night){for(let k=0;k<cloth.length;k++){const c=cloth[k];if((Math.abs(c.x-px)>30||Math.abs(c.z-pz)>30)&&t>1)continue;_o.position.set(c.x,c.y,c.z);_o.rotation.set(Math.sin(t*2.2+c.ph)*.22,c.ry+Math.sin(t*1.3+c.ph)*.12,0);_o.scale.set(c.w,c.h,1);_o.updateMatrix();clothM.setMatrixAt(k,_o.matrix)}clothM.instanceMatrix.needsUpdate=true;
  litMat.emissiveIntensity=night*1.05;darkMat.emissiveIntensity=night*.25;bulbMat.color.setRGB(.55+night*.6,.5+night*.5,.35+night*.4)}
 update(0,0,0,0,0);
 return {G,CH,HID,N,CS,HW,cx,ci,at,houses,yards,post,homes,plaza,fountain,tower:TW,colliders,poles,stairs:STAIR,blockedCell,camBlock,groundY,groundH,district,districtKey,cats,CURVE,curve,toon,outline,signMesh,setSign,update,walk,mats:{litMat,darkMat}}}
root.PM_TOWN={build,curve,toon,outline,CURVE,rng,GRAD};
})(window);
