/* 골목 배달부 — 언덕 위 작은 골목 마을 (DentPhoto Village · Alley Postman)
   - 마을은 34×34 칸(한 칸 2.4m) 격자: 7×7 블록 사이로 한 칸 폭 골목, 가운데 종탑 광장, 블록 안 숨은 안마당과 건물 밑 샛길(터널).
     골목 몇 토막은 무작위로 막혀 막다른 길이 생기지만, 걸을 수 있는 칸은 언제나 모두 이어진다.
   - 모든 재질은 curve() 로 '작은 행성' 처럼 휘어 보인다: 정점 셰이더에서 주인공과 멀수록 y 를 d²·k 만큼 내린다(논리 좌표는 평평한 그대로).
   - 집 · 지붕 · 창은 색을 정점 색으로 넣어 몇 개의 메시로 합친다(그리기 호출이 적다). 외곽선은 EdgesGeometry 를 합친 선 하나.
   PM_TOWN.build({scene,seed}) → {G,CH,N,CS,HW,cx,ci,houses,post,homes,plaza,colliders,solid,camBlock,district,curve,toon,outline,mats,update} */
'use strict';
(function(root){
const T=THREE;
function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const CS=2.4,NB=7,BS=4,N=NB*(BS+1)-1,HW=N*CS/2;
const cx=i=>(i+.5)*CS-HW,ci=x=>Math.floor((x+HW)/CS);

/* ── 작은 행성 휨 · 툰 재질 · 외곽선 ── */
const CURVE={uCurve:{value:.0042},uCC:{value:new T.Vector2()},uOW:{value:.03}};
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
const GRAD=(()=>{const t=new T.DataTexture(new Uint8Array([105,180,255]),3,1,T.RedFormat);t.minFilter=t.magFilter=T.NearestFilter;t.generateMipmaps=false;t.needsUpdate=true;return t})();
const toonCache=new Map();
function toon(o){if(typeof o==='string'){if(!toonCache.has(o))toonCache.set(o,curve(new T.MeshToonMaterial({color:o,gradientMap:GRAD})));return toonCache.get(o)}return curve(new T.MeshToonMaterial(Object.assign({gradientMap:GRAD},o)))}
const OUT=curve(new T.MeshBasicMaterial({color:'#3b2c2a',side:T.BackSide}),true);
// 둥근 몸(머리 · 몸통)에 뒤집은 껍데기를 덧씌워 만화 외곽선을 낸다
function outline(group,minVerts=40){const list=[];group.traverse(m=>{if(m.isMesh&&!m.userData.noOutline&&m.geometry.attributes.position.count>=minVerts&&!(m.material&&m.material.isMeshBasicMaterial))list.push(m)});
 list.forEach(m=>{const o=new T.Mesh(m.geometry,OUT);o.userData.noOutline=true;o.castShadow=false;o.receiveShadow=false;m.add(o)})}

/* ── 합치기 도구 ── */
const _m=new T.Matrix4(),_q=new T.Quaternion(),_e=new T.Euler(),_v=new T.Vector3(),_s=new T.Vector3();
function M(x,y,z,ry=0,sx=1,sy=1,sz=1,rx=0,rz=0){_e.set(rx,ry,rz);_q.setFromEuler(_e);return new T.Matrix4().compose(_v.set(x,y,z),_q,_s.set(sx,sy,sz))}
function mergeGeos(parts,attrs){let n=0;for(const p of parts)n+=p.attributes.position.count;const out=new T.BufferGeometry();
 for(const a of attrs){const sz=parts[0].attributes[a].itemSize,arr=new Float32Array(n*sz);let o=0;for(const p of parts){arr.set(p.attributes[a].array,o);o+=p.attributes[a].array.length}out.setAttribute(a,new T.BufferAttribute(arr,sz))}return out}
function Builder(){const parts=[],edges=[];const col=new T.Color();
 return{parts,add(geo,m,c,edge){const g=geo.index?geo.toNonIndexed():geo.clone();g.applyMatrix4(m);const n=g.attributes.position.count,a=new Float32Array(n*3);col.set(c);for(let k=0;k<n;k++){a[k*3]=col.r;a[k*3+1]=col.g;a[k*3+2]=col.b}g.setAttribute('color',new T.BufferAttribute(a,3));
   if(!g.attributes.uv)g.setAttribute('uv',new T.BufferAttribute(new Float32Array(n*2),2));parts.push(g);if(edge){const e=new T.EdgesGeometry(geo,30);e.applyMatrix4(m);edges.push(e)}},
  mesh(mat,shadow=true){if(!parts.length)return null;const m=new T.Mesh(mergeGeos(parts,['position','normal','uv','color']),mat);m.castShadow=shadow;m.receiveShadow=true;m.frustumCulled=false;return m},
  lines(mat){if(!edges.length)return null;const l=new T.LineSegments(mergeGeos(edges,['position']),mat);l.frustumCulled=false;return l}}}
const BOX=new T.BoxGeometry(1,1,1),CYL=new T.CylinderGeometry(.5,.5,1,12),BLOB=new T.IcosahedronGeometry(1,1),CONE4=new T.ConeGeometry(.5,1,4);
function prism(w,h,len){const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(0,h);s.closePath();const g=new T.ExtrudeGeometry(s,{depth:len,bevelEnabled:false});g.translate(0,0,-len/2);return g}
function canvasTex(w,h,draw,rep){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;if(rep){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rep,rep)}return t}

const WALLS=[['#f3e3c3','크림색'],['#f4b89a','살구색'],['#eea5a5','분홍색'],['#a8d5ba','민트색'],['#9cc7e0','하늘색'],['#f3d77a','노란색'],['#c3b1e1','연보라색'],['#dd9474','벽돌색'],['#f6f1e7','하얀색'],['#bccc9f','연두색']];
const ROOFS=['#c96f4a','#b65a45','#5d8a8a','#7a6a8f','#d08c5a','#4f6f8f','#a04f4f'];
const DOORS=[['#3f6e9e','파란'],['#c0504d','빨간'],['#3f7d5a','초록'],['#7a4f9a','보라'],['#d9932f','주황'],['#6b4630','밤색']];
const ACCENT=['#ffffff','#5d8a8a','#c0504d','#3f6e9e','#7a6a8f','#d9932f','#5a7f5a'];
const DIST={n:'빨래줄 골목',e:'등불 골목',s:'고양이 골목',w:'화분 골목',c:'종탑 광장'};

function build({scene,seed=20261017}){
 const R=rng(seed),ri=n=>Math.floor(R()*n),pick=a=>a[ri(a.length)];
 /* ═══ 1. 격자 — 0 건물 · 1 골목 · 2 광장/안마당 · 3 샛길(위는 건물) · 4 종탑 ═══ */
 const G=new Uint8Array(N*N),CH=new Float32Array(N*N),HID=new Int16Array(N*N).fill(-1);
 const at=(i,j)=>i<0||j<0||i>=N||j>=N?0:G[j*N+i],set=(i,j,v)=>{G[j*N+i]=v};
 const walk=v=>v===1||v===2||v===3;
 for(let j=0;j<N;j++)for(let i=0;i<N;i++)if(i%5===4||j%5===4)set(i,j,1);
 const PB=3;for(let a=0;a<4;a++)for(let b=0;b<4;b++)set(PB*5+a,PB*5+b,2);
 for(let a=-1;a<=4;a++)for(let b=-1;b<=4;b++)if(at(PB*5+a,PB*5+b)===1)set(PB*5+a,PB*5+b,2);   // 광장 둘레 골목도 돌바닥 광장
 function connected(){let tot=0,s=-1;for(let k=0;k<N*N;k++)if(walk(G[k])){tot++;if(s<0)s=k}if(s<0)return true;const seen=new Uint8Array(N*N),st=[s];seen[s]=1;let c=0;
  while(st.length){const k=st.pop();c++;const i=k%N,j=(k-i)/N;for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=i+di,b=j+dj;if(a<0||b<0||a>=N||b>=N)continue;const kk=b*N+a;if(!seen[kk]&&walk(G[kk])){seen[kk]=1;st.push(kk)}}}return c===tot}
 const near=(bi,bj)=>Math.abs(bi-PB)<=1&&Math.abs(bj-PB)<=1;
 const blocks=[];for(let bi=0;bi<NB;bi++)for(let bj=0;bj<NB;bj++)if(!near(bi,bj))blocks.push([bi,bj]);
 for(let k=blocks.length-1;k>0;k--){const r=ri(k+1);[blocks[k],blocks[r]]=[blocks[r],blocks[k]]}
 const courts=[],tunnels=[];
 for(const [bi,bj] of blocks){const i0=bi*5,j0=bj*5;
  if(courts.length<5){const sides=[];if(bj>0)sides.push(0);if(bj<NB-1)sides.push(1);if(bi>0)sides.push(2);if(bi<NB-1)sides.push(3);
   for(let a=1;a<=2;a++)for(let b=1;b<=2;b++)set(i0+a,j0+b,2);const s=pick(sides),o=1+ri(2);
   const cell=s===0?[i0+o,j0]:s===1?[i0+o,j0+3]:s===2?[i0,j0+o]:[i0+3,j0+o];set(cell[0],cell[1],3);courts.push({bi,bj,x:cx(i0+1.5),z:cx(j0+1.5),door:cell,side:s});continue}
  if(tunnels.length<7){const horiz=R()<.5;if(horiz&&bi>0&&bi<NB-1){const r=j0+1+ri(2);for(let a=0;a<4;a++)set(i0+a,r,3);tunnels.push({horiz:true,i0,j:r})}
   else if(!horiz&&bj>0&&bj<NB-1){const c=i0+1+ri(2);for(let b=0;b<4;b++)set(c,j0+b,3);tunnels.push({horiz:false,i:c,j0})}}}
 // 골목 몇 토막을 막아 막다른 길을 만든다(이어짐은 지킨다)
 const segs=[];for(let a=0;a<NB-1;a++)for(let b=0;b<NB;b++){segs.push({v:true,a,b});segs.push({v:false,a,b})}
 for(const s of segs){if(R()>.46)continue;const cells=[];for(let k=0;k<4;k++)cells.push(s.v?[s.a*5+4,s.b*5+k]:[s.b*5+k,s.a*5+4]);
  if(cells.some(([i,j])=>at(i,j)!==1))continue;cells.forEach(([i,j])=>set(i,j,0));if(!connected())cells.forEach(([i,j])=>set(i,j,1))}
 // 종탑 — 광장 북서쪽 모서리 한 칸
 const TW={i:PB*5,j:PB*5};set(TW.i,TW.j,4);CH[TW.j*N+TW.i]=17;

 /* ═══ 2. 집 나누기 — 건물 칸을 1~3칸 네모로 묶는다 ═══ */
 const houses=[];
 for(let j=0;j<N;j++)for(let i=0;i<N;i++){if(at(i,j)!==0||HID[j*N+i]>=0)continue;
  const free=(a,b)=>at(a,b)===0&&HID[b*N+a]<0;let w=1,h=1;const mw=1+ri(3),mh=1+ri(3);
  while(w<mw&&free(i+w,j))w++;
  while(h<mh){let ok=true;for(let a=0;a<w;a++)if(!free(i+a,j+h)){ok=false;break}if(!ok)break;h++}
  const id=houses.length,x=cx(i+(w-1)/2),z=cx(j+(h-1)/2),pl=Math.hypot(x,z)<14;
  const floors=1+ri(3)+(pl?1:0),H=3.3+floors*2.7,wc=pick(WALLS);
  const hs={id,i0:i,j0:j,w,h,x,z,W:w*CS,D:h*CS,H,floors,wall:wc[0],wallName:wc[1],roof:pick(ROOFS),accent:pick(ACCENT),door:null,faces:[],gable:R()<.58};
  for(let a=0;a<w;a++)for(let b=0;b<h;b++){HID[(j+b)*N+i+a]=id;CH[(j+b)*N+i+a]=H}
  houses.push(hs)}
 // 바깥 면(걸을 수 있는 칸을 향한 면)
 for(const hs of houses){for(let a=0;a<hs.w;a++)for(let b=0;b<hs.h;b++){const i=hs.i0+a,j=hs.j0+b;
  for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const v=at(i+di,j+dj);if(!walk(v))continue;hs.faces.push({i,j,ni:i+di,nj:j+dj,nx:di,nz:dj,x:cx(i)+di*CS/2,z:cx(j)+dj*CS/2,t:v})}}
  const ok=hs.faces.filter(f=>f.t!==3);if(ok.length){const f=pick(ok);hs.door={x:f.x,z:f.z,nx:f.nx,nz:f.nz,i:f.ni,j:f.nj,face:f,col:pick(DOORS)}}}
 const solid=(i,j)=>{const v=at(i,j);return v===0||v===4};

 /* ═══ 3. 우체국 · 동네 사람들 집 ═══ */
 let post=null;{let best=-1;for(const hs of houses){if(!hs.faces.length)continue;for(const f of hs.faces){if(f.t!==2)continue;const sc=(f.z>0?40:0)+hs.w*hs.h*3-Math.abs(f.x)*2+(f.nz<0?30:0);if(sc>best){best=sc;post=hs;post._f=f}}}
  const f=post._f;post.door={x:f.x,z:f.z,nx:f.nx,nz:f.nz,i:f.ni,j:f.nj,face:f,col:['#c0504d','빨간']};post.wall='#f6efe0';post.roof='#c0504d';post.gable=true;post.accent='#c0504d';post.isPost=true;
  if(post.floors<2){post.floors=2;post.H=3.3+2*2.7;for(let a=0;a<post.w;a++)for(let b=0;b<post.h;b++)CH[(post.j0+b)*N+post.i0+a]=post.H}}
 function districtKey(x,z){if(Math.max(Math.abs(x),Math.abs(z))<11)return 'c';return Math.abs(x)>Math.abs(z)?(x>0?'e':'w'):(z>0?'s':'n')}
 const district=(x,z)=>DIST[districtKey(x,z)];
 // 15집: 광장 밖에서 서로 멀리, 네 골목에 고르게
 const cands=houses.filter(h=>h.door&&h!==post&&districtKey(h.door.x,h.door.z)!=='c'&&h.door.face.t===1);if(cands.length<20)houses.forEach(h=>{if(h.door&&h!==post&&!cands.includes(h)&&Math.hypot(h.door.x,h.door.z)>9)cands.push(h)});
 const homes=[];const want=15;
 while(homes.length<want&&cands.length){let best=null,bd=-Infinity;const cnt={n:0,e:0,s:0,w:0};homes.forEach(h=>cnt[districtKey(h.door.x,h.door.z)]++);
  for(const h of cands){if(homes.includes(h))continue;const dk=districtKey(h.door.x,h.door.z);let d=homes.length?Math.min(...homes.map(o=>Math.hypot(o.door.x-h.door.x,o.door.z-h.door.z))):Math.hypot(h.door.x,h.door.z);d-=cnt[dk]*6;d+=R()*3;if(d>bd){bd=d;best=h}}
  if(!best)break;homes.push(best)}
 const usedWall=new Set();homes.forEach((h,k)=>{h.door.col=DOORS[k%DOORS.length];let tries=0;while(usedWall.has(h.wall+districtKey(h.x,h.z))&&tries++<8){const w=pick(WALLS);h.wall=w[0];h.wallName=w[1]}usedWall.add(h.wall+districtKey(h.x,h.z));h.isHome=true});

 /* ═══ 4. 집 짓기 ═══ */
 const B=Builder(),BR=Builder();   // B: 벽 · 지붕 · 소품(외곽선 있음) · BR: 작은 소품(외곽선 없음)
 const glassLit=[],glassDark=[],frames=[],shutters=[],boxes=[],flowers=[],doorsI=[],lampsI=[];
 const colliders=[];
 const darker=(c,k)=>{const o=new T.Color(c);o.offsetHSL(0,-.02,-k);return '#'+o.getHexString()};
 for(const hs of houses){const {x,z,W,D,H}=hs;
  B.add(BOX,M(x,H/2,z,0,W,H,D),hs.wall,true);
  B.add(BOX,M(x,.32,z,0,W+.08,.64,D+.08),darker(hs.wall,.12));
  B.add(BOX,M(x,H-.1,z,0,W+.16,.22,D+.16),darker(hs.wall,-.05));
  if(hs.floors>1)B.add(BOX,M(x,3.25,z,0,W+.06,.12,D+.06),darker(hs.wall,.06));
  if(hs.gable){const along=W>=D,len=(along?W:D)+.5,wd=(along?D:W)+.7,rh=.9+Math.min(W,D)*.22,g=prism(wd,rh,len);B.add(g,M(x,H,z,along?Math.PI/2:0),hs.roof,true);
   if(R()<.5){const cxp=x+(R()-.5)*W*.5,czp=z+(R()-.5)*D*.5;B.add(BOX,M(cxp,H+rh*.6,czp,0,.5,1.4,.5),darker(hs.wall,.1),true)}}
  else{for(const [ox,oz,w,d] of [[0,D/2,W,.18],[0,-D/2,W,.18],[W/2,0,.18,D],[-W/2,0,.18,D]])B.add(BOX,M(x+ox,H+.25,z+oz,0,w+.18,.5,d+.18),darker(hs.wall,-.04));
   B.add(BOX,M(x,H+.02,z,0,W-.1,.06,D-.1),'#b8a993');const r=R();
   if(r<.35){B.add(CYL,M(x+W*.2,H+.9,z-D*.15,0,1.1,1.5,1.1),'#d9d4c7',true);B.add(CYL,M(x+W*.2,H+1.7,z-D*.15,0,1.2,.12,1.2),'#b9b2a4')}
   else if(r<.7){for(let k=0;k<3;k++){const px=x+(R()-.5)*(W-1),pz=z+(R()-.5)*(D-1);BR.add(CYL,M(px,H+.25,pz,0,.5,.4,.5),'#c8754f');BR.add(BLOB,M(px,H+.65,pz,0,.38,.34,.38),pick(['#6fae6a','#8cc47a','#5a9a63']))}}}
  // 창 · 문
  for(const f of hs.faces){const ry=Math.atan2(f.nx,f.nz),px=f.x+f.nx*.02,pz=f.z+f.nz*.02,isDoor=hs.door&&hs.door.face===f;
   const winAt=(y,big)=>{const m=M(px,y,pz,ry,big?1.5:1,big?1.1:1,1);frames.push({m,c:hs.accent});(R()<.55?glassLit:glassDark).push(m);
    if(!big&&R()<.5){for(const s of [-1,1])shutters.push({m:M(px+Math.cos(ry)*s*.66,y,pz-Math.sin(ry)*s*.66,ry),c:hs.accent==='#ffffff'?'#5d8a8a':hs.accent})}
    if(!big&&R()<.4){boxes.push(M(px+f.nx*.14,y-.66,pz+f.nz*.14,ry));for(let k=-1;k<=1;k++)flowers.push({m:M(px+f.nx*.18+Math.cos(ry)*k*.28,y-.48,pz+f.nz*.18-Math.sin(ry)*k*.28,0,.13,.13,.13),c:pick(['#f28aa0','#f6d36b','#fbf6ea','#e2664f','#c58fe0'])})}};
   if(f.t===3)continue;
   for(let k=1;k<=hs.floors;k++)if(R()<.88)winAt(3.3+(k-1)*2.7+1.35);
   if(isDoor){doorsI.push({m:M(px,1.1,pz,ry),c:hs.door.col[0]});B.add(BOX,M(f.x+f.nx*.25,.07,f.z+f.nz*.25,ry,1.3,.14,.5),'#cfc6b4');if(R()<.6||hs.isHome||hs.isPost)lampsI.push(M(px+Math.cos(ry)*.85,2.35,pz-Math.sin(ry)*.85,ry))}
   else if(R()<.45)winAt(1.55,R()<.25)}}
 // 샛길 지붕(터널) — 양옆 집 높이까지 덮는다
 for(let j=0;j<N;j++)for(let i=0;i<N;i++){if(at(i,j)!==3)continue;const hx=solid(i-1,j)||solid(i+1,j),hz=solid(i,j-1)||solid(i,j+1);
  const nb=hx&&!hz?[[i-1,j],[i+1,j]]:[[i,j-1],[i,j+1]];const hts=nb.filter(([a,b])=>solid(a,b)).map(([a,b])=>CH[b*N+a]);const h=Math.max(5.2,hts.length?Math.min(...hts):6);
  const nh=nb.map(([a,b])=>HID[b*N+a]).find(k=>k>=0),col=nh!==undefined?houses[nh].wall:'#f3e3c3';CH[j*N+i]=-h;
  B.add(BOX,M(cx(i),(2.75+h)/2,cx(j),0,CS,h-2.75,CS),col,true);B.add(BOX,M(cx(i),2.72,cx(j),0,CS+.02,.1,CS+.02),darker(col,.25));lampsI.push(M(cx(i),2.5,cx(j),0,1,1,1,Math.PI/2))}
 // 종탑
 {const x=cx(TW.i),z=cx(TW.j),h=17;B.add(BOX,M(x,h/2,z,0,2.3,h,2.3),'#efe2c8',true);B.add(BOX,M(x,.4,z,0,2.5,.8,2.5),'#c9b89a');B.add(BOX,M(x,h-3.2,z,0,2.5,.25,2.5),'#c9b89a');
  B.add(BOX,M(x,h+.1,z,0,2.6,.25,2.6),'#c9b89a');B.add(CONE4,M(x,h+1.6,z,Math.PI/4,3.4,3,3.4),'#4f6f8f',true);B.add(CYL,M(x,h+3.4,z,0,.06,.9,.06),'#6b5a45');
  const face=canvasTex(256,256,(c,w)=>{c.fillStyle='#fffaf0';c.beginPath();c.arc(128,128,120,0,7);c.fill();c.strokeStyle='#3b2c2a';c.lineWidth=10;c.stroke();for(let k=0;k<12;k++){const a=k/12*Math.PI*2;c.fillStyle='#3b2c2a';c.fillRect(124+Math.sin(a)*96,124-Math.cos(a)*96,8,8)}});
  const fm=curve(new T.MeshBasicMaterial({map:face,transparent:true}));for(const [nx,nz] of [[0,1],[1,0],[0,-1],[-1,0]]){const p=new T.Mesh(new T.CircleGeometry(.85,24),fm);p.position.set(x+nx*1.17,h-1.6,z+nz*1.17);p.rotation.y=Math.atan2(nx,nz);scene.add(p)}
  const bell=new T.Mesh(new T.ConeGeometry(.45,.7,12,1,true),toon({color:'#d9a441',side:T.DoubleSide}));bell.position.set(x,h-2.4,z);scene.add(bell);
  for(const [nx,nz] of [[0,1],[1,0],[0,-1],[-1,0]])B.add(BOX,M(x+nx*1.12,h-2.4,z+nz*1.12,Math.atan2(nx,nz),1.2,1.6,.1),'#3b3346');
  }
 // 분수
 const fountain={x:0,z:0};{B.add(CYL,M(0,.3,0,0,4.2,.6,4.2),'#d8cdb8',true);B.add(CYL,M(0,.58,0,0,3.7,.08,3.7),'#79c3d6');B.add(CYL,M(0,1.1,0,0,.5,1.2,.5),'#d8cdb8',true);B.add(CYL,M(0,1.75,0,0,1.5,.2,1.5),'#d8cdb8',true);B.add(CYL,M(0,1.86,0,0,1.3,.06,1.3),'#8fd0e0');B.add(BLOB,M(0,2.15,0,0,.28,.4,.28),'#d8cdb8');colliders.push({x:0,z:0,r:2.2})}
 // 광장 벤치 · 나무 · 안마당
 const tree=(x,z,s=1)=>{B.add(CYL,M(x,1*s,z,0,.32*s,2*s,.32*s),'#8a6648',true);const gc=pick(['#7fbf73','#8cc47a','#6fae6a','#9ccf84']);B.add(BLOB,M(x,2.6*s,z,0,1.4*s,1.15*s,1.4*s),gc,true);B.add(BLOB,M(x+.6*s,3.3*s,z+.2*s,0,1*s,.9*s,1*s),gc,true);B.add(BLOB,M(x-.5*s,3.2*s,z-.4*s,0,.95*s,.85*s,.95*s),gc,true);colliders.push({x,z,r:.45*s})};
 const bench=(x,z,ry)=>{B.add(BOX,M(x,.45,z,ry,1.6,.1,.5),'#a8754f',true);B.add(BOX,M(x-Math.sin(ry)*.22,.75,z-Math.cos(ry)*.22,ry,1.6,.45,.08),'#a8754f',true);for(const s of [-1,1])B.add(BOX,M(x+Math.cos(ry)*s*.65,.22,z-Math.sin(ry)*s*.65,ry,.1,.44,.45),'#5e4a3a');colliders.push({x,z,r:.7})};
 tree(5.4,-5.4,1.05);tree(-5.4,5.4,1);bench(4.2,2.6,-Math.PI/2);bench(-2.6,-4.4,0);
 courts.forEach((c,k)=>{tree(c.x+(R()-.5)*.8,c.z+(R()-.5)*.8,.8+R()*.25);if(k%2)bench(c.x+1.3,c.z+1.6,Math.PI)});
 // 담장 화분 · 빨랫줄 · 줄 전구 — 골목 칸마다 무작위(골목 이름에 맞춰 더 많이)
 const pots=[],laundry=[],bulbs=[],wires=[],cats=[];
 for(let j=0;j<N;j++)for(let i=0;i<N;i++){const v=at(i,j);if(v!==1)continue;const x=cx(i),z=cx(j),dk=districtKey(x,z);
  const ew=solid(i-1,j)&&solid(i+1,j),ns=solid(i,j-1)&&solid(i,j+1);
  for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){if(!solid(i+di,j+dj))continue;if(R()<(dk==='w'?.5:.16)){const t=(R()-.5)*1.4,px=x+di*(CS/2-.32)+(dj?t:0),pz=z+dj*(CS/2-.32)+(di?t:0);pots.push([px,pz,.7+R()*.6])}}
  if((ew||ns)&&(dk==='n'?R()<.4:R()<.08)){const y=4.3+R()*1.6,lim=ew?Math.min(CH[j*N+i-1],CH[j*N+i+1]):Math.min(CH[(j-1)*N+i],CH[(j+1)*N+i]);if(lim>y+.5)laundry.push({x,z,y,ew})}
  else if((ew||ns)&&(dk==='e'?R()<.45:R()<.1)){const y=3.7+R()*1.2,lim=ew?Math.min(CH[j*N+i-1],CH[j*N+i+1]):Math.min(CH[(j-1)*N+i],CH[(j+1)*N+i]);if(lim>y+.4)wires.push({x,z,y,ew})}}
 // 화분(벽에 붙여서 · 부딪히지 않는다)
 for(const [x,z,s] of pots){BR.add(CYL,M(x,.22*s,z,0,.42*s,.44*s,.42*s),pick(['#c8754f','#b86b4a','#d9c7a8','#6f8fa8']));BR.add(BLOB,M(x,.6*s,z,0,.32*s,.3*s,.32*s),pick(['#6fae6a','#8cc47a','#5a9a63','#f28aa0']))}
 // 바닥 — 돌길(마을) · 풀밭(바깥)
 const cobble=canvasTex(512,512,(c,w,h)=>{c.fillStyle='#bdb09a';c.fillRect(0,0,w,h);const r2=rng(5);for(let y=0;y<h;y+=32)for(let x=-16;x<w;x+=32){const ox=x+((y/32)%2?16:0)+(r2()-.5)*4,oy=y+(r2()-.5)*4,l=72+r2()*16;c.fillStyle=`hsl(${32+r2()*14},${18+r2()*10}%,${l}%)`;c.beginPath();c.roundRect(ox+2,oy+2,28,28,9);c.fill()}});cobble.wrapS=cobble.wrapT=T.RepeatWrapping;cobble.repeat.set(N*CS/3.2,N*CS/3.2);
 const ground=new T.Mesh(new T.PlaneGeometry(N*CS,N*CS,96,96).rotateX(-Math.PI/2),toon({color:'#ffffff',map:cobble,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));ground.position.y=.01;ground.receiveShadow=true;ground.frustumCulled=false;scene.add(ground);
 const grassT=canvasTex(256,256,(c,w,h)=>{c.fillStyle='#9fcf86';c.fillRect(0,0,w,h);const r2=rng(9);for(let k=0;k<900;k++){c.fillStyle=r2()<.5?'#93c47b':'#acd893';c.fillRect(r2()*w,r2()*h,2,5)}for(let k=0;k<30;k++){c.fillStyle=r2()<.5?'#fbf6ea':'#f7c4d4';c.beginPath();c.arc(r2()*w,r2()*h,2.4,0,7);c.fill()}});grassT.wrapS=grassT.wrapT=T.RepeatWrapping;grassT.repeat.set(70,70);
 const gg=new T.PlaneGeometry(360,360,140,140).rotateX(-Math.PI/2);{const p=gg.attributes.position;for(let k=0;k<p.count;k++){const x=p.getX(k),z=p.getZ(k),d=Math.max(Math.abs(x),Math.abs(z))-HW-6;if(d>0)p.setY(k,Math.min(1,d/30)*(Math.sin(x*.07)*Math.cos(z*.06)*4+Math.sin(x*.023+z*.031)*6+3))}gg.computeVertexNormals()}
 const grass=new T.Mesh(gg,toon({color:'#ffffff',map:grassT}));grass.receiveShadow=true;grass.frustumCulled=false;scene.add(grass);
 // 마을 둘레 나무 숲
 {const r2=rng(77);for(let k=0;k<70;k++){const a=r2()*Math.PI*2,d=HW+8+r2()*60,x=Math.cos(a)*d,z=Math.sin(a)*d;const y=Math.min(1,(Math.max(Math.abs(x),Math.abs(z))-HW-6)/30)*(Math.sin(x*.07)*Math.cos(z*.06)*4+Math.sin(x*.023+z*.031)*6+3);if(Math.max(Math.abs(x),Math.abs(z))<HW+5)continue;const s=1.2+r2()*1.3;
  if(r2()<.5){BR.add(CYL,M(x,y+1*s,z,0,.3*s,2*s,.3*s),'#8a6648');BR.add(new T.ConeGeometry(1.3*s,3.4*s,7),M(x,y+3.4*s,z),pick(['#5f9a6a','#6fae6a','#4f8a5f']))}else{BR.add(CYL,M(x,y+1*s,z,0,.3*s,2*s,.3*s),'#8a6648');BR.add(BLOB,M(x,y+2.8*s,z,0,1.5*s,1.3*s,1.5*s),pick(['#7fbf73','#8cc47a','#9ccf84']))}}}

 const VC=toon({color:'#ffffff',vertexColors:true}),walls=B.mesh(VC),small=BR.mesh(VC);scene.add(walls);small&&scene.add(small);
 const edgeMat=curve(new T.LineBasicMaterial({color:'#4a3a33',transparent:true,opacity:.55}));const ed=B.lines(edgeMat);ed&&scene.add(ed);
 /* 창 · 덧창 · 꽃상자 · 문 · 등 — 인스턴스 */
 const inst=(geo,mat,list,col,shadow)=>{if(!list.length)return null;const m=new T.InstancedMesh(geo,mat,list.length);list.forEach((it,k)=>{m.setMatrixAt(k,it.m||it);if(col)m.setColorAt(k,new T.Color(it.c))});m.castShadow=!!shadow;m.receiveShadow=true;m.frustumCulled=false;scene.add(m);return m};
 const frameG=new T.BoxGeometry(1.02,1.28,.12),glassG=new T.BoxGeometry(.8,1.04,.08).translate(0,0,.04),shutG=new T.BoxGeometry(.32,1.2,.06).translate(0,0,.05),boxG=new T.BoxGeometry(.95,.24,.3),flowerG=new T.IcosahedronGeometry(1,0),doorG=new T.BoxGeometry(1.05,2.2,.14);
 inst(frameG,toon('#ffffff'),frames,true);
 const litMat=toon({color:'#ffe9b0',emissive:'#ffc46b',emissiveIntensity:0}),darkMat=toon({color:'#7aa6c2',emissive:'#ffcf86',emissiveIntensity:0});
 inst(glassG,litMat,glassLit);inst(glassG,darkMat,glassDark);inst(shutG,toon('#ffffff'),shutters,true);inst(boxG,toon('#8a6648'),boxes);inst(flowerG,toon('#ffffff'),flowers,true);inst(doorG,toon('#ffffff'),doorsI,true,true);
 // 벽 등(밤에 켜짐) — 등 몸 + 빛나는 구슬
 const lampG=new T.CylinderGeometry(.09,.13,.3,6).translate(0,.18,.24),bulbMat=curve(new T.MeshBasicMaterial({color:'#fff1c4'}));
 inst(lampG,toon('#9a7a52'),lampsI);const lampBulb=inst(new T.SphereGeometry(.11,10,8).translate(0,-.02,.24),bulbMat,lampsI);
 // 줄 전구(등불 골목)
 const wireG=Builder();const bulbList=[];for(const w of wires){const L=CS,a=new T.Vector3(),b=new T.Vector3();if(w.ew){a.set(w.x-L/2,w.y,w.z+(R()-.5));b.set(w.x+L/2,w.y,w.z+(R()-.5))}else{a.set(w.x+(R()-.5),w.y,w.z-L/2);b.set(w.x+(R()-.5),w.y,w.z+L/2)}
  for(let k=0;k<=6;k++){const t=k/6,p=a.clone().lerp(b,t);p.y-=Math.sin(Math.PI*t)*.45;if(k>0&&k<6)bulbList.push({m:M(p.x,p.y-.08,p.z,0,.09,.11,.09),c:pick(['#ffd36b','#ff9a8a','#9fe0ff','#b8f59a','#ffb3e6'])});if(k<6){const q=a.clone().lerp(b,(k+1)/6);q.y-=Math.sin(Math.PI*(k+1)/6)*.45;const mid=p.clone().add(q).multiplyScalar(.5),len=p.distanceTo(q);const m=new T.Matrix4().lookAt(p,q,new T.Vector3(0,1,0));m.multiply(new T.Matrix4().makeRotationX(Math.PI/2));m.setPosition(mid);m.scale(new T.Vector3(.025,len,.025));wireG.add(CYL,m,'#3b3346')}}}
 const wireMesh=wireG.mesh(toon('#3b3346'),false);wireMesh&&scene.add(wireMesh);
 const bulbMatS=curve(new T.MeshBasicMaterial({color:'#ffffff'}));const strBulbs=inst(new T.SphereGeometry(1,8,6),bulbMatS,bulbList,true);
 // 빨랫줄(빨래줄 골목) — 바람에 살랑
 const lineG=Builder(),cloth=[];for(const l of laundry){const L=CS,a=new T.Vector3(),b=new T.Vector3();if(l.ew){a.set(l.x-L/2,l.y,l.z);b.set(l.x+L/2,l.y,l.z)}else{a.set(l.x,l.y,l.z-L/2);b.set(l.x,l.y,l.z+L/2)}
  const m=new T.Matrix4().lookAt(a,b,new T.Vector3(0,1,0));m.multiply(new T.Matrix4().makeRotationX(Math.PI/2));m.setPosition(a.clone().add(b).multiplyScalar(.5).add(new T.Vector3(0,-.12,0)));m.scale(new T.Vector3(.02,L,.02));lineG.add(CYL,m,'#efe8da');
  const n=2+ri(3);for(let k=0;k<n;k++){const t=(k+.5)/n+(R()-.5)*.08,p=a.clone().lerp(b,t);p.y-=Math.sin(Math.PI*t)*.25;cloth.push({x:p.x,y:p.y,z:p.z,ry:l.ew?0:Math.PI/2,w:.45+R()*.35,h:.55+R()*.4,c:pick(['#f28aa0','#9cc7e0','#fbf6ea','#f3d77a','#a8d5ba','#c3b1e1','#e2664f']),ph:R()*6})}}
 const lineMesh=lineG.mesh(toon('#efe8da'),false);lineMesh&&scene.add(lineMesh);
 const clothM=new T.InstancedMesh(new T.PlaneGeometry(1,1).translate(0,-.5,0),toon({color:'#ffffff',side:T.DoubleSide}),Math.max(1,cloth.length));clothM.count=cloth.length;clothM.castShadow=true;clothM.frustumCulled=false;cloth.forEach((c,k)=>clothM.setColorAt(k,new T.Color(c.c)));scene.add(clothM);
 // 고양이 자리 — 고양이 골목 문 앞 · 담 위
 for(const hs of houses){if(!hs.door||hs.isHome||hs.isPost)continue;const dk=districtKey(hs.x,hs.z);if(R()<(dk==='s'?.3:.04))cats.push({x:hs.door.x+hs.door.nx*.55+(R()<.5?-1:1)*hs.door.nz*.8,z:hs.door.z+hs.door.nz*.55+(R()<.5?-1:1)*hs.door.nx*.8,ry:Math.atan2(hs.door.nx,hs.door.nz)+(R()-.5)})}

 /* 우체국 간판 · 빨간 우체통 · 집 간판(동네 사람 가게 이름은 game.js 가 setSign 으로 쓴다) */
 function signMesh(text,sub,bg,fg,w=2.4,h=.7){const tex=canvasTex(512,Math.round(512*h/w),(c,W,H)=>{c.fillStyle=bg;c.beginPath();c.roundRect(4,4,W-8,H-8,26);c.fill();c.strokeStyle='rgba(59,44,42,.8)';c.lineWidth=6;c.stroke();c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';c.font=`800 ${sub?54:H>300?H*.6:64}px "Jua","Gaegu","Apple SD Gothic Neo","Malgun Gothic",sans-serif`;c.fillText(text,W/2,sub?58:H/2+2);if(sub){c.font='600 30px "Jua","Apple SD Gothic Neo",sans-serif';c.globalAlpha=.8;c.fillText(sub,W/2,112)}});
  const m=new T.Mesh(new T.PlaneGeometry(w,h),curve(new T.MeshBasicMaterial({map:tex,transparent:true})));return m}
 function setSign(hs,text,sub,bg='#fffaf0',fg='#3b2c2a'){const d=hs.door,ry=Math.atan2(d.nx,d.nz);const g=new T.Group();g.position.set(d.x+d.nx*.04,2.95,d.z+d.nz*.04);g.rotation.y=ry;scene.add(g);
  // 문 위 작은 차양 + 걸린 간판(벽에서 튀어나온 쇠막대)
  const aw=new T.Mesh(new T.BoxGeometry(1.7,.08,.75),toon(hs.accent==='#ffffff'?'#c0504d':hs.accent));aw.position.set(0,-.38,.36);aw.rotation.x=.28;aw.castShadow=true;g.add(aw);
  const s=signMesh(text,sub,bg,fg,1.9,.56);s.position.set(0,.18,.03);g.add(s);
  const arm=new T.Mesh(new T.BoxGeometry(.05,.05,.9),toon('#3b3346'));arm.position.set(1.15,.25,.45);g.add(arm);
  const hang=signMesh(Array.from(text)[0],'',bg,fg,.62,.62);hang.position.set(1.15,-.16,.8);hang.rotation.y=Math.PI/2;hang.material.side=T.DoubleSide;g.add(hang);return g}
 setSign(post,'✉ 골목 우체국','ALLEY POST OFFICE','#c0504d','#fffaf0');
 {const d=post.door,ry=Math.atan2(d.nx,d.nz),s=Math.cos(ry),c=-Math.sin(ry);const px=d.x+d.nx*.55+s*1.25,pz=d.z+d.nz*.55+c*1.25;const pb=new T.Group();pb.position.set(px,0,pz);pb.rotation.y=ry;scene.add(pb);
  const red=toon('#d6453d');const b1=new T.Mesh(new T.CylinderGeometry(.34,.34,1.1,16),red);b1.position.y=.75;b1.castShadow=true;pb.add(b1);const b2=new T.Mesh(new T.SphereGeometry(.34,16,8,0,Math.PI*2,0,Math.PI/2),red);b2.position.y=1.3;pb.add(b2);
  const sl=new T.Mesh(new T.BoxGeometry(.36,.05,.05),toon('#3b2c2a'));sl.position.set(0,1.05,.33);pb.add(sl);const ft=new T.Mesh(new T.CylinderGeometry(.22,.26,.2,12),toon('#3b3346'));ft.position.y=.1;pb.add(ft);outline(pb,20);colliders.push({x:px,z:pz,r:.45});post.postbox={x:px,z:pz}}

 /* ── 판정 ── */
 function blockedCell(i,j){const v=at(i,j);return !(v===1||v===2||v===3)}
 function camBlock(x,y,z){const i=ci(x),j=ci(z);if(i<0||j<0||i>=N||j>=N)return false;const v=G[j*N+i];if(v===0||v===4)return y<CH[j*N+i]+1.2;if(v===3)return y>2.55&&y<-CH[j*N+i]+.8;return false}
 const plaza={x:0,z:0,r:7};
 /* ── 매 프레임: 빨래 · 밤 불빛 ── */
 const _o=new T.Object3D();
 function update(t,dt,px,pz,night){for(let k=0;k<cloth.length;k++){const c=cloth[k];if((Math.abs(c.x-px)>28||Math.abs(c.z-pz)>28)&&t>1)continue;_o.position.set(c.x,c.y,c.z);_o.rotation.set(Math.sin(t*2.2+c.ph)*.22,c.ry+Math.sin(t*1.3+c.ph)*.12,0);_o.scale.set(c.w,c.h,1);_o.updateMatrix();clothM.setMatrixAt(k,_o.matrix)}clothM.instanceMatrix.needsUpdate=true;
  litMat.emissiveIntensity=night*1.05;darkMat.emissiveIntensity=night*.25;bulbMat.color.setRGB(.55+night*.6,.5+night*.5,.35+night*.4);bulbMatS.color.setScalar(.55+night*.7)}
 update(0,0,0,0,0);
 return {G,CH,HID,N,CS,HW,cx,ci,at,houses,post,homes,courts,plaza,fountain,tower:TW,colliders,blockedCell,camBlock,district,districtKey,cats,CURVE,curve,toon,outline,signMesh,setSign,update,walk,mats:{litMat,darkMat}}}
root.PM_TOWN={build,curve,toon,outline,CURVE,rng,GRAD};
})(window);
