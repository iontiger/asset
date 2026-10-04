/* 블렌더 뉴욕 키트(nyc-assets.js 가 읽은 것)를 시내 장면(city-scene.js)에 입힌다.
   - 길을 따라 선 빌딩 앞면: 1층 가게 · 아래 2개 층은 3D 창문(창틀 · 창턱 · 상인방) · 그 위는 같은 창을 구운 평판 · 꼭대기 코니스
     · 벽돌 건물엔 철제 비상계단. 원래 상자 빌딩은 앞면만 벽 두께만큼 뒤로 물린다.
   - 차 · 옐로 캡 · 가로등 · 소화전을 블렌더 모델로 바꾸고 쓰레기통 · 우체통을 더한다.
   - 밤에는 창문 마스크(_m.jpg 의 R)로 창마다 다르게 불이 켜진다. 유리 · 금속은 하늘 반사(환경맵)를 받는다. */
(function(root){
const BRICK=['#a8604a','#8f4e3d','#a2765a','#7f6f62'],LIME=['#d6cfc1','#c9c2b4','#c8b79c','#b8b2a6'];
function styleOf(b){return b.glass?'glass':b.h>90?'deco':BRICK.includes(b.col)?'brick':LIME.includes(b.col)?'lime':'deco'}
function apply(X,A){
 const {T,g,WV,P,dirW,rotOf,YC,WALK,dmy,at}=X,K=A.kits;
 // ── 하늘 반사 · 조명용 환경맵: 실제 도시 거리 HDRI(city_1k.hdr). 못 받으면 위는 하늘, 아래는 길 색인 작은 장면을 굽는다
 let env=null;const hdr=A.hdr&&A.hdr();
 if(X.renderer&&hdr){const pm=new T.PMREMGenerator(X.renderer);env=pm.fromEquirectangular(hdr).texture;pm.dispose();hdr.dispose()}
 else if(X.renderer){const es=new T.Scene(),sg=new T.SphereGeometry(10,32,16),col=[],c=new T.Color(),sky=new T.Color('#a9c8e6'),hor=new T.Color('#e4e6e4'),grd=new T.Color('#4c5054');
  const pa=sg.attributes.position;for(let i=0;i<pa.count;i++){const y=pa.getY(i)/10;c.copy(y>0?hor.clone().lerp(sky,Math.pow(y,.6)):hor.clone().lerp(grd,Math.min(1,-y*4)));col.push(c.r,c.g,c.b)}
  sg.setAttribute('color',new T.Float32BufferAttribute(col,3));es.add(new T.Mesh(sg,new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide})));
  const pm=new T.PMREMGenerator(X.renderer);env=pm.fromScene(es,0).texture;pm.dispose();sg.dispose()}
 const envMats=[];const withEnv=(m,k)=>{if(env){m.envMap=env;m.envMapIntensity=k;m.userData.envK=k;envMats.push(m)}return m};
 // ── 건물 앞면 재질: 아틀라스 색 + 거칠기/금속 + 밤 창문 불빛 (모듈마다 · 평판은 칸마다 켜지고 꺼짐)
 const facadeMat=(st,flat)=>{const ttag=flat?'f':'',m=withEnv(new T.MeshStandardMaterial({map:A.tex(st+'_'+ttag+'c'),roughnessMap:A.tex(st+'_'+ttag+'m'),metalnessMap:A.tex(st+'_'+ttag+'m'),normalMap:A.tex(st+'_'+ttag+'n'),roughness:1,metalness:1,vertexColors:!!flat}),.85);
  m.defines=Object.assign(flat?{FLATW:''}:{},st==='glass'?{GLASSW:''}:{});   // 유리 커튼월은 창이 넓어 불빛을 줄인다
  m.onBeforeCompile=sh=>{sh.uniforms.uNight=X.NIGHT;
   // 불 켜짐은 꼭짓점에서 모듈 위치로 한 번 정한다 (조각마다 해시하면 정밀도 때문에 줄무늬가 생긴다)
   sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying float vLit;').replace('#include <begin_vertex>','#include <begin_vertex>\nvLit=0.;\n#ifdef USE_INSTANCING\n{vec3 o=floor(instanceMatrix[3].xyz*2.+.5);vLit=fract(sin(dot(o,vec3(.1271,.3117,.0743)))*4375.85);}\n#endif');
   sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vLit;uniform float uNight;').replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
{float wm=smoothstep(.35,.7,texture2D(roughnessMap,vRoughnessMapUv).r),hh=vLit;
#ifdef FLATW
{vec2 c=floor(vRoughnessMapUv);hh=fract(sin(dot(mod(c,97.),vec2(.1271,.3117)))*4375.85);}
#endif
totalEmissiveRadiance+=wm*step(.42,hh)*uNight*mix(vec3(1.,.66,.32),vec3(.66,.8,1.),step(.86,hh))*(.5+.45*hh)
#ifdef GLASSW
*.6
#endif
;}`)};return m};
 const FM={},FF={};for(const st of Object.keys(K)){FM[st]=facadeMat(st,false);FF[st]=facadeMat(st,true)}
 // ── 앞면마다 모듈을 늘어놓는다
 const rows={},flats={},Mx=new T.Matrix4(),Q=new T.Quaternion(),Sv=new T.Vector3(),Pv=new T.Vector3(),UP=new T.Vector3(0,1,0),white=new T.Color('#ffffff');
 const add=(key,col)=>{(rows[key]=rows[key]||[]).push([Mx.clone(),col])};
 let faces=0,seed=11;const faceList=[];const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
 for(const b of X.blds){const f=b.front;if(!f||!b.mi)continue;const st=styleOf(b),k=K[st];if(!k)continue;
  const N=Math.max(1,Math.round((b.h-k.G-k.C)/k.H));if(b.h-k.G-k.C<k.H*.75)continue;
  const lat=f.side*(WALK+.9),pa=P(f.s,f.t0,lat),pb=P(f.s,f.t1,lat),A0=WV(pa[0],pa[1],YC),B0=WV(pb[0],pb[1],YC);
  const nn=f.s.axis==='F'?dirW(-f.side,0):dirW(0,-f.side),n=new T.Vector3(nn.x,0,nn.z).normalize(),xa=new T.Vector3(n.z,0,-n.x);
  const o=A0.clone().sub(B0).dot(xa)<0?A0:B0,L=A0.distanceTo(B0),nb=Math.max(1,Math.round(L/k.W)),sx=L/(nb*k.W),fh=(b.h-k.G-k.C)/N,sy=fh/k.H;
  const tint=white.clone().lerp(new T.Color(b.col),st==='glass'?.35:.16).multiplyScalar(.94+rnd()*.12);
  Q.setFromAxisAngle(UP,Math.atan2(n.x,n.z));
  const put=(key,x,y,syy,col=tint)=>{Pv.copy(o).addScaledVector(xa,x);Pv.y=YC+y;Sv.set(sx,syy,1);Mx.compose(Pv,Q,Sv);add(key,col)};
  const nUp=Math.min(N,2);
  for(let i=0;i<nb;i++){const x=i*k.W*sx;put(st+'_gr',x,0,1);for(let r=0;r<nUp;r++)put(st+'_up',x,k.G+r*fh,sy);put(st+'_co',x,k.G+N*fh,1)}
  if(N>nUp){const F=flats[st]=flats[st]||{pos:[],nor:[],uv:[],col:[],idx:[]},y0=YC+k.G+nUp*fh,y1=YC+k.G+N*fh,u0=(faces*13)%997,v0=nUp,base=F.pos.length/3;
   for(const [x,y,u,v] of [[0,y0,0,0],[L,y0,nb,0],[L,y1,nb,N-nUp],[0,y1,0,N-nUp]]){Pv.copy(o).addScaledVector(xa,x).addScaledVector(n,.01);F.pos.push(Pv.x,y,Pv.z);F.nor.push(n.x,0,n.z);F.uv.push(u0+u,v0+v);F.col.push(tint.r,tint.g,tint.b)}
   F.idx.push(base,base+1,base+2,base,base+2,base+3)}
  if(st==='brick'&&nb>=3&&N>=2&&A.geo('fire_escape')){const x=Math.floor((nb-2)/2)*k.W*sx;for(let r=0;r<N;r++)put('fire_escape',x,k.G+r*fh,sy,white)}
  // 상자 빌딩 앞면은 벽 두께만큼 뒤로 (모듈 뒷면과 겹치지 않게)
  const d=k.T+.04;if(f.s.axis==='F'){if(f.side>0)b.r0+=d;else b.r1-=d}else{if(f.side>0)b.f0+=d;else b.f1-=d}X.boxAt(b.mi[0],b.mi[1],b);faces++;faceList.push({st,c:o.clone().addScaledVector(xa,L/2),n,h:b.h,main:f.s.main})}
 const facade=new T.Group();facade.name='nyc-facades';g.add(facade);let tris=0;
 for(const key of Object.keys(rows)){const geo=A.geo(key);if(!geo)continue;const st=key==='fire_escape'?'brick':key.split('_')[0],list=rows[key];
  const m=new T.InstancedMesh(geo,FM[st],list.length);list.forEach(([mx,c],i)=>{m.setMatrixAt(i,mx);m.setColorAt(i,c)});m.castShadow=false;m.receiveShadow=true;m.computeBoundingSphere();facade.add(m);tris+=geo.userData.tris*list.length}
 for(const st of Object.keys(flats)){const F=flats[st],geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(F.pos,3));geo.setAttribute('normal',new T.Float32BufferAttribute(F.nor,3));
  geo.setAttribute('uv',new T.Float32BufferAttribute(F.uv,2));geo.setAttribute('color',new T.Float32BufferAttribute(F.col,3));geo.setIndex(F.idx);const m=new T.Mesh(geo,FF[st]);m.receiveShadow=true;facade.add(m);tris+=F.idx.length/3}
 // ── 소품 · 차 재질 (블렌더 재질 정보 + 그늘 꼭짓점 색)
 const MATC={};
 const propMat=(name,info)=>{if(name==='lamp_bulb')return X.bulbMat;if(MATC[name])return MATC[name];info=info||{color:'#888888',rough:.6,metal:0};
  const m=new T.MeshStandardMaterial({color:info.color,roughness:info.rough,metalness:info.metal,vertexColors:true});
  const glow={car_head:['#fff2cc',.5],car_tail:['#ff2010',.45],taxi_sign:['#ffe27a',.55]}[name];if(glow){m.emissive.set(glow[0]);m.emissiveIntensity=glow[1];m.userData.glow=glow[1]}
  if(info.metal>.2||info.rough<.2)withEnv(m,name==='car_glass'?1.2:.7);return MATC[name]=m};
 const matsOf=geo=>{const gs=geo.userData.groups;return gs.length>1?gs.map(n=>propMat(n,geo.userData.mats[n])):propMat(gs[0],geo.userData.mats[gs[0]])};
 const props=new T.Group();props.name='nyc-props';g.add(props);
 const face=o=>o.s.axis==='F'?rotOf(-o.side,0):rotOf(0,-o.side);
 const placeAll=(name,list,f)=>{const geo=A.geo(name);if(!geo||!list.length)return null;const m=new T.InstancedMesh(geo,matsOf(geo),list.length);
  list.forEach((o,i)=>{f(o,i);dmy.updateMatrix();m.setMatrixAt(i,dmy.matrix)});m.castShadow=true;m.receiveShadow=true;m.computeBoundingSphere();props.add(m);tris+=geo.userData.tris*list.length;return m};
 const swapped=[];
 if(placeAll('lamp',X.lamps,l=>at(l.R,l.F,YC+.24,1,1,1,face(l)))){for(const k of ['pole','arm','bulb'])if(X.old[k])X.old[k].visible=false;swapped.push('lamp')}
 if(placeAll('hydrant',X.hyd,h=>at(h.R,h.F,YC+.24,1,1,1,face(h)))){if(X.old.hyd)X.old.hyd.visible=false;swapped.push('hydrant')}
 if(placeAll('trash',X.bins,(b,i)=>at(b.R,b.F,YC+.24,1,1,1,i*1.7)))swapped.push('trash');
 if(placeAll('mailbox',X.mail,o=>at(o.R,o.F,YC+.24,1,1,1,face(o))))swapped.push('mailbox');
 // ── 차: 차체(색칠 · 인스턴스 색) + 나머지(유리 · 바퀴 · 등 …) 두 덩어리, 세단 · 택시 따로
 const paintMat=withEnv(new T.MeshStandardMaterial({color:'#ffffff',roughness:.32,metalness:.35,vertexColors:true}),.9);
 const split=(geo,keep)=>{const out=new T.BufferGeometry();for(const a of ['position','normal','uv','color'])if(geo.attributes[a])out.setAttribute(a,geo.attributes[a]);
  const src=geo.index.array,idx=[],names=[];geo.groups.forEach((gr,i)=>{const nm=geo.userData.groups[i];if(!keep(nm))return;out.addGroup(idx.length,gr.count,names.length);for(let j=gr.start;j<gr.start+gr.count;j++)idx.push(src[j]);names.push(nm)});
  out.setIndex(idx);out.computeBoundingSphere();return [out,names]};
 let carKit=null;
 if(A.geo('car')&&A.geo('taxi')){
  const set=name=>{const geo=A.geo(name),[pg]=split(geo,n=>n==='car_paint'),[rg,rn]=split(geo,n=>n!=='car_paint');
   const paint=new T.InstancedMesh(pg,paintMat,X.MAXC),rest=new T.InstancedMesh(rg,rn.map(n=>propMat(n,geo.userData.mats[n])),X.MAXC);
   for(const m of [paint,rest]){m.count=0;m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;props.add(m)}paint.setColorAt(0,white);return {paint,rest,n:0}};
  const sedan=set('car'),taxi=set('taxi'),cc=new T.Color();
  carKit={begin(){sedan.n=taxi.n=0},put(mx,col,isTaxi){const s=isTaxi?taxi:sedan;if(s.n>=X.MAXC)return;s.paint.setMatrixAt(s.n,mx);s.rest.setMatrixAt(s.n,mx);s.paint.setColorAt(s.n,cc.set(col));s.n++},
   end(){for(const s of [sedan,taxi]){for(const m of [s.paint,s.rest]){m.count=s.n;m.instanceMatrix.needsUpdate=true}s.paint.instanceColor.needsUpdate=true}}};
  for(const m of X.carMeshes){m.visible=false}X.setCarKit(carKit);swapped.push('car','taxi')}
 // ── 바닥: 실사 아스팔트(약 1.5 m 반복 · 노멀맵) · 콘크리트 보도(1.6 m 판 줄눈) · 상자 빌딩 옆면에 구운 층 텍스처
 const ac=A.tex('asphalt_c'),an=A.tex('asphalt_n');
 if(ac&&an){const k=14/1.5;for(const t of [ac,an])t.repeat.set(k,k);Object.assign(X.asMat,{map:ac,normalMap:an,roughness:.9});X.asMat.normalScale.set(.9,.9);X.asMat.needsUpdate=true;X.setAsBase(1.15)}
 const wc=A.tex('walk_c');
 if(wc){const ax=new T.Vector2(X.ax.x,X.ax.z).normalize(),af=new T.Vector2(X.af.x,X.af.z).normalize(),U={uWalkC:{value:wc},uO:{value:new T.Vector2(X.o0.x,X.o0.z)},uAx:{value:ax},uAf:{value:af}};
  X.walkMat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);
   sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP2;varying vec3 vWN2;').replace('#include <begin_vertex>','#include <begin_vertex>\nvWP2=(modelMatrix*vec4(transformed,1.)).xyz;vWN2=normalize(mat3(modelMatrix)*objectNormal);');
   sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWP2;varying vec3 vWN2;uniform sampler2D uWalkC;uniform vec2 uO;uniform vec2 uAx;uniform vec2 uAf;').replace('#include <color_fragment>',`#include <color_fragment>
if(vWN2.y>.5){vec2 d=vWP2.xz-uO,cu=vec2(dot(d,uAx),dot(d,uAf));diffuseColor.rgb*=texture2D(uWalkC,cu/2.4).rgb*vec3(1.5,1.5,1.58);vec2 fj=fract(cu/1.6);vec2 e=min(fj,1.-fj);float jt=1.-smoothstep(.006,.02,min(e.x,e.y));diffuseColor.rgb*=1.-.32*jt;}`)};
  X.walkMat.customProgramCacheKey=()=>'nyc-walk';X.walkMat.needsUpdate=true}
 if(A.tex('lime_fc')&&A.tex('glass_fc')){X.BOXTEX.mc.value=A.tex('lime_fc');X.BOXTEX.mm.value=A.tex('lime_fm');X.BOXTEX.gc.value=A.tex('glass_fc');X.BOXTEX.gm.value=A.tex('glass_fm');X.BOXTEX.on.value=1}
 // 장면의 나머지 재질(상자 빌딩 · 보도 · 표지판 · 신호등 …)도 같은 하늘빛을 받게
 if(env)g.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m&&m.isMeshStandardMaterial&&!m.envMap)withEnv(m,m.metalness>.3?.8:.45)});
 for(const m of [X.asMat,X.walkMat])if(m.userData.envK){m.userData.envK=.22;m.envMapIntensity=.22}   // 길바닥은 하늘을 은은하게만
 // 밤에는 하늘 반사를 줄이고 차 등 · 택시 표시등을 밝힌다
 function update(E){const d=E.dark;for(const m of envMats)m.envMapIntensity=m.userData.envK*(1-.9*d)*(1-.45*E.weather);
  for(const n of ['car_head','car_tail','taxi_sign'])if(MATC[n])MATC[n].emissiveIntensity=MATC[n].userData.glow*(1+3.5*d)}
 return {facade,props,faces,faceList,tris,swapped,update,styleOf,env}}
const api={apply,styleOf};root.CITY_REAL=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
