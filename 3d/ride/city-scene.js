/* 뉴욕 시내 장면(city.js 배치를 그린다): 아스팔트 왕복 1차선 · 보도 · 횡단보도 · 정지선 · 빌딩 숲(창문은 셰이더로) · 옥상 물탱크 ·
   전광판 · 가로등 · 가로수 · 신호등 · 과속 단속 카메라 · 표지판 · 차량(옐로 캡 포함) · 보행자 · 맨홀 김. 같은 모양은 인스턴스로 한 번에 그린다. */
(function(root){
function build({T,scene,C}){
 const g=new T.Group();g.visible=false;scene.add(g);
 const YC=C.YC,HALF=C.HALF,WALK=C.WALK,LANE=C.LANE;
 let seed=97;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
 const o0=C.world(0,0),oR=C.world(1,0),oF=C.world(0,1),ax={x:oR.x-o0.x,z:oR.z-o0.z},af={x:oF.x-o0.x,z:oF.z-o0.z};
 const dirW=(dR,dF)=>({x:ax.x*dR+af.x*dF,z:ax.z*dR+af.z*dF});
 const rotOf=(dR,dF)=>{const w=dirW(dR,dF);return Math.atan2(-w.x,-w.z)};
 const WV=(R,F,y=YC)=>{const w=C.world(R,F);return new T.Vector3(w.x,y,w.z)};
 const SP=(k,d,lat)=>C.segPoint(k,d,lat);
 const SM=(c,o)=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:.8},o||{}));
 const tex=(w,h,draw)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t};
 const FONT='"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",Arial,sans-serif';

 // ── 길 목록(모두 동서 · 남북 직선): 경로 9구간 + 모서리마다 이어지는 막다른 길 + 신호 교차로의 가로 길
 const S=[];const addStreet=(a,b,main,k)=>{if(Math.abs(a[0]-b[0])<.01)S.push({axis:'F',c:a[0],lo:Math.min(a[1],b[1]),hi:Math.max(a[1],b[1]),main,k});else S.push({axis:'R',c:a[1],lo:Math.min(a[0],b[0]),hi:Math.max(a[0],b[0]),main,k})};
 C.segs.forEach(s=>addStreet(s.a,s.b,true,s.k));
 for(let k=1;k<C.segs.length;k++){const v=C.V[k],di=C.segs[k-1].dir,dout=C.segs[k].dir;addStreet(v,[v[0]+di[0]*40,v[1]+di[1]*40],false);addStreet(v,[v[0]-dout[0]*40,v[1]-dout[1]*40],false)}
 for(const cs of C.crossStreets)addStreet(SP(cs.k,cs.d,cs.from),SP(cs.k,cs.d,cs.to),false);
 const along=(s,p)=>s.axis==='F'?p[1]:p[0],perp=(s,p)=>s.axis==='F'?p[0]:p[1];
 const P=(s,t,lat)=>s.axis==='F'?[s.c+lat,t]:[t,s.c+lat];   // 길 위 t, 옆으로 lat(+R / +F)
 // 교차점: 서로 수직인 두 길이 만나는 곳
 const X=[];for(let i=0;i<S.length;i++)for(let j=i+1;j<S.length;j++){const a=S[i],b=S[j];if(a.axis===b.axis)continue;const p=a.axis==='F'?[a.c,b.c]:[b.c,a.c];
  if(along(a,p)>=a.lo-.5&&along(a,p)<=a.hi+.5&&along(b,p)>=b.lo-.5&&along(b,p)<=b.hi+.5&&!X.some(q=>Math.hypot(q[0]-p[0],q[1]-p[1])<1))X.push(p)}
 const crossOn=s=>X.filter(p=>Math.abs(perp(s,p)-s.c)<.5&&along(s,p)>=s.lo-.5&&along(s,p)<=s.hi+.5).map(p=>along(s,p)).sort((a,b)=>a-b);
 // 오르막 · 내리막(입구 · 출구)은 경로 리본이 덮고, 평지 길만 직사각형으로
 const flat=s=>{let lo=s.lo,hi=s.hi;if(s.main&&s.k===0)lo=Math.max(lo,30);if(s.main&&s.k===C.segs.length-1)hi=Math.min(hi,C.V[C.V.length-1][1]-45);return [lo,hi]};
 const intervals=s=>{const [lo,hi]=flat(s);let out=[[lo,hi]];for(const x of crossOn(s)){const n=[];for(const [a,b] of out){if(x+WALK<=a||x-WALK>=b){n.push([a,b]);continue}if(x-WALK>a)n.push([a,x-WALK]);if(x+WALK<b)n.push([x+WALK,b])}out=n}return out.filter(([a,b])=>b-a>.5)};

 // ── 지면 판(시내 바닥): 원래 길 · 협곡 바닥 위로 깔리는 콘크리트 판
 const BB={r0:-185,r1:285,f0:-330,f1:225};
 const EXCL=[[-36,36,-1e9,-3],[198,1e9,-168,1e9],[-12,12,-1e9,32],[C.V[9][0]-12,C.V[9][0]+12,C.V[9][1]-47,1e9]];
 const inEx=(r0,r1,f0,f1)=>EXCL.some(e=>r1>e[0]&&r0<e[1]&&f1>e[2]&&f0<e[3]);
 {const list=[];for(let R=BB.r0;R<BB.r1;R+=10)for(let F=BB.f0;F<BB.f1;F+=10)if(!inEx(R,R+10,F,F+10))list.push([R+5,F+5]);
  const m=new T.InstancedMesh(new T.BoxGeometry(10,16,10).translate(0,-8,0),SM('#8e908d',{roughness:.95}),list.length),d=new T.Object3D();
  list.forEach((p,i)=>{d.position.copy(WV(p[0],p[1],YC-.01));d.updateMatrix();m.setMatrixAt(i,d.matrix)});m.receiveShadow=true;g.add(m)}

 // ── 아스팔트
 const asphalt=tex(256,256,(x,w,h)=>{x.fillStyle='#5a5e63';x.fillRect(0,0,w,h);for(let i=0;i<5200;i++){const c=rnd();x.fillStyle=c<.5?'rgba(30,32,36,.22)':c<.85?'rgba(140,145,150,.16)':'rgba(15,15,18,.3)';const s=.8+rnd()*2.2;x.fillRect(rnd()*w,rnd()*h,s,s)}
  for(let i=0;i<7;i++){x.strokeStyle='rgba(25,27,30,.35)';x.lineWidth=1+rnd()*2;x.beginPath();let px=rnd()*w,py=rnd()*h;x.moveTo(px,py);for(let j=0;j<6;j++){px+=(rnd()-.5)*50;py+=(rnd()-.5)*50;x.lineTo(px,py)}x.stroke()}});
 asphalt.wrapS=asphalt.wrapT=T.RepeatWrapping;
 const asMat=SM('#ffffff',{map:asphalt,roughness:.93,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 {const pos=[],uv=[],idx=[];const quad=(a,b,c,d,y)=>{const n=pos.length/3;for(const p of [a,b,c,d]){const w=C.world(p[0],p[1]);pos.push(w.x,y,w.z);uv.push(w.x/14,w.z/14)}idx.push(n,n+2,n+1,n,n+3,n+2)};
  for(const s of S){const [lo,hi]=flat(s);if(hi-lo<.1)continue;const a=P(s,lo,-HALF),b=P(s,hi,-HALF),c=P(s,hi,HALF),d=P(s,lo,HALF);quad(a,b,c,d,YC+.02)}
  // 입구 오르막 · 출구 내리막: 경로를 따라가는 리본 (흙길 반폭 9 → 시내 4.95)
  for(const [u0,u1] of [[0,33],[C.Lc-48,C.Lc]]){const n0=pos.length/3,steps=Math.ceil((u1-u0)/1.5);for(let i=0;i<=steps;i++){const u=u0+(u1-u0)*i/steps,p=C.localAt(u),nn=C.pathNormal(u),wd=HALF+(9-HALF)*(1-Math.min(1,C.latScale(u)<1?(1-C.latScale(u))/.45:0)),y=C.y(u)+.03;
    for(const sd of [-1,1]){const w=C.world(p[0]+nn[0]*wd*sd,p[1]+nn[1]*wd*sd);pos.push(w.x,y,w.z);uv.push(w.x/14,w.z/14)}if(i<steps){const a=n0+i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
  const m=new T.Mesh(geo,asMat);m.receiveShadow=true;g.add(m)}

 // ── 보도(턱 있는 콘크리트) · 노면 표시(겹 노란 중앙선 · 횡단보도 · 정지선)
 const boxes=[];   // [R0,R1,F0,F1,y0,y1,color]
 const rect=(s,t0,t1,l0,l1,y0,y1,col)=>{const a=P(s,t0,l0),b=P(s,t1,l1);boxes.push([Math.min(a[0],b[0]),Math.max(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[1],b[1]),y0,y1,col])};
 const walkCol='#b7b3aa',paint=[],walkMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.9}),paintMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.7,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
 for(const s of S){for(const [a,b] of intervals(s)){for(const sd of [-1,1])rect(s,a,b,sd*HALF,sd*WALK,YC,YC+.24,walkCol);
   paint.push([s,a,b,-.3,-.08,'#e9c03a'],[s,a,b,.08,.3,'#e9c03a'])}
  const [lo,hi]=flat(s);
  for(const x of crossOn(s))for(const side of [-1,1]){const e0=x+side*WALK,e1=x+side*HALF;if(Math.min(e0,e1)<lo-.1||Math.max(e0,e1)>hi+.1)continue;
   for(let l=-HALF+.45;l<HALF-.3;l+=1.15)paint.push([s,Math.min(e0,e1)+.35,Math.max(e0,e1)-.35,l,l+.6,'#f1f0ea'])}}
 for(const L of C.lights){const s=C.segs[L.k];const p0=SP(L.k,L.d-.25,0),p1=SP(L.k,L.d+.25,HALF-.2);const st=S.find(x=>x.main&&x.k===L.k);const t0=along(st,p0),t1=along(st,p1),q0=perp(st,p0)-st.c,q1=perp(st,p1)-st.c;paint.push([st,Math.min(t0,t1),Math.max(t0,t1),Math.min(q0,q1),Math.max(q0,q1),'#f4f4f0'])}
 {const pos=[],col=[],idx=[],c=new T.Color();const push=(R0,R1,F0,F1,y0,y1,cc)=>{c.set(cc);const n=pos.length/3;const v=[[R0,y0,F0],[R1,y0,F0],[R1,y0,F1],[R0,y0,F1],[R0,y1,F0],[R1,y1,F0],[R1,y1,F1],[R0,y1,F1]];
   for(const p of v){const w=C.world(p[0],p[2]);pos.push(w.x,p[1],w.z);col.push(c.r,c.g,c.b)}for(const f of [[4,5,6,4,6,7],[0,2,1,0,3,2],[0,1,5,0,5,4],[1,2,6,1,6,5],[2,3,7,2,7,6],[3,0,4,3,4,7]])idx.push(...f.map(i=>n+i))};
  for(const b of boxes)push(...b);
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(col,3));geo.setIndex(idx);const ng=geo.toNonIndexed();ng.computeVertexNormals();
  const m=new T.Mesh(ng,walkMat);m.receiveShadow=true;g.add(m);
  const pp=[],pc=[];for(const [s,a,b,l0,l1,cc] of paint){c.set(cc);const q=[P(s,a,l0),P(s,b,l0),P(s,b,l1),P(s,a,l1)].map(p=>C.world(p[0],p[1]));const tri=[0,1,2,0,2,3];const y=YC+.045;for(const i of tri){pp.push(q[i].x,y,q[i].z);pc.push(c.r,c.g,c.b)}}
  const pg=new T.BufferGeometry();pg.setAttribute('position',new T.Float32BufferAttribute(pp,3));pg.setAttribute('color',new T.Float32BufferAttribute(pc,3));pg.computeVertexNormals();
  const pm=new T.Mesh(pg,paintMat);pm.receiveShadow=true;g.add(pm)}

 // ── 빌딩 숲
 const blds=[];
 const free=(r0,r1,f0,f1)=>{if(r0<BB.r0||r1>BB.r1||f0<BB.f0||f1>BB.f1||inEx(r0,r1,f0,f1))return false;const m=WALK+.8;
  for(const s of S){if(s.axis==='F'){if(r1>s.c-m&&r0<s.c+m&&f1>s.lo-m&&f0<s.hi+m)return false}else if(f1>s.c-m&&f0<s.c+m&&r1>s.lo-m&&r0<s.hi+m)return false}
  for(const b of blds)if(r1>b.r0-.7&&r0<b.r1+.7&&f1>b.f0-.7&&f0<b.f1+.7)return false;return true};
 const MASON=['#c8b79c','#b9a184','#a8604a','#8f4e3d','#d6cfc1','#9c9a94','#b8b2a6','#7f6f62','#c9c2b4','#a2765a'],GLASS=['#4f6b85','#5d7e9a','#3e5468','#6f8ea6','#7a8f9f','#2f4558','#557089'];
 const addB=(r0,r1,f0,f1,h,front)=>{const glass=rnd()<(h>95?.72:.22);blds.push({r0,r1,f0,f1,h,glass,col:glass?GLASS[Math.floor(rnd()*GLASS.length)]:MASON[Math.floor(rnd()*MASON.length)],front})};
 for(const s of S)for(const side of [-1,1]){let t=s.lo-WALK;while(t<s.hi+WALK){const w=12+rnd()*13,dd=14+rnd()*18,l0=side*(WALK+.9),l1=side*(WALK+.9+dd),a=P(s,t,l0),b=P(s,t+w,l1);
   const r0=Math.min(a[0],b[0]),r1=Math.max(a[0],b[0]),f0=Math.min(a[1],b[1]),f1=Math.max(a[1],b[1]);
   if(free(r0,r1,f0,f1)){const tall=rnd()<(s.main?.13:.08);addB(r0,r1,f0,f1,tall?150+rnd()*115:(s.main?26:22)+Math.pow(rnd(),1.6)*(s.main?120:95),{s,side,t0:t,t1:t+w});t+=w+.9}else t+=3}}
 for(let R=BB.r0;R<BB.r1;R+=15)for(let F=BB.f0;F<BB.f1;F+=15){const w=10+rnd()*8,d=10+rnd()*8,r0=R+rnd()*3,f0=F+rnd()*3;if(free(r0,r0+w,f0,f0+d))addB(r0,r0+w,f0,f0+d,18+Math.pow(rnd(),1.3)*105,null)}
 // 창문: 층(3.9) · 칸 격자를 월드 좌표로 그린다. 유리 빌딩은 커튼월.
 const NIGHT={value:0};   // 밤이 되면 창문마다 불이 켜진다 (CITY_ENV.dark)
 const winMat=glass=>{const m=SM('#ffffff',{roughness:.82,metalness:glass?.25:.02});m.onBeforeCompile=sh=>{sh.uniforms.uNight=NIGHT;
   sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;varying vec3 vWN;').replace('#include <begin_vertex>',`#include <begin_vertex>
vec4 wpp=vec4(transformed,1.0);vec3 wn=objectNormal;
#ifdef USE_INSTANCING
wpp=instanceMatrix*wpp;wn=mat3(instanceMatrix)*wn;
#endif
wpp=modelMatrix*wpp;vWP=wpp.xyz;vWN=normalize(mat3(modelMatrix)*wn);`);
   sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;varying vec3 vWN;uniform float uNight;float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}').replace('#include <color_fragment>',`#include <color_fragment>
float winMask=0.,litW=0.;vec3 nn=normalize(vWN);
if(abs(nn.y)<.5){float a=abs(nn.x)>.5?vWP.z:vWP.x;float fy=(vWP.y-${YC.toFixed(2)})/3.9;
 vec2 cell=vec2(a/${glass?'2.3':'3.0'},fy);vec2 f=fract(cell),id=floor(cell);
 ${glass?'winMask=step(.05,f.x)*step(f.x,.95)*step(.08,f.y)*step(f.y,.96);':'winMask=step(.2,f.x)*step(f.x,.8)*step(.26,f.y)*step(f.y,.84);'}
 winMask*=step(1.25,fy);float lit=h21(id+floor(vWP.xz*.013));litW=lit;
 vec3 gl=${glass?'mix(diffuseColor.rgb*.62,vec3(.62,.74,.84),.35+.35*f.y+lit*.12)':'mix(vec3(.15,.2,.26),vec3(.45,.56,.66),.25+.5*f.y)+lit*.08'};
 diffuseColor.rgb=mix(diffuseColor.rgb,gl,winMask*.94);
 float sf=(1.-step(1.15,fy))*step(.22,fract(fy))*step(.08,fract(a/5.5))*step(fract(a/5.5),.9);
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.17,.21,.24),sf*.85);
 float band=step(.92,fract(fy))*(1.-winMask);diffuseColor.rgb*=1.-band*.18;
}else diffuseColor.rgb*=.72;`).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.22,winMask);').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=winMask*step(.4,litW)*uNight*mix(vec3(1.,.74,.4),vec3(.7,.84,1.),step(.82,litW))*(1.1+litW);')};return m};
 const tiers=[];   // 높은 빌딩의 윗단 · 첨탑
 for(const b of blds){if(b.h>110){const cx=(b.r0+b.r1)/2,cz=(b.f0+b.f1)/2,w=b.r1-b.r0,d=b.f1-b.f0;tiers.push({r0:cx-w*.36,r1:cx+w*.36,f0:cz-d*.36,f1:cz+d*.36,y:b.h,h:b.h*.17,glass:b.glass,col:b.col});
  if(rnd()<.6)tiers.push({r0:cx-w*.2,r1:cx+w*.2,f0:cz-d*.2,f1:cz+d*.2,y:b.h*1.17,h:b.h*.07,glass:b.glass,col:b.col,spire:rnd()<.7})}}
 const unit=new T.BoxGeometry(1,1,1).translate(0,.5,0),dmy=new T.Object3D(),cc=new T.Color();
 for(const glass of [false,true]){const list=blds.filter(b=>b.glass===glass).map(b=>({...b,y:0})).concat(tiers.filter(t=>t.glass===glass));
  const m=new T.InstancedMesh(unit,winMat(glass),list.length);list.forEach((b,i)=>{dmy.position.copy(WV((b.r0+b.r1)/2,(b.f0+b.f1)/2,YC+b.y-(b.y?0:.5)));dmy.rotation.set(0,0,0);dmy.scale.set(b.r1-b.r0,b.h+(b.y?0:.5),b.f1-b.f0);dmy.rotation.y=rotOf(0,1);dmy.updateMatrix();m.setMatrixAt(i,dmy.matrix);m.setColorAt(i,cc.set(b.col))});
  m.castShadow=true;m.receiveShadow=true;g.add(m)}
 const inst=(geo,mat,list,f,shadow=true)=>{if(!list.length)return null;const m=new T.InstancedMesh(geo,mat,list.length);list.forEach((x,i)=>{f(x,i);dmy.updateMatrix();m.setMatrixAt(i,dmy.matrix);if(x.c)m.setColorAt(i,cc.set(x.c))});m.castShadow=shadow;m.receiveShadow=true;g.add(m);return m};
 const at=(R,F,y,sx=1,sy=1,sz=1,ry=0)=>{dmy.position.copy(WV(R,F,y));dmy.rotation.set(0,ry,0);dmy.scale.set(sx,sy,sz)};
 {const sp=tiers.filter(t=>t.spire).map(t=>({R:(t.r0+t.r1)/2,F:(t.f0+t.f1)/2,y:YC+t.y+t.h}));
  inst(new T.ConeGeometry(1,1,8).translate(0,.5,0),SM('#c9ccd0',{metalness:.6,roughness:.35}),sp,s=>at(s.R,s.F,s.y,1.4,16,1.4));
  inst(new T.CylinderGeometry(.12,.12,1,6).translate(0,.5,0),SM('#9aa0a6',{metalness:.5}),sp,s=>at(s.R,s.F,s.y+15,1,12,1))}
 // 옥상 물탱크(뉴욕 명물) · 옥상 기계실
 {const wt=blds.filter(b=>!b.glass&&b.h<80&&rnd()<.42).map(b=>({R:b.r0+(b.r1-b.r0)*(.3+rnd()*.4),F:b.f0+(b.f1-b.f0)*(.3+rnd()*.4),y:YC+b.h}));
  inst(new T.CylinderGeometry(2.1,2.1,3.4,12).translate(0,1.7+2.1,0),SM('#7d5c3e',{roughness:.95}),wt,s=>at(s.R,s.F,s.y));
  inst(new T.ConeGeometry(2.35,1.7,12).translate(0,3.4+2.1+.85,0),SM('#5c4a3a'),wt,s=>at(s.R,s.F,s.y));
  const legs=[];wt.forEach(s=>{for(const [a,b] of [[-1.3,-1.3],[1.3,-1.3],[1.3,1.3],[-1.3,1.3]])legs.push({R:s.R+a,F:s.F+b,y:s.y})});
  inst(new T.BoxGeometry(.2,2.1,.2).translate(0,1.05,0),SM('#3a3f44'),legs,s=>at(s.R,s.F,s.y));
  const hv=blds.filter(b=>rnd()<.5).map(b=>({R:b.r0+(b.r1-b.r0)*(.25+rnd()*.5),F:b.f0+(b.f1-b.f0)*(.25+rnd()*.5),y:YC+b.h,w:2+rnd()*3,d:2+rnd()*3}));
  inst(unit,SM('#9a9ea2'),hv,s=>at(s.R,s.F,s.y,s.w,1.6,s.d))}
 // 차양 · 전광판(경로를 따라 서 있는 빌딩 앞면)
 const fronts=blds.filter(b=>b.front&&b.front.s.main);
 {const aw=[],AW=['#a8322d','#2d5a3c','#20354f','#b8792b','#6b2b4f','#2a6670'];fronts.forEach(b=>{const f=b.front,t=(f.t0+f.t1)/2,w=(f.t1-f.t0)*.7,p=P(f.s,t,f.side*(WALK+.2));aw.push({R:p[0],F:p[1],w,s:f.s,c:AW[Math.floor(rnd()*AW.length)]})});
  inst(new T.BoxGeometry(1,.28,1.5),SM('#ffffff',{roughness:.7}),aw,a=>{dmy.position.copy(WV(a.R,a.F,YC+4.5));dmy.rotation.set(0,rotOf(0,1),0);dmy.scale.set(a.s.axis==='F'?1:a.w,1,a.s.axis==='F'?a.w/1.5:1)})}
 const ADS=[
  (x,w,h)=>{x.fillStyle='#14213d';x.fillRect(0,0,w,h);x.fillStyle='#fca311';x.fillRect(0,h-34,w,34);x.fillStyle='#fff';x.font=`900 92px ${FONT}`;x.textAlign='center';x.fillText('DENTPHOTO',w/2,h*.5);x.font=`700 34px ${FONT}`;x.fillStyle='#e5e5e5';x.fillText('치과 사진관 · NEW YORK',w/2,h*.5+52)},
  (x,w,h)=>{x.fillStyle='#fff';x.fillRect(0,0,w,h);x.fillStyle='#111';x.font=`900 150px ${FONT}`;x.textAlign='center';x.fillText('I',w*.24,h*.66);x.fillText('NY',w*.72,h*.66);x.fillStyle='#e0282e';x.font=`900 150px ${FONT}`;x.fillText('♥',w*.45,h*.66)},
  (x,w,h)=>{const gr=x.createLinearGradient(0,0,w,h);gr.addColorStop(0,'#3a0ca3');gr.addColorStop(1,'#7209b7');x.fillStyle=gr;x.fillRect(0,0,w,h);x.fillStyle='#ffd166';x.textAlign='center';x.font=`800 40px ${FONT}`;x.fillText('BROADWAY',w/2,78);x.font=`900 76px ${FONT}`;x.fillText('바람을 따라',w/2,180);x.font=`700 30px ${FONT}`;x.fillStyle='#fff';x.fillText('THE MUSICAL · NOW PLAYING',w/2,250)},
  (x,w,h)=>{x.fillStyle='#d62828';x.fillRect(0,0,w,h);x.fillStyle='#fff';x.textAlign='center';x.font=`900 104px ${FONT}`;x.fillText('COFFEE',w/2,h*.52);x.font=`800 44px ${FONT}`;x.fillText('ANY SIZE $1',w/2,h*.52+64)},
  (x,w,h)=>{x.fillStyle='#1b4332';x.fillRect(0,0,w,h);x.strokeStyle='#d8f3dc';x.lineWidth=10;x.strokeRect(18,18,w-36,h-36);x.fillStyle='#d8f3dc';x.textAlign='center';x.font=`800 70px ${FONT}`;x.fillText('LETTERS & CO.',w/2,h*.48);x.font=`600 34px ${FONT}`;x.fillText('편지는 바람을 타고',w/2,h*.48+60)},
  (x,w,h)=>{x.fillStyle='#ffd60a';x.fillRect(0,0,w,h);x.fillStyle='#000';x.textAlign='center';x.font=`900 120px ${FONT}`;x.fillText('SALE',w/2,h*.48);x.font=`900 64px ${FONT}`;x.fillText('UP TO 70%',w/2,h*.48+80)},
  (x,w,h)=>{for(let i=0;i<16;i++)for(let j=0;j<10;j++){x.fillStyle=(i+j)%2?'#111':'#f6c90e';x.fillRect(i*w/16,j*h/10,w/16,h/10)}x.fillStyle='#f6c90e';x.fillRect(40,70,w-80,h-140);x.fillStyle='#111';x.textAlign='center';x.font=`900 80px ${FONT}`;x.fillText('TAXI 212',w/2,h*.6)},
  (x,w,h)=>{x.fillStyle='#023e8a';x.fillRect(0,0,w,h);x.fillStyle='#90e0ef';x.textAlign='center';x.font=`800 64px ${FONT}`;x.fillText('NEW YORK',w/2,h*.42);x.fillText('DENTAL',w/2,h*.42+72);x.fillStyle='#fff';x.font=`600 30px ${FONT}`;x.fillText('SMILE · 웃어요',w/2,h*.42+124)}];
 const adMats=ADS.map(d=>new T.MeshBasicMaterial({map:tex(512,320,d),toneMapped:false,side:T.DoubleSide}));
 {const V1=C.V[1];let n=0;fronts.forEach((b,i)=>{const f=b.front,t=(f.t0+f.t1)/2,p=P(f.s,t,0),nearTS=Math.hypot(p[0]-V1[0],p[1]-V1[1])<70;if(b.h<16||!(nearTS||i%4===1)||n>34)return;n++;
   const big=nearTS?1.5:1,nrm=f.s.axis==='F'?[-f.side,0]:[0,-f.side],q=P(f.s,t,f.side*(WALK+.75)),y=YC+8+rnd()*Math.min(14,b.h-12)*.8;
   const m=new T.Mesh(new T.PlaneGeometry(8.6*big,5.4*big),adMats[(i*5+n)%adMats.length]);m.position.copy(WV(q[0],q[1],y+2.7*big));m.rotation.y=Math.atan2(dirW(...nrm).x,dirW(...nrm).z);g.add(m)})}

 const mergeGeo=list=>{const pos=[],nor=[];for(const geo of list){const ng=geo.index?geo.toNonIndexed():geo;pos.push(...ng.attributes.position.array);nor.push(...ng.attributes.normal.array)}const out=new T.BufferGeometry();out.setAttribute('position',new T.Float32BufferAttribute(pos,3));out.setAttribute('normal',new T.Float32BufferAttribute(nor,3));return out};
 // ── 가로등 · 가로수 · 소화전 · 사람
 const lamps=[],trees=[],hyd=[],pedPaths=[];
 for(const s of S.filter(s=>s.main))for(const [a,b] of intervals(s))for(const side of [-1,1]){
  for(let t=a+6;t<b-4;t+=27){const p=P(s,t,side*(HALF+.65)),q=P(s,t,side*(HALF-1.55));lamps.push({R:p[0],F:p[1],s,side,bulb:WV(q[0],q[1],YC+8.5)})}
  for(let t=a+19;t<b-4;t+=27){const p=P(s,t,side*(WALK-1.5));trees.push({R:p[0],F:p[1],r:rnd()*6,k:.8+rnd()*.4})}
  for(let t=a+12;t<b-4;t+=71){const p=P(s,t,side*(HALF+.55));hyd.push({R:p[0],F:p[1]})}
  if(b-a>14)pedPaths.push({s,a:a+1,b:b-1,side})}
 inst(new T.CylinderGeometry(.13,.17,8.6,8).translate(0,4.3,0),SM('#34413c',{roughness:.6,metalness:.4}),lamps,l=>at(l.R,l.F,YC+.24));
 inst(new T.BoxGeometry(.16,.16,2.4).translate(0,8.5,-1.1),SM('#34413c',{metalness:.4}),lamps,l=>at(l.R,l.F,YC+.24,1,1,1,l.s.axis==='F'?rotOf(-l.side,0):rotOf(0,-l.side)));
 const bulbMat=new T.MeshStandardMaterial({color:'#fff6dc',emissive:'#fff1c8',emissiveIntensity:.6});inst(new T.BoxGeometry(.5,.22,1.1).translate(0,8.38,-2.2),bulbMat,lamps,l=>at(l.R,l.F,YC+.24,1,1,1,l.s.axis==='F'?rotOf(-l.side,0):rotOf(0,-l.side)),false);
 inst(new T.CylinderGeometry(.14,.2,2.6,6).translate(0,1.3,0),SM('#6b4f36'),trees,t=>at(t.R,t.F,YC+.24,t.k,t.k,t.k,t.r));
 const crownMat=SM('#5f8a4a',{flatShading:true});inst(new T.IcosahedronGeometry(1.6,1).translate(0,3.6,0),crownMat,trees,t=>at(t.R,t.F,YC+.24,t.k,t.k*1.1,t.k,t.r));
 inst(new T.CylinderGeometry(.22,.26,.8,8).translate(0,.4,0),SM('#c0302a',{roughness:.5}),hyd,h=>at(h.R,h.F,YC+.24));
 const PEDN=Math.min(90,pedPaths.length*3),peds=[],SHIRT=['#e76f51','#2a9d8f','#264653','#f4a261','#8d99ae','#d62828','#6a4c93','#1d3557','#ffb703','#f1faee'];
 for(let i=0;i<PEDN;i++){const p=pedPaths[i%pedPaths.length];peds.push({p,t:p.a+rnd()*(p.b-p.a),v:(rnd()<.5?-1:1)*(1+rnd()*.7),lat:p.side*(HALF+1.4+rnd()*2.4),ph:rnd()*6,c:SHIRT[Math.floor(rnd()*SHIRT.length)]})}
 const pedBody=new T.InstancedMesh(new T.CylinderGeometry(.3,.33,.8,8).translate(0,1.3,0),SM('#ffffff'),PEDN),pedHead=new T.InstancedMesh(new T.SphereGeometry(.27,10,8).translate(0,1.98,0),SM('#e0b48f'),PEDN),pedLegs=new T.InstancedMesh(mergeGeo([-.13,.13].map(x=>new T.CylinderGeometry(.12,.11,.9,6).translate(x,.45,0))),SM('#2f3540'),PEDN);
 peds.forEach((q,i)=>pedBody.setColorAt(i,cc.set(q.c)));pedBody.castShadow=pedHead.castShadow=true;g.add(pedBody,pedHead,pedLegs);

 // ── 표지판 · 입구 현수막 · 신호등 · 단속 카메라
 const signTex={};const signMat=(key,w,h,draw)=>{if(!signTex[key])signTex[key]=new T.MeshStandardMaterial({map:tex(w,h,draw),roughness:.6,side:T.DoubleSide});return signTex[key]};
 const pole=(R,F,h,c='#3b4246',r=.12)=>{const m=new T.Mesh(new T.CylinderGeometry(r,r*1.15,h,8),SM(c,{metalness:.4,roughness:.5}));m.position.copy(WV(R,F,YC+.24+h/2));m.castShadow=true;g.add(m);return m};
 const panel=(R,F,y,w,h,mat,face)=>{const m=new T.Mesh(new T.PlaneGeometry(w,h),mat);m.position.copy(WV(R,F,y));const d=dirW(face[0],face[1]);m.rotation.y=Math.atan2(d.x,d.z);m.castShadow=true;g.add(m);return m};
 const limitMat=signMat('limit',256,320,(x,w,h)=>{x.fillStyle='#fff';x.fillRect(0,0,w,h);x.strokeStyle='#111';x.lineWidth=12;x.strokeRect(14,14,w-28,h-28);x.fillStyle='#111';x.textAlign='center';x.font=`800 44px ${FONT}`;x.fillText('SPEED',w/2,78);x.fillText('LIMIT',w/2,126);x.font=`900 130px ${FONT}`;x.fillText(String(C.LIMIT),w/2,262)});
 const camWarnMat=signMat('camwarn',384,256,(x,w,h)=>{x.fillStyle='#ffcc00';x.fillRect(0,0,w,h);x.strokeStyle='#111';x.lineWidth=10;x.strokeRect(10,10,w-20,h-20);x.fillStyle='#111';x.textAlign='center';x.font=`900 46px ${FONT}`;x.fillText('과속 단속 카메라',w/2,74);x.font=`800 34px ${FONT}`;x.fillText('SPEED CAMERA AHEAD',w/2,124);x.beginPath();x.arc(w/2,188,46,0,7);x.fillStyle='#fff';x.fill();x.lineWidth=11;x.strokeStyle='#d62828';x.stroke();x.fillStyle='#111';x.font=`900 46px ${FONT}`;x.fillText(String(C.LIMIT),w/2,205)});
 C.segs.forEach((s,k)=>{const d=k===0?27:s.dS0+12;if(d>s.len-20)return;const p=SP(k,d,HALF+1.1);pole(p[0],p[1],3.6);panel(p[0],p[1],YC+3.4,1.15,1.45,limitMat,[-s.dir[0],-s.dir[1]])});
 for(const c of C.cameras){const s=C.segs[c.k];const w=SP(c.k,Math.max(s.dS0+3,c.d-38),HALF+1.1);pole(w[0],w[1],3.8);panel(w[0],w[1],YC+3.5,2.1,1.4,camWarnMat,[-s.dir[0],-s.dir[1]])}
 // 입구 현수막
 {const s=C.segs[0],a=SP(0,14,-(WALK-.8)),b=SP(0,14,WALK-.8);pole(a[0],a[1],12.6,'#2b3033',.2);pole(b[0],b[1],12.6,'#2b3033',.2);
  const ban=signMat('banner',1024,200,(x,w,h)=>{const gr=x.createLinearGradient(0,0,w,0);gr.addColorStop(0,'#0b2545');gr.addColorStop(1,'#13315c');x.fillStyle=gr;x.fillRect(0,0,w,h);x.fillStyle='#f4d35e';x.textAlign='center';x.font=`900 74px ${FONT}`;x.fillText('NEW YORK CITY',w/2,96);x.fillStyle='#fff';x.font=`700 40px ${FONT}`;x.fillText('뉴욕 시내 · 신호 준수 · 제한속도 '+C.LIMIT+' km/h',w/2,160)});
  const m=new T.Mesh(new T.PlaneGeometry(2*(WALK-.8),3.2),ban);const p=SP(0,14,0);m.position.copy(WV(p[0],p[1],C.y(14)+11.2));const d=dirW(-s.dir[0],-s.dir[1]);m.rotation.y=Math.atan2(d.x,d.z);g.add(m)}
 // 모서리마다 다음 길 이름(초록 표지) — 좌회전 ↰ / 우회전 ↱
 C.marks.forEach(mk=>{const s=C.segs[mk.k],p=SP(mk.k,s.len-WALK-2.2,HALF+1.1);if(!C.lights.some(l=>l.k===mk.k&&Math.abs(l.d-(s.len-WALK-4.5))<1))pole(p[0],p[1],5.2);
  const mat=signMat('st'+mk.k,512,128,(x,w,h)=>{x.fillStyle='#0f6b3a';x.fillRect(0,0,w,h);x.strokeStyle='#fff';x.lineWidth=6;x.strokeRect(8,8,w-16,h-16);x.fillStyle='#fff';x.textAlign='center';x.font=`900 64px ${FONT}`;x.fillText((mk.side<0?'↰ ':'')+mk.to+(mk.side>0?' ↱':''),w/2,86)});
  panel(p[0],p[1],YC+5.4,3.6,.9,mat,[-s.dir[0],-s.dir[1]])});
 // 신호등: 오른쪽 보도의 기둥 + 차선 위로 뻗은 팔 + 3색 등. 머리 두 개(높은 곳 · 기둥).
 const glowTex=tex(64,64,(x,w,h)=>{const r=x.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.35,'rgba(255,255,255,.55)');r.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=r;x.fillRect(0,0,w,h)});
 const LAMPC={red:'#ff1a0d',yellow:'#ffae00',green:'#14e86a'};
 const sigs=C.lights.map(l=>{const s=C.segs[l.k],base=SP(l.k,l.d+2,HALF+1.2),arm=SP(l.k,l.d+2,LANE);pole(base[0],base[1],7.6,'#30363a',.16);
  const armM=new T.Mesh(new T.BoxGeometry(.18,.18,1),SM('#30363a',{metalness:.4}));const a=WV(base[0],base[1],YC+7.5),b=WV(arm[0],arm[1],YC+7.5);armM.position.copy(a).add(b).multiplyScalar(.5);armM.lookAt(b);armM.scale.z=a.distanceTo(b)+.2;g.add(armM);
  const mats={};for(const k of ['red','yellow','green'])mats[k]=new T.MeshBasicMaterial({color:'#2a2a2a',toneMapped:false});
  const heads=[];for(const [p,y] of [[arm,YC+6.1],[base,YC+3.2]]){const hg=new T.Group();hg.position.copy(WV(p[0],p[1],y));hg.rotation.y=rotOf(-s.dir[0],-s.dir[1]);g.add(hg);
   const box=new T.Mesh(new T.BoxGeometry(.95,2.55,.7),SM('#c9a227',{roughness:.55}));box.castShadow=true;hg.add(box);const plate=new T.Mesh(new T.BoxGeometry(1.25,2.85,.08),SM('#1d2124'));plate.position.z=.36;hg.add(plate);
   ['red','yellow','green'].forEach((k,i)=>{const lamp=new T.Mesh(new T.SphereGeometry(.31,14,10),mats[k]);lamp.position.set(0,.8-i*.8,-.33);lamp.scale.z=.5;hg.add(lamp);const visor=new T.Mesh(new T.CylinderGeometry(.38,.38,.42,12,1,true,0,Math.PI),SM('#1d2124',{side:T.DoubleSide}));visor.rotation.set(Math.PI/2,0,0);visor.position.set(0,.8-i*.8+.05,-.5);hg.add(visor)});heads.push(hg)}
  const glow=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:'#ff3b30',transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:.95}));glow.scale.set(1.9,1.9,1);g.add(glow);
  return {l,mats,heads,glow}});
 // 과속 단속 카메라: 기둥 위 회색 상자 + 렌즈 + 플래시
 const cams=C.cameras.map(c=>{const s=C.segs[c.k],p=SP(c.k,c.d,HALF+1.3);pole(p[0],p[1],5.6,'#5b6166',.13);const hg=new T.Group();hg.position.copy(WV(p[0],p[1],YC+6.2));hg.rotation.y=rotOf(-s.dir[0],-s.dir[1])-.25;g.add(hg);
  const body=new T.Mesh(new T.BoxGeometry(1.1,.85,1.5),SM('#d9dcdf',{roughness:.5}));body.castShadow=true;hg.add(body);const hood=new T.Mesh(new T.BoxGeometry(1.25,.12,1.8),SM('#9aa0a6'));hood.position.set(0,.5,-.12);hg.add(hood);
  const lens=new T.Mesh(new T.CylinderGeometry(.24,.24,.2,16),SM('#111',{roughness:.2,metalness:.6}));lens.rotation.x=Math.PI/2;lens.position.set(-.18,0,-.78);hg.add(lens);
  const led=new T.Mesh(new T.SphereGeometry(.09,8,6),new T.MeshBasicMaterial({color:'#ff3030'}));led.position.set(.3,-.2,-.76);hg.add(led);
  const sign=signMat('camsign',256,128,(x,w,h)=>{x.fillStyle='#1d3557';x.fillRect(0,0,w,h);x.fillStyle='#fff';x.textAlign='center';x.font=`800 34px ${FONT}`;x.fillText('SPEED',w/2,52);x.fillText('CAMERA',w/2,96)});panel(p[0],p[1],YC+4.3,1.4,.7,sign,[-s.dir[0],-s.dir[1]]);
  const flash=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:'#ffffff',transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:0}));flash.position.copy(hg.position);flash.scale.set(9,9,1);g.add(flash);
  return {c,flash,led,t:0}});

 // ── 차: 차체 · 유리 · 지붕 · 바퀴 · 앞뒤 등 · 택시 표시등 (모두 인스턴스, 한 대 = 같은 행렬)
 const MAXC=130;
 const wheelsG=mergeGeo([[-1,-1.5],[1,-1.5],[-1,1.5],[1,1.5]].map(([x,z])=>new T.CylinderGeometry(.4,.4,.3,12).rotateZ(Math.PI/2).translate(x*.96,.4,z)));
 const carParts=[
  [new T.BoxGeometry(2.1,.82,4.8).translate(0,.78,0),SM('#ffffff',{roughness:.35,metalness:.3}),'body'],
  [new T.BoxGeometry(1.86,.7,2.5).translate(0,1.5,.2),SM('#23303b',{roughness:.15,metalness:.5}),'glass'],
  [new T.BoxGeometry(1.8,.09,2.2).translate(0,1.88,.25),SM('#ffffff',{roughness:.35,metalness:.3}),'roof'],
  [wheelsG,SM('#1b1c1e',{roughness:.9}),'wheel'],
  [mergeGeo([-.68,.68].map(x=>new T.BoxGeometry(.48,.2,.06).translate(x,.92,-2.42))),new T.MeshBasicMaterial({color:'#fff6d8'}),'head'],
  [mergeGeo([-.72,.72].map(x=>new T.BoxGeometry(.42,.18,.06).translate(x,.95,2.42))),new T.MeshBasicMaterial({color:'#e3261c'}),'tail'],
  [new T.BoxGeometry(.9,.3,.38).translate(0,2.08,.2),new T.MeshStandardMaterial({color:'#fff9d6',emissive:'#ffe27a',emissiveIntensity:.5}),'taxi']];
 const carMeshes=carParts.map(([geo,mat,name])=>{const m=new T.InstancedMesh(geo,mat,MAXC);m.count=0;m.castShadow=name!=='head'&&name!=='tail';m.receiveShadow=true;m.frustumCulled=false;m.userData.name=name;g.add(m);return m});
 const CARC=['#f2c12e','#1d2023','#e9e9e6','#9aa1a8','#2b3f63','#a32b2b','#2f5446','#5b5f66'];
 const hidden=new T.Matrix4().makeScale(0,0,0);
 // 신호가 빨간불일 때 가로 길로 지나가는 차(보이기만 한다)
 const crossers=[];let crossT=0;
 function drawCars(cars,dt){let n=0;const put=(R,F,ry,col,taxi)=>{if(n>=MAXC)return;dmy.position.copy(WV(R,F,YC+.02));dmy.rotation.set(0,ry,0);dmy.scale.set(1,1,1);dmy.updateMatrix();
   for(const m of carMeshes){if(m.userData.name==='taxi'&&!taxi){m.setMatrixAt(n,hidden);continue}m.setMatrixAt(n,dmy.matrix)}
   GL.forEach((o,j)=>{v3.set(o[0],o[1],o[2]).applyMatrix4(dmy.matrix);cgPos.set([v3.x,v3.y,v3.z],(n*4+j)*3)});
   cc.set(taxi?CARC[0]:col);carMeshes[0].setColorAt(n,cc);carMeshes[2].setColorAt(n,cc);n++};
  for(const c of cars){if(c.gone)continue;const s=C.segs[c.k],p=SP(c.k,c.d,c.lane*LANE);put(p[0],p[1],rotOf(s.dir[0]*c.lane,s.dir[1]*c.lane),CARC[1+(c.c%7)],c.taxi)}
  for(const x of crossers){const s=C.segs[x.k],p=SP(x.k,x.d+x.dir*-LANE,x.p);put(p[0],p[1],rotOf(s.right[0]*x.dir,s.right[1]*x.dir),CARC[1+x.col],x.taxi)}
  for(const m of carMeshes){m.count=n;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true}cgGeo.setDrawRange(0,n*4);cgGeo.attributes.position.needsUpdate=true}
 // 맨홀 김
 const vents=[[2,30],[3,60],[6,140],[6,260],[4,40]].map(([k,d])=>SP(k,d,-1.4)),VN=16,ventPos=new Float32Array(vents.length*VN*3),ventGeo=new T.BufferGeometry();ventGeo.setAttribute('position',new T.BufferAttribute(ventPos,3));
 const steam=new T.Points(ventGeo,new T.PointsMaterial({map:glowTex,color:'#f2f2f2',size:3.2,transparent:true,opacity:.42,depthWrite:false}));steam.frustumCulled=false;g.add(steam);
 for(const v of vents){const m=new T.Mesh(new T.CylinderGeometry(.7,.7,.05,16),SM('#2e3134',{metalness:.5}));m.position.copy(WV(v[0],v[1],YC+.05));g.add(m)}
 // ── 밤 · 날씨: 가로등 불빛 번짐 · 차 전조등/후미등 번짐 · 비 오면 보행자 우산
 const lampGlow=new T.Points(new T.BufferGeometry().setFromPoints(lamps.map(l=>l.bulb)),new T.PointsMaterial({map:glowTex,color:'#ffd9a0',size:4.2,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));lampGlow.visible=false;g.add(lampGlow);
 const cgPos=new Float32Array(MAXC*4*3),cgCol=new Float32Array(MAXC*4*3);for(let i=0;i<MAXC*4;i++){cc.set(i%4<2?'#fff4d6':'#ff2a1a');cgCol.set([cc.r,cc.g,cc.b],i*3)}
 const cgGeo=new T.BufferGeometry();cgGeo.setAttribute('position',new T.BufferAttribute(cgPos,3));cgGeo.setAttribute('color',new T.BufferAttribute(cgCol,3));
 const carGlow=new T.Points(cgGeo,new T.PointsMaterial({map:glowTex,vertexColors:true,size:1.5,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));carGlow.frustumCulled=false;carGlow.visible=false;g.add(carGlow);
 const umb=new T.InstancedMesh(new T.ConeGeometry(.95,.42,10).translate(0,2.62,0),SM('#ffffff',{side:T.DoubleSide,roughness:.5}),PEDN);peds.forEach((q,i)=>umb.setColorAt(i,cc.set(SHIRT[(i*7+3)%SHIRT.length])));umb.visible=false;g.add(umb);
 const v3=new T.Vector3(),GL=[[-.68,.92,-2.5],[.68,.92,-2.5],[-.72,.95,2.5],[.72,.95,2.5]];
 const DEF=root.CITY_ENV;let env=null;
 let flashT=0;
 function weather(E,ride,bikePos){const d=E.dark,wet=E.wet,cov=E.snowCover;NIGHT.value=d;
  asMat.color.setScalar(1-.42*wet);asMat.roughness=.93-.62*wet;walkMat.roughness=.9-.5*wet;
  for(const m of [asMat,walkMat,paintMat]){m.emissive.set('#dfe6ee');m.emissiveIntensity=cov*(.62-.45*d)}
  crownMat.color.set(E.leaf);bulbMat.emissiveIntensity=.6+3.6*d;steam.material.opacity=.42+.25*cov;
  lampGlow.visible=d>.02;lampGlow.material.opacity=d*.85;carGlow.visible=d>.02||E.weather>.3;carGlow.material.opacity=Math.max(d,E.weather*.7)*.95;umb.visible=E.rain>.15}
 function update(time,dt,ride,cenv,bikePos){const st=ride.city;if(!st)return;
  env=cenv||(DEF?DEF.env(Math.max(0,Math.min(1,C.uOf(ride.pos)/C.Lc))):null);if(env)weather(env,ride,bikePos);
  sigs.forEach(sg=>{const s=st.lights[sg.l.i].state;for(const k of ['red','yellow','green'])sg.mats[k].color.set(s===k?LAMPC[k]:'#2a2a2a');
   const lamp=sg.heads[0].children[['red','yellow','green'].indexOf(s)*2+2];if(lamp){lamp.getWorldPosition(sg.glow.position);sg.glow.material.color.set(LAMPC[s]);sg.glow.material.opacity=Math.min(1,(.45+.15*Math.sin(time*6))*(1+(env?env.dark:0)*.9));sg.glow.scale.setScalar(1.9*(1+(env?env.dark:0)*.7))}});
  // 가로 길 차량: 내 신호가 빨간불인 교차로에서만
  crossT-=dt;for(const sg of sigs){const L=sg.l;if(L.cross===undefined||st.lights[L.i].state!=='red')continue;if(crossT<=0){crossT=1.5;const cs=C.crossStreets.find(c=>c.k===L.k&&c.d===L.cross),dir=crossers.length%2?1:-1;
    crossers.push({k:L.k,d:L.cross,dir,p:dir>0?cs.from:cs.to,end:dir>0?cs.to:cs.from,col:(crossers.length*3)%7,taxi:crossers.length%3===0})}}
  for(const x of crossers)x.p+=x.dir*11*dt;for(let i=crossers.length-1;i>=0;i--){const x=crossers[i];if((x.p-x.end)*x.dir>0)crossers.splice(i,1)}
  drawCars(st.cars,dt);
  peds.forEach((q,i)=>{q.t+=q.v*dt;if(q.t<q.p.a||q.t>q.p.b){q.v=-q.v;q.t=Math.max(q.p.a,Math.min(q.p.b,q.t))}const p=P(q.p.s,q.t,q.lat),bob=Math.abs(Math.sin(time*7+q.ph))*.08;
   dmy.position.copy(WV(p[0],p[1],YC+.24+bob));dmy.rotation.set(0,0,0);dmy.scale.set(1,1,1);dmy.updateMatrix();pedBody.setMatrixAt(i,dmy.matrix);pedHead.setMatrixAt(i,dmy.matrix);pedLegs.setMatrixAt(i,dmy.matrix);umb.setMatrixAt(i,dmy.matrix)});pedBody.instanceMatrix.needsUpdate=pedHead.instanceMatrix.needsUpdate=pedLegs.instanceMatrix.needsUpdate=umb.instanceMatrix.needsUpdate=true;
  vents.forEach((v,j)=>{const w=C.world(v[0],v[1]);for(let i=0;i<VN;i++){const f=((time*.35+i/VN)%1),k=(j*VN+i)*3;ventPos[k]=w.x+Math.sin(i*2.3+time)*f*1.6;ventPos[k+1]=YC+.2+f*7;ventPos[k+2]=w.z+Math.cos(i*1.7+time*.8)*f*1.6}});ventGeo.attributes.position.needsUpdate=true;
  cams.forEach(cm=>{cm.t=Math.max(0,cm.t-dt);cm.flash.material.opacity=cm.t>0?Math.min(1,cm.t*3):0;cm.led.material.color.set(Math.sin(time*5)>0?'#ff3030':'#551010')});
 }
 function flash(i){if(cams[i])cams[i].t=.45}
 return {group:g,update,flash,buildings:blds.length,lampPos:lamps.map(l=>l.bulb)}}
root.CITY_SCENE={build};
})(typeof window!=='undefined'?window:globalThis);
