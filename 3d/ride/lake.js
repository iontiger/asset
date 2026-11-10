'use strict';
// ── 얼음 호수 (폭설 평원 바로 뒤 · ADVENTURE.lake) — 그리기만 한다. 주행 물리는 game-core.js (길이 호수 바닥으로 내려갔다 올라옴 · 물 저항).
//  빙판(ice→start): 눈이 걷히고 매끈한 얼음길. 달릴수록 바이크 둘레에 금이 쩍쩍 늘어난다.
//  깨짐(start 앞뒤): 길 위 얼음 조각들이 바이크 앞에서 갈라져 기울고 가라앉으며, 그 틈으로 바이크가 물속으로 내려간다.
//  물속(start→end): 얼음 천장 · 일렁이는 물빛 무늬 · 빛줄기 · 물풀 · 산호 · 물고기 떼 · 해파리 · 고래 · 거품 · 떠다니는 알갱이.
//  물 밖(end): 물보라와 함께 솟아오른다(마지막 점프 언덕).
//  라이더: 빙판에 들어서면 구명조끼 · 물안경 · 스노클.
(function(root){
function build(c){
const {T,scene,camera,ride,point,groundAt,heading,riderRig,headG,lean,hemi,sun,headlight,hide=[],sound,notify}=c;
const A=ADVENTURE,L=A.lake,SURF=L.surface;
let seed=977;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const G=new T.Group();scene.add(G);
const U={uTime:{value:0},uFogC:{value:new T.Color()},uFogN:{value:5},uFogF:{value:60},uAmb:{value:1},uSub:{value:0}};
const FOG_V='varying float vFogD;',FOG_F='uniform vec3 uFogC;uniform float uFogN,uFogF;varying float vFogD;float fogK(){return smoothstep(uFogN,uFogF,vFogD);}';
const CAUST=`float caust(vec2 uv,float t){vec2 p=mod(uv*6.28318,6.28318)-250.;vec2 i=p;float cc=1.;for(int n=0;n<4;n++){float tt=t*(1.-3.5/float(n+1));i=p+vec2(cos(tt-i.x)+sin(tt+i.y),sin(tt-i.y)+cos(tt+i.x));cc+=1./length(vec2(p.x/(sin(i.x+tt)/.005),p.y/(cos(i.y+tt)/.005)));}cc/=4.;cc=1.17-pow(cc,1.4);return pow(abs(cc),8.);}`;
const NOISE=`float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}float fbm(vec2 p){return vn(p)*.55+vn(p*2.3)*.3+vn(p*5.1)*.15;}`;
function stripGeo(s0,s1,step,offs,yFn){const v=[],a=[],idx=[],n=Math.ceil((s1-s0)/step),m=offs.length;
 for(let i=0;i<=n;i++){const s=Math.min(s1,s0+i*step);offs.forEach((o,j)=>{const p=yFn(s,o);v.push(p.x,p.y,p.z);a.push(s,o);if(i<n&&j<m-1){const k=i*m+j;idx.push(k,k+m,k+1,k+1,k+m,k+m+1)}})}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('aSO',new T.Float32BufferAttribute(a,2));g.setIndex(idx);g.computeVertexNormals();return g}

// ── 빙판 길 ──────────────────────────────────────────────────────────────
const iceTex=(()=>{const cv=document.createElement('canvas');cv.width=cv.height=256;const x=cv.getContext('2d');x.fillStyle='#bfe2f1';x.fillRect(0,0,256,256);
 for(let i=0;i<26;i++){const g=x.createRadialGradient(rnd()*256,rnd()*256,0,rnd()*256,rnd()*256,40+rnd()*60);g.addColorStop(0,'rgba(255,255,255,.28)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,256,256)}
 x.strokeStyle='rgba(255,255,255,.5)';x.lineWidth=1;for(let i=0;i<70;i++){const a=rnd()*256,b=rnd()*256,l=8+rnd()*40,an=rnd()*6.28;x.beginPath();x.moveTo(a,b);x.lineTo(a+Math.cos(an)*l,b+Math.sin(an)*l);x.stroke()}
 x.strokeStyle='rgba(70,130,165,.35)';for(let i=0;i<14;i++){let a=rnd()*256,b=rnd()*256;x.beginPath();x.moveTo(a,b);for(let k=0;k<6;k++){a+=(rnd()-.5)*50;b+=(rnd()-.5)*50;x.lineTo(a,b)}x.stroke()}
 const t=new T.CanvasTexture(cv);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t})();
{const g=stripGeo(L.ice,L.start-58,20,[-9.7,-5,0,5,9.7],(s,o)=>{const p=point(s,o);p.y+=.035;return p});
 const so=g.attributes.aSO,uv=[];for(let i=0;i<so.count;i++)uv.push(so.getY(i)/9.7*.9,so.getX(i)/360);g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 const m=new T.Mesh(g,new T.MeshStandardMaterial({map:iceTex,color:'#e9f6fc',roughness:.14,metalness:.08,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));m.receiveShadow=true;G.add(m)}
// 금: 미리 만들어 둔 번개 모양 선들을, 바이크가 다가오면 바이크 둘레에 놓고 순식간에 뻗게 한다
const crackMat=new T.MeshBasicMaterial({color:'#f6fcff',transparent:true,opacity:.95,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4,side:T.DoubleSide});
const crackDark=new T.MeshBasicMaterial({color:'#5f9db8',transparent:true,opacity:.4,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3,side:T.DoubleSide});
function crackGeo(len,w){const v=[];const seg=(x0,z0,x1,z1,ww)=>{const dx=x1-x0,dz=z1-z0,l=Math.hypot(dx,dz)||1,nx=-dz/l*ww,nz=dx/l*ww;v.push(x0-nx,0,z0-nz,x0+nx,0,z0+nz,x1+nx,0,z1+nz,x0-nx,0,z0-nz,x1+nx,0,z1+nz,x1-nx,0,z1-nz)};
 const arm=(x,z,an,l,ww,depth)=>{const n=3+Math.floor(rnd()*3);for(let k=0;k<n;k++){an+=(rnd()-.5)*1.1;const sl=l/n*(.7+rnd()*.6),x1=x+Math.cos(an)*sl,z1=z+Math.sin(an)*sl;seg(x,z,x1,z1,ww*(1-k/n*.6));x=x1;z=z1;if(depth>0&&rnd()<.55)arm(x,z,an+(rnd()<.5?1:-1)*(.6+rnd()*.7),l*.5,ww*.7,depth-1)}};
 const arms=2+Math.floor(rnd()*3),a0=rnd()*6.28;for(let i=0;i<arms;i++)arm(0,0,a0+i/arms*6.28+(rnd()-.5)*.8,len*(.6+rnd()*.6),w,2);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));return g}
const cracks=[];{const N=46;for(let i=0;i<N;i++){const f=(i+rnd()*.8)/N,s=L.ice+260+(L.start-70-L.ice-260)*Math.pow(f,.62),big=f>.7;
  const g=crackGeo(big?2.2+rnd()*1.8:1.1+rnd()*1.4,big?.04:.026),m=new T.Mesh(g,crackMat),d=new T.Mesh(g,crackDark);d.scale.set(1.06,1,1.06);const grp=new T.Group();grp.add(d,m);grp.visible=false;G.add(grp);
  cracks.push({s,lat:(rnd()-.5)*(big?9:6),grp,age:-1,big})}}
// 깨지는 얼음 조각: 구멍(길 폭) 위를 덮고 있다가 바이크 바로 앞에서부터 갈라진다
const TS0=L.start-58,TS1=L.start+300,ROW=24,COLS=6,tiles=[];
for(let s=TS0,r=0;s<TS1;s+=ROW,r++){const edges=[-9.7];for(let k=1;k<COLS;k++)edges.push(-9.7+19.4*k/COLS+(rnd()-.5)*1.3);edges.push(9.7);
 for(let k=0;k<COLS;k++){const w=edges[k+1]-edges[k],lat=(edges[k]+edges[k+1])/2,p=point(s+ROW/2,lat);p.y=Math.max(SURF+.1,point(s+ROW/2,0).y+.06);
  tiles.push({s:s+ROW/2,lat,w,p,yaw:heading(s),age:-1,rx:(rnd()-.5)*2.4,rz:(rnd()-.5)*2.4,push:(rnd()*.8+.5),sink:.5+rnd()*.7,ph:rnd()*6})}}
const tileMesh=new T.InstancedMesh(new T.BoxGeometry(1,.2,1),new T.MeshStandardMaterial({color:'#e3f3fb',roughness:.2,metalness:.05,flatShading:true}),tiles.length);tileMesh.frustumCulled=false;tileMesh.receiveShadow=true;G.add(tileMesh);
const dm=new T.Object3D();
function drawTiles(bikeLat){tiles.forEach((t,i)=>{dm.position.copy(t.p);dm.rotation.set(0,t.yaw,0);dm.scale.set(t.w-.05,1,ROW/20-.04);
  if(t.age>=0){const a=t.age,k=Math.min(1,a/.5),side=Math.sign(t.lat-bikeLat)||1;
   dm.position.y+=Math.sin(Math.min(a,1.2)*2.6)*.18-Math.max(0,a-.35)*t.sink*1.1;dm.rotation.x=t.rx*k*.55+Math.sin(a*2+t.ph)*.08;dm.rotation.z=t.rz*k*.55-side*k*.35;
   const rr=new T.Vector3(Math.cos(t.yaw),0,-Math.sin(t.yaw));dm.position.addScaledVector(rr,side*t.push*(1-Math.exp(-a*2.2))*1.3);
   const sc=a>3?Math.max(0,1-(a-3)):1;dm.scale.multiplyScalar(sc)}
  dm.updateMatrix();tileMesh.setMatrixAt(i,dm.matrix)});tileMesh.instanceMatrix.needsUpdate=true}

// ── 물 표면(위에서는 얼어붙은 호수 · 아래에서는 일렁이는 얼음 천장) ────────────
const sheetOffs=[-90,-60,-40,-26,-16,-10.2,-5,0,5,10.2,16,26,40,60,90];
const sheet=new T.Mesh(stripGeo(L.start-58,L.end+40,30,sheetOffs,(s,o)=>{const p=point(s,o);p.y=SURF;return p}),new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,
 uniforms:{...U,uHole:{value:new T.Vector2(TS0,TS1)},uOpen:{value:new T.Vector2(L.rise-700,L.rise+150)}},
 vertexShader:`attribute vec2 aSO;varying vec2 vSO;varying vec3 vW;${FOG_V}void main(){vSO=aSO;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vFogD=distance(w.xyz,cameraPosition);gl_Position=projectionMatrix*viewMatrix*w;}`,
 fragmentShader:`uniform float uTime,uAmb;uniform vec2 uHole,uOpen;varying vec2 vSO;varying vec3 vW;${FOG_F}${NOISE}${CAUST}
 void main(){bool above=cameraPosition.y>vW.y;float hole=step(abs(vSO.y),9.75)*step(uHole.x,vSO.x)*step(vSO.x,uHole.y);
  float open=max(hole,smoothstep(uOpen.x,uOpen.y,vSO.x+fbm(vW.xz*.12)*260.));
  float n=fbm(vW.xz*.22),cr=smoothstep(.022,.0,abs(fbm(vW.xz*.55+7.)-.5))+smoothstep(.012,.0,abs(vn(vW.xz*1.7)-.5))*.6;
  vec3 col;float al;
  if(above){vec3 ice=mix(vec3(.80,.89,.95),vec3(.95,.98,1.),n)-cr*.16;float gl=pow(vn(vW.xz*1.6+vec2(uTime*.5,uTime*.3)),7.);
   vec3 wat=vec3(.03,.12,.19)+vec3(.55,.75,.9)*gl*.7;col=mix(ice,wat,open)*uAmb;al=mix(.985,.84,open);col=mix(col,uFogC,fogK()*.9);}
  else{float sh=caust(vW.xz*.045,uTime*.55);vec3 wat=mix(vec3(.05,.45,.6),vec3(.72,.98,1.),clamp(sh*1.6+vn(vW.xz*.4+uTime*.2)*.35,0.,1.));
   vec3 ice=mix(vec3(.30,.66,.76),vec3(.82,.97,1.),n*.8+sh*.5)-cr*.3;col=mix(ice,wat,open);
   float d=length(vW.xz-cameraPosition.xz);col+=vec3(.35,.5,.5)*exp(-d*d*.004);al=.96;col=mix(col,uFogC,fogK()*.82);}
  gl_FragColor=vec4(col,al);
  #include <colorspace_fragment>
 }`}));sheet.frustumCulled=false;sheet.renderOrder=3;G.add(sheet);
// 호수 바닥 물빛 무늬(코스틱)
const bedOffs=[];for(let o=-30;o<=30;o+=5)bedOffs.push(o);
const bed=new T.Mesh(stripGeo(L.start+60,L.end-90,24,bedOffs,(s,o)=>{const p=groundAt(s,o);p.y+=.09+(Math.abs(o)<9.7?.03:-.1);return p}),new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,
 uniforms:U,vertexShader:`varying vec3 vW;${FOG_V}void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vFogD=distance(w.xyz,cameraPosition);gl_Position=projectionMatrix*viewMatrix*w;}`,
 fragmentShader:`uniform float uTime,uSub;varying vec3 vW;${FOG_F}${CAUST}void main(){float k=caust(vW.xz*.07,uTime*.6)+caust(vW.xz*.045+3.1,uTime*.4)*.6;float dep=smoothstep(${(SURF-.4).toFixed(2)},${(SURF-3).toFixed(2)},vW.y);
  gl_FragColor=vec4(vec3(.62,.96,1.)*k*.5*dep*(1.-fogK())*(.25+.75*uSub),1.);
  #include <colorspace_fragment>
 }`}));bed.frustumCulled=false;bed.renderOrder=2;G.add(bed);

// ── 물속 풍경 ────────────────────────────────────────────────────────────
const W0=L.bottom+40,W1=L.end-230;
const bedY=(s,lat)=>groundAt(s,lat);
// 물풀: 흔들리는 잎(인스턴스 · 셰이더에서 살랑)
{const geo=new T.PlaneGeometry(.55,1,1,7);geo.translate(0,.5,0);const N=420,m=new T.InstancedMesh(geo,new T.ShaderMaterial({side:T.DoubleSide,uniforms:U,
  vertexShader:`uniform float uTime;varying float vH;varying float vT;${FOG_V}void main(){vec4 o=instanceMatrix*vec4(0.,0.,0.,1.);float ph=o.x*.71+o.z*.93;float h=uv.y;vec3 p=position;p.x*=1.-h*.72;
   p.x+=sin(uTime*1.25+ph+h*3.2)*.42*h*h+sin(uTime*.5+ph*.3)*.25*h;p.z+=cos(uTime*1.05+ph*1.3+h*2.)*.3*h*h;vec4 w=modelMatrix*instanceMatrix*vec4(p,1.);vH=h;vT=fract(ph*.37);vFogD=distance(w.xyz,cameraPosition);gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`varying float vH;varying float vT;${FOG_F}void main(){vec3 a=mix(vec3(.03,.22,.14),vec3(.10,.30,.10),vT),b=mix(vec3(.35,.78,.32),vec3(.75,.80,.25),vT);vec3 col=mix(a,b,vH*vH+.1);col=mix(col,uFogC,fogK());gl_FragColor=vec4(col,1.);
  #include <colorspace_fragment>
  }`}),N);
 for(let i=0;i<N;i++){const s=W0+rnd()*(W1-W0),near=rnd()<.3,lat=(rnd()<.5?-1:1)*(near?10.2+rnd()*2.5:12.5+rnd()*17),p=bedY(s,lat),h=near?1.4+rnd()*2:2.5+rnd()*5;dm.position.copy(p);dm.rotation.set(0,rnd()*6.28,0);dm.scale.set(.8+rnd()*.9,h,1);dm.updateMatrix();m.setMatrixAt(i,dm.matrix)}
 m.frustumCulled=false;G.add(m)}
// 바위 · 산호 · 조개
{const put=(n,geo,mat,f)=>{const m=new T.InstancedMesh(geo,mat,n),col=new T.Color();for(let i=0;i<n;i++){const cc=f(i);dm.updateMatrix();m.setMatrixAt(i,dm.matrix);if(cc)m.setColorAt(i,col.set(cc))}m.frustumCulled=false;G.add(m);return m};
 const side=()=>(rnd()<.5?-1:1);
 put(110,new T.IcosahedronGeometry(1,0),new T.MeshStandardMaterial({color:'#6f8791',roughness:.95,flatShading:true}),()=>{const s=W0-60+rnd()*(W1-W0+120),lat=side()*(10.5+rnd()*19),p=bedY(s,lat),k=.5+rnd()*1.7;dm.position.copy(p);dm.position.y+=k*.25;dm.scale.set(k*(1+rnd()*.6),k*(.5+rnd()*.5),k);dm.rotation.set(rnd(),rnd()*6,rnd())});
 const coralC=['#ff7f8f','#ff9f5a','#c98bff','#ffd166','#ff6fa8','#6fe0d0'];
 // 가지 산호(뿔 묶음) · 둥근 뇌산호 · 부채
 put(170,new T.ConeGeometry(.16,1.3,5),new T.MeshStandardMaterial({roughness:.7,flatShading:true,emissive:'#331418',emissiveIntensity:.5}),i=>{if(i%5===0){put.s=W0+rnd()*(W1-W0);put.lat=side()*(10.3+rnd()*15);put.c=coralC[Math.floor(rnd()*coralC.length)];put.k=.7+rnd()*1.1}
  const p=bedY(put.s,put.lat);dm.position.copy(p);dm.position.x+=(rnd()-.5)*.5;dm.position.z+=(rnd()-.5)*.5;dm.position.y+=.55*put.k;dm.scale.setScalar(put.k*(.7+rnd()*.6));dm.rotation.set((rnd()-.5)*.9,rnd()*6,(rnd()-.5)*.9);return put.c});
 put(46,new T.SphereGeometry(.7,10,7),new T.MeshStandardMaterial({roughness:.8,flatShading:true,emissive:'#221122',emissiveIntensity:.4}),()=>{const s=W0+rnd()*(W1-W0),lat=side()*(10.4+rnd()*14),p=bedY(s,lat),k=.5+rnd()*.9;dm.position.copy(p);dm.position.y+=k*.2;dm.scale.set(k*1.2,k*.75,k*1.2);dm.rotation.set(0,rnd()*6,0);return coralC[Math.floor(rnd()*coralC.length)]});
 put(40,new T.CircleGeometry(.9,9,0,Math.PI),new T.MeshStandardMaterial({roughness:.8,side:T.DoubleSide,emissive:'#2a1020',emissiveIntensity:.5}),()=>{const s=W0+rnd()*(W1-W0),lat=side()*(10.6+rnd()*12),p=bedY(s,lat),k=.7+rnd()*1.1;dm.position.copy(p);dm.scale.set(k,k*1.2,k);dm.rotation.set(0,rnd()*6,0);return coralC[Math.floor(rnd()*coralC.length)]});
 // 길가 불가사리
 put(26,new T.CylinderGeometry(.34,.34,.07,5),new T.MeshStandardMaterial({roughness:.8}),()=>{const s=W0+rnd()*(W1-W0),lat=side()*(6+rnd()*5),p=point(s,lat);dm.position.copy(p);dm.position.y+=.06;dm.scale.setScalar(.7+rnd()*.6);dm.rotation.set(0,rnd()*6,0);return ['#ff8a5c','#ffd166','#ff6fa8'][Math.floor(rnd()*3)]})}
// 물고기 떼
function mergeGeo(list){const pos=[],nor=[];for(const g of list){const n=g.index?g.toNonIndexed():g;n.computeVertexNormals();pos.push(...n.attributes.position.array);nor.push(...n.attributes.normal.array)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));return g}
const fishGeo=(()=>{const b=new T.SphereGeometry(.5,8,6);b.scale(.3,.55,1);const t=new T.ConeGeometry(.34,.5,4);t.rotateX(-Math.PI/2);t.scale(.18,1,1);t.translate(0,0,-.68);const f=new T.ConeGeometry(.16,.3,3);f.translate(0,.36,0);f.scale(.25,1,1);return mergeGeo([b,t,f])})();
const SCHOOLS=[],FPS=18;{const cols=['#ffa23c','#ffe066','#cfe8ff','#ff8fb1','#7fe9ff','#ffb347','#e8f4ff','#ffd166','#ff7f6e','#9fd8ff'];
 for(let k=0;k<10;k++){const s=W0+200+(W1-W0-500)*(k+rnd()*.6)/10,over=k%3===0,lat=over?(rnd()-.5)*8:(rnd()<.5?-1:1)*(8+rnd()*9),y=over?4.4+rnd()*1.6:1.4+rnd()*3.2;
  SCHOOLS.push({s,lat,y,a:4+rnd()*5,b:2.2+rnd()*3,w:(.35+rnd()*.3)*(rnd()<.5?-1:1),col:cols[k],size:.34+rnd()*.3,c:groundAt(s,lat),yaw:heading(s)})}}
const fish=new T.InstancedMesh(fishGeo,new T.MeshStandardMaterial({roughness:.45,metalness:.2,emissive:'#223344',emissiveIntensity:.35}),SCHOOLS.length*FPS);fish.frustumCulled=false;G.add(fish);
{const col=new T.Color();SCHOOLS.forEach((S,k)=>{for(let i=0;i<FPS;i++)fish.setColorAt(k*FPS+i,col.set(S.col).multiplyScalar(.85+((i*37)%10)/40))})}
function updateFish(t){SCHOOLS.forEach((S,k)=>{const cy=Math.cos(S.yaw),sy=Math.sin(S.yaw);for(let i=0;i<FPS;i++){const ph=i/FPS*6.283+((i*53)%7)*.13,th=t*S.w+ph,r=1+((i*29)%9)/22;
   const lx=Math.sin(th)*S.b*r,lz=Math.cos(th)*S.a*r,vx=Math.cos(th)*S.b*S.w,vz=-Math.sin(th)*S.a*S.w;
   // 길 좌표(앞 = -z, 오른쪽 = +x)를 세계 좌표로
   dm.position.set(S.c.x+lx*cy+lz*sy,S.c.y+S.y+Math.sin(t*1.7+i*1.3)*.25+((i*17)%5)*.18,S.c.z-lx*sy+lz*cy);
   const dx=vx*cy+vz*sy,dz=-vx*sy+vz*cy;dm.rotation.set(0,Math.atan2(dx,dz)+Math.sin(t*9+i)*.18,0);dm.scale.setScalar(S.size*(.8+((i*13)%6)/15));dm.updateMatrix();fish.setMatrixAt(k*FPS+i,dm.matrix)}});fish.instanceMatrix.needsUpdate=true}
// 해파리: 은은히 빛나며 둥실둥실
const glowTex=(()=>{const cv=document.createElement('canvas');cv.width=cv.height=64;const x=cv.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,255,255,.45)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new T.CanvasTexture(cv)})();
const jellies=[];{const dome=new T.SphereGeometry(.6,14,8,0,Math.PI*2,0,Math.PI/2),tv=[];for(let k=0;k<7;k++){const a=k/7*6.283,r=.38;for(let j=0;j<5;j++){tv.push(Math.cos(a)*r*(1-j*.1),-j*.42,Math.sin(a)*r*(1-j*.1),Math.cos(a+.3)*r*(1-(j+1)*.1),-(j+1)*.42,Math.sin(a+.3)*r*(1-(j+1)*.1))}}
 const tg=new T.BufferGeometry();tg.setAttribute('position',new T.Float32BufferAttribute(tv,3));
 for(let i=0;i<14;i++){const col=['#ff9fd6','#9ff3ff','#c9a6ff','#ffe9a6'][i%4],s=W0+150+(W1-W0-450)*(i+rnd()*.7)/14,over=i%4===1,lat=over?(rnd()-.5)*10:(rnd()<.5?-1:1)*(7+rnd()*10),p=groundAt(s,lat),g=new T.Group();
  g.add(new T.Mesh(dome,new T.MeshBasicMaterial({color:col,transparent:true,opacity:.62,side:T.DoubleSide,depthWrite:false})));g.add(new T.LineSegments(tg,new T.LineBasicMaterial({color:col,transparent:true,opacity:.7})));
  const sp=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:col,transparent:true,opacity:.55,depthWrite:false,blending:T.AdditiveBlending}));sp.scale.setScalar(3.4);g.add(sp);
  const k=.7+rnd()*.8;g.scale.setScalar(k);g.position.copy(p);const y0=over?4.8+rnd()*1.5:2+rnd()*3.5;G.add(g);jellies.push({g,y0:p.y+y0,ph:rnd()*6,k,x0:p.x,z0:p.z})}}
// 고래: 호수 한가운데서 머리 위로 천천히 지나간다
const whale=new T.Group();{const body=new T.MeshStandardMaterial({color:'#2c4a66',roughness:.6}),belly=new T.MeshStandardMaterial({color:'#b9d3e0',roughness:.7});
 const B=(geo,mat,x,y,z,sx,sy,sz,par=whale)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);par.add(m);return m},sph=new T.SphereGeometry(1,18,12);
 B(sph,body,0,0,0,1.5,1.25,4.6);B(sph,belly,0,-.38,.5,1.32,.98,3.9);B(sph,body,0,.15,-3.6,.75,.6,2.2);
 const tail=new T.Group();tail.position.set(0,.15,-5.4);whale.add(tail);B(sph,body,-1.05,0,-.5,1.15,.14,.62,tail).rotation.y=.5;B(sph,body,1.05,0,-.5,1.15,.14,.62,tail).rotation.y=-.5;whale.userData.tail=tail;
 for(const sx of [-1,1]){const f=B(sph,body,sx*1.6,-.6,1.6,1.25,.12,.5);f.rotation.set(0,sx*-.5,sx*-.45);whale.userData['fin'+sx]=f}
 for(const sx of [-1,1])B(sph,new T.MeshBasicMaterial({color:'#0c1116'}),sx*1.28,.1,3.1,.09,.09,.09);
 for(let i=0;i<5;i++)B(sph,belly,0,-1.0+i*.02,1.6+i*.5,1.0-i*.08,.05,.07);
 whale.scale.setScalar(1);whale.visible=false;G.add(whale)}
let whaleTold=false;
// 빛줄기: 얼음 사이로 비쳐 드는 빛
const shaftTex=(()=>{const cv=document.createElement('canvas');cv.width=64;cv.height=256;const x=cv.getContext('2d'),g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(.55,'rgba(255,255,255,.3)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,256);
 const h=x.createLinearGradient(0,0,64,0);h.addColorStop(0,'rgba(0,0,0,1)');h.addColorStop(.5,'rgba(0,0,0,0)');h.addColorStop(1,'rgba(0,0,0,1)');x.globalCompositeOperation='destination-out';x.fillStyle=h;x.fillRect(0,0,64,256);return new T.CanvasTexture(cv)})();
const shafts=[];{const geo=new T.PlaneGeometry(1,1);geo.translate(0,-.5,0);for(let i=0;i<26;i++){const s=L.start+120+(W1-L.start-200)*(i+rnd()*.8)/26,lat=(rnd()-.5)*30,p=point(s,lat),m=new T.Mesh(geo,new T.MeshBasicMaterial({map:shaftTex,color:i%3?'#bff4ff':'#eaffff',transparent:true,opacity:.12,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,fog:false}));
  m.position.set(p.x,SURF,p.z);const w=1.6+rnd()*3.2;m.scale.set(w,7.5+rnd()*2.5,1);m.rotation.z=(rnd()-.5)*.35;m.renderOrder=4;G.add(m);shafts.push({m,ph:rnd()*6,tilt:(rnd()-.5)*.35,o:.07+rnd()*.09})}
 // 깨진 얼음 구멍으로 쏟아지는 굵은 빛
 const p=point(L.start+140,0),m=new T.Mesh(geo,new T.MeshBasicMaterial({map:shaftTex,color:'#f2ffff',transparent:true,opacity:.22,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,fog:false}));m.position.set(p.x,SURF,p.z);m.scale.set(11,9.5,1);m.renderOrder=4;G.add(m);shafts.push({m,ph:1,tilt:0,o:.22})}
// 거품 · 물방울 · 떠다니는 알갱이
const bubTex=(()=>{const cv=document.createElement('canvas');cv.width=cv.height=64;const x=cv.getContext('2d');x.strokeStyle='rgba(255,255,255,.95)';x.lineWidth=5;x.beginPath();x.arc(32,32,25,0,6.283);x.stroke();const g=x.createRadialGradient(32,32,0,32,32,26);g.addColorStop(0,'rgba(255,255,255,.05)');g.addColorStop(1,'rgba(255,255,255,.3)');x.fillStyle=g;x.beginPath();x.arc(32,32,25,0,6.283);x.fill();x.fillStyle='rgba(255,255,255,.95)';x.beginPath();x.arc(23,22,5,0,6.283);x.fill();return new T.CanvasTexture(cv)})();
function pool(n,mat){const pos=new Float32Array(n*3).fill(-9999),vel=new Float32Array(n*3),life=new Float32Array(n),g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));const pts=new T.Points(g,mat);pts.frustumCulled=false;pts.renderOrder=5;G.add(pts);return {n,pos,vel,life,g,pts,cur:0}}
const bubbles=pool(320,new T.PointsMaterial({map:bubTex,size:.2,transparent:true,opacity:.85,depthWrite:false,fog:false,color:'#eaffff'}));
const drops=pool(220,new T.PointsMaterial({map:glowTex,size:.2,transparent:true,opacity:.9,depthWrite:false,color:'#f4fdff'}));
function emit(P,x,y,z,vx,vy,vz,life){const i=P.cur++%P.n;P.pos[i*3]=x;P.pos[i*3+1]=y;P.pos[i*3+2]=z;P.vel[i*3]=vx;P.vel[i*3+1]=vy;P.vel[i*3+2]=vz;P.life[i]=life}
function stepPool(P,dt,grav,ceil){for(let i=0;i<P.n;i++){if(P.life[i]<=0)continue;P.life[i]-=dt;const k=i*3;P.vel[k+1]+=grav*dt;P.pos[k]+=P.vel[k]*dt+(ceil?Math.sin(time*5+i)*dt*.4:0);P.pos[k+1]+=P.vel[k+1]*dt;P.pos[k+2]+=P.vel[k+2]*dt;
  if(P.life[i]<=0||(ceil&&P.pos[k+1]>SURF-.05)||(!ceil&&P.vel[k+1]<0&&P.pos[k+1]<SURF-.3)){P.life[i]=0;P.pos[k+1]=-9999}}P.g.attributes.position.needsUpdate=true}
function splash(p,n,force){for(let i=0;i<n;i++){const a=rnd()*6.283,r=rnd()*force;emit(drops,p.x+(rnd()-.5)*1.5,SURF+.1,p.z+(rnd()-.5)*1.5,Math.cos(a)*r*.6,2.5+rnd()*force*1.3,Math.sin(a)*r*.6,1.6)}}
const MOTES=380,motePos=new Float32Array(MOTES*3),moteGeo=new T.BufferGeometry();moteGeo.setAttribute('position',new T.BufferAttribute(motePos,3));
const motes=new T.Points(moteGeo,new T.PointsMaterial({map:glowTex,size:.11,transparent:true,opacity:.55,depthWrite:false,color:'#d6fbff',fog:false}));motes.frustumCulled=false;motes.renderOrder=5;G.add(motes);

// ── 구명조끼 · 물안경 · 스노클 ────────────────────────────────────────────
const vest=new T.Group(),gear=new T.Group();riderRig.add(vest);headG.add(gear);vest.visible=gear.visible=false;
{const M=(geo,col,par,x,y,z,sx=1,sy=1,sz=1,opt)=>{const m=new T.Mesh(geo,new T.MeshStandardMaterial({color:col,roughness:.75,...opt}));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;par.add(m);return m};
 const sph=new T.SphereGeometry(1,18,14),org='#ff6a1f',yel='#ffe14a';
 // 몸통을 감싸는 주황 조끼 (앞 · 뒤가 도톰한 판) + 반사 띠 + 깃 + 버클
 M(sph,org,vest,0,1.93,.06,.555,.66,.47);
 M(new T.BoxGeometry(.62,.78,.2),org,vest,0,1.95,-.3,1,1,1).rotation.x=-.08;M(new T.BoxGeometry(.6,.7,.16),org,vest,0,1.98,.38,1,1,1);
 for(const y of [1.72,2.06]){const b=M(new T.TorusGeometry(.5,.045,8,28),yel,vest,0,y,.05,1.08,.96,1,{emissive:'#6a5a00',emissiveIntensity:.5});b.rotation.x=Math.PI/2}
 const collar=M(new T.TorusGeometry(.34,.14,10,22,Math.PI*1.5),org,vest,0,2.27,.02,1,1,.9);collar.rotation.set(Math.PI/2,0,Math.PI*.75+Math.PI/2);
 for(const y of [1.8,2.02])M(new T.BoxGeometry(.5,.07,.05),'#20262b',vest,0,y,-.41);M(new T.BoxGeometry(.1,.1,.07),'#d7dde0',vest,0,1.8,-.44);M(new T.BoxGeometry(.1,.1,.07),'#d7dde0',vest,0,2.02,-.44);
 M(new T.CylinderGeometry(.03,.03,.14,8),'#ff3b30',vest,.2,2.16,-.38);   // 호루라기
 // 머리: 물안경 끈 · 렌즈 · 스노클
 const strap=M(new T.TorusGeometry(.475,.035,6,26),'#1f2a33',gear,0,.4,-.03);strap.rotation.x=Math.PI/2;
 M(new T.BoxGeometry(.56,.2,.12),'#1f2a33',gear,0,.4,-.44);for(const x of [-.14,.14])M(sph,'#8fe9ff',gear,x,.4,-.49,.115,.085,.05,{roughness:.1,metalness:.3,emissive:'#2aa6c8',emissiveIntensity:.6});
 M(new T.CylinderGeometry(.045,.045,.95,8),'#f4f7f8',gear,-.52,.72,-.05);M(new T.CylinderGeometry(.06,.06,.16,8),org,gear,-.52,1.24,-.05);
 const bend=M(new T.TorusGeometry(.13,.045,8,12,Math.PI),'#f4f7f8',gear,-.42,.25,-.2);bend.rotation.set(0,1.0,Math.PI)}

// 화면 덧씌움: 물속 가장자리 푸른 어둠 + 수면을 지날 때 번쩍
const veil=document.createElement('div');veil.id='underwater';veil.setAttribute('aria-hidden','true');document.body.appendChild(veil);

// ── 매 프레임 ────────────────────────────────────────────────────────────
let time=0,sub=false,subK=0,lastCrackSnd=0,bubT=0,wasWater=false;
const tmp=new T.Vector3(),fwd=new T.Vector3(),subHemi=new T.Color('#9be6ff'),subGround=new T.Color('#0c3d4c'),subSun=new T.Color('#c9f4ff');
function reset(){for(const k of cracks){k.age=-1;k.grp.visible=false}for(const t of tiles)t.age=-1;drawTiles(0);whaleTold=false;for(const P of [bubbles,drops]){P.life.fill(0);P.pos.fill(-9999);P.g.attributes.position.needsUpdate=true}}
function update(dt,t,events){time=t;const pos=ride.pos,near=pos>L.ice-4500&&pos<L.end+3000;G.visible=near;
 const vestOn=ride.mode!=='ready'&&pos>L.ice+90;vest.visible=gear.visible=vestOn;
 const inRange=pos>L.start-400&&pos<L.end+600;sub=inRange&&camera.position.y<SURF-.05;api.sub=sub;ride.submerged=sub;
 subK+=((sub?1:0)-subK)*(1-Math.exp(-dt*5));veil.classList.toggle('on',sub);
 if(!near){sound.water&&sound.water(0);return}
 U.uTime.value=t;U.uFogC.value.copy(scene.fog.color);U.uFogN.value=scene.fog.near;U.uFogF.value=scene.fog.far;U.uAmb.value=1-.62*A.nightAmt(pos);U.uSub.value=subK;
 const playing=ride.mode==='playing',bikeLat=ride.player*9,bp=point(pos,bikeLat);
 // 금: 바이크 조금 앞 · 옆에서 뻗어 나온다
 for(const k of cracks){if(k.age<0){if(playing&&pos>k.s-70&&pos<k.s+400){k.age=0;const lat=Math.max(-8.6,Math.min(8.6,bikeLat+k.lat)),p=point(k.s+20,lat);k.grp.position.set(p.x,p.y+.05,p.z);k.grp.rotation.y=rnd()*6.28;k.grp.visible=true;k.grp.scale.setScalar(.05);
    if(t-lastCrackSnd>.09){lastCrackSnd=t;sound.crack&&sound.crack(k.big?.9:.5)}if(k.big)ride.shake=Math.max(ride.shake||0,.16)}}
  else if(k.age<.35){k.age+=dt;const e=Math.min(1,k.age/.3);k.grp.scale.setScalar(.05+.95*(1-(1-e)*(1-e)))}}
 // 얼음 조각: 바이크 바로 앞 줄부터 차례로 깨진다
 let moving=false;for(const tl of tiles){if(tl.age<0){if(playing&&pos>L.start-120&&tl.s<pos+70){tl.age=0;if(rnd()<.35)sound.crack&&sound.crack(1);splash(tl.p,3,2)}}else if(tl.age<4.2){tl.age+=dt;moving=true}}
 if(moving)drawTiles(bikeLat);
 for(const e of events){if(e.type==='plunge'){splash(bp,70,6);for(let i=0;i<60;i++)emit(bubbles,bp.x+(rnd()-.5)*3,SURF-.5-rnd()*3,bp.z+(rnd()-.5)*3,(rnd()-.5)*1.5,1+rnd()*2.5,(rnd()-.5)*1.5,3)}
  if(e.type==='surface'){splash(bp,110,8)}}
 // 물속 생물 · 빛
 const wet=pos>L.start-600&&pos<L.end+500;
 if(wet){updateFish(t);for(const j of jellies){const pu=1+Math.sin(t*2.2+j.ph)*.14;j.g.position.set(j.x0+Math.sin(t*.3+j.ph)*.8,j.y0+Math.sin(t*.7+j.ph)*.55,j.z0+Math.cos(t*.25+j.ph)*.8);j.g.scale.set(j.k/pu,j.k*pu,j.k/pu)}
  const cam=camera.position;for(const s of shafts){s.m.rotation.y=Math.atan2(cam.x-s.m.position.x,cam.z-s.m.position.z);s.m.rotation.z=s.tilt+Math.sin(t*.4+s.ph)*.06;s.m.material.opacity=s.o*(.7+.3*Math.sin(t*.9+s.ph))*(.35+.65*subK)}
  // 고래: 라이더가 호수 가운데를 지날 때 맞은편에서 머리 위로
  const w=(pos-(L.start+500))/1700;whale.visible=w>0&&w<1.25;if(whale.visible){const ws=L.start+2700-w*2300,lat=8-w*8,p=point(ws,lat);whale.position.set(p.x,SURF-1.75+Math.sin(t*.5)*.15,p.z);whale.rotation.set(Math.sin(t*.6)*.05,heading(ws)+.12,Math.sin(t*.4)*.06);   // 머리(+z)가 라이더 쪽
   whale.userData.tail.rotation.x=Math.sin(t*1.5)*.35;for(const sx of [-1,1])whale.userData['fin'+sx].rotation.z=sx*(-.45+Math.sin(t*1.1)*.18);
   if(!whaleTold&&playing&&w>.42){whaleTold=true;notify('🐋 머리 위로 커다란 고래가 지나가요!')}}
  // 거품: 바이크 배기구 · 스노클에서, 그리고 바닥 곳곳에서
  if(playing&&ride.water){bubT+=dt;while(bubT>.03){bubT-=.03;const b=point(pos-22,bikeLat);emit(bubbles,b.x+(rnd()-.5)*.5,b.y+.5+rnd()*.4,b.z+(rnd()-.5)*.5,(rnd()-.5)*.6,1.2+rnd()*1.6,(rnd()-.5)*.6,2.6);
    if(rnd()<.35){emit(bubbles,bp.x+(rnd()-.5)*.3,bp.y+3.3,bp.z+(rnd()-.5)*.3,(rnd()-.5)*.4,1.6+rnd(),(rnd()-.5)*.4,2.2)}
    if(rnd()<.5){const s=pos+200+rnd()*900,q=groundAt(s,(rnd()-.5)*40);emit(bubbles,q.x,q.y+.2,q.z,0,.9+rnd()*1.4,0,5)}}}
  stepPool(bubbles,dt,.9,true);stepPool(drops,dt,-13,false);
  if(sub){camera.getWorldDirection(fwd);for(let i=0;i<MOTES;i++){const hx=Math.sin(i*12.9898)*43758.5453,hy=Math.sin(i*78.233)*12543.21,hz=Math.sin(i*37.719)*9631.77;
    const x=((hx-Math.floor(hx))*36+t*.25+36)%36-18,y=((hy-Math.floor(hy))*12+t*.12+Math.sin(t*.3+i)*.2+12)%12-6,z=((hz-Math.floor(hz))*36+Math.sin(t*.2+i)*.6+36)%36-18;
    motePos[i*3]=cam.x+fwd.x*10+x;motePos[i*3+1]=Math.min(SURF-.2,cam.y+y);motePos[i*3+2]=cam.z+fwd.z*10+z}moteGeo.attributes.position.needsUpdate=true}
  motes.visible=sub}
 // 물속 빛: 푸른 주변광 · 헤드라이트가 물을 가른다. 물 밖 것(반딧불 · 눈 · 꽃잎 …)은 숨긴다
 if(subK>.01){hemi.color.lerp(subHemi,subK);hemi.groundColor.lerp(subGround,subK);hemi.intensity+=(1.75-hemi.intensity)*subK;sun.color.lerp(subSun,subK);sun.intensity+=(1.5-sun.intensity)*subK;if(headlight)headlight.intensity=Math.max(headlight.intensity,70*subK)}
 if(sub)for(const o of hide)o.visible=false;
 sound.water&&sound.water(playing?subK:0);
 if(sub!==wasWater){wasWater=sub;veil.classList.remove('flash');void veil.offsetWidth;veil.classList.add('flash')}}
const api={update,reset,sub:false,group:G,tiles,cracks,whale,vest,SURF};drawTiles(0);return api}
root.LAKE_FX={build};
})(typeof window!=='undefined'?window:globalThis);
