/* 덴포토 문명 — 3D 화면 (Three.js r160, 3d/ride/vendor/three.min.js 를 같이 쓴다)
   육각 지형 · 숲/언덕/산/협곡 · 자원 · 보물상자 · 목표봉, 도시(마을 3D 모델 VillageModels 재사용) · 유닛 · 국경 · 안개.
   화면 위 글자(도시 이름표 · 유닛 배지 · 피해 숫자)는 HTML 로 올린다. */
(function(root){
'use strict';
const T=root.THREE,CIV=root.CIV,SQ3=Math.sqrt(3);
const HEIGHT={ocean:-.2,coast:-.12,grass:.06,plains:.06,desert:.07,forest:.08,hills:.2,mountain:.24};
const COLOR={ocean:'#2d6e9b',coast:'#5fb0c4',grass:'#8fbf5e',plains:'#c2c070',desert:'#d6a56c',forest:'#5f9a4e',hills:'#a3a861',mountain:'#9a9384'};
const FOG='#3a4656';
function hexXZ(i,W){const c=i%W,r=(i/W)|0;return {x:SQ3*(c+.5*(r&1)),z:1.5*r}}
function seeded(i){let a=i*2654435761>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const M=(c,o)=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:.85,flatShading:true},o||{}));
const mats={};const mat=(c,o)=>mats[c+(o?JSON.stringify(o):'')]||(mats[c+(o?JSON.stringify(o):'')]=M(c,o));
function emojiTex(txt,size=96,bg){const cv=document.createElement('canvas');cv.width=cv.height=size;const x=cv.getContext('2d');if(bg){x.fillStyle=bg;x.beginPath();x.arc(size/2,size/2,size*.46,0,7);x.fill()}
  x.font=`${size*.62}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(txt,size/2,size*.55);const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;return t}

// 여러 조각 모델을 색칠한 메쉬 하나로 굽는다 (도시 · 유닛 그리기 횟수를 크게 줄인다). 그림 무늬가 있는 조각(간판)은 따로 둔다.
const bakedMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.82,flatShading:true});
function bake(g){g.updateMatrixWorld(true);const inv=new T.Matrix4().copy(g.matrixWorld).invert(),parts=[],keep=[];let n=0;
  g.traverse(o=>{if(!o.isMesh)return;const m=o.material;if(Array.isArray(m)||m.map||m.transparent){keep.push(o);return}
    const geo=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone());geo.applyMatrix4(new T.Matrix4().multiplyMatrices(inv,o.matrixWorld));parts.push({geo,c:m.color,e:m.emissive&&m.emissiveIntensity?m.emissive.clone().multiplyScalar(m.emissiveIntensity*.5):null});n+=geo.attributes.position.count});
  const pos=new Float32Array(n*3),col=new Float32Array(n*3);let k=0;
  for(const {geo,c,e} of parts){const a=geo.attributes.position.array,cc=e?c.clone().add(e):c;pos.set(a,k*3);for(let v=0;v<a.length/3;v++){col[(k+v)*3]=cc.r;col[(k+v)*3+1]=cc.g;col[(k+v)*3+2]=cc.b}k+=a.length/3;geo.dispose()}
  const out=new T.Group();out.position.copy(g.position);out.rotation.copy(g.rotation);out.scale.copy(g.scale);out.userData=g.userData;
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('color',new T.BufferAttribute(col,3));geo.computeVertexNormals();out.add(new T.Mesh(geo,bakedMat));
  for(const o of keep){const w=new T.Matrix4().multiplyMatrices(inv,o.matrixWorld);const c=o.clone();c.matrixAutoUpdate=true;w.decompose(c.position,c.quaternion,c.scale);out.add(c)}
  return out}

class View{
  constructor(canvas,labels){this.cv=canvas;this.labels=labels;
    const r=this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});r.setPixelRatio(Math.min(devicePixelRatio||1,2));r.outputColorSpace=T.SRGBColorSpace;r.shadowMap.enabled=false;
    this.scene=new T.Scene();this.scene.background=new T.Color('#b9dbe6');this.scene.fog=new T.Fog('#b9dbe6',40,95);
    this.camera=new T.PerspectiveCamera(38,1,.1,400);this.target=new T.Vector3();this.dist=16;this.minDist=6;this.maxDist=46;
    this.scene.add(new T.HemisphereLight('#fff7e2','#6f7f5e',1.05));const sun=new T.DirectionalLight('#fff1d2',1.7);sun.position.set(-20,40,18);this.scene.add(sun);
    this.anims=[];this.floaters=[];this.unitObjs=new Map();this.cityObjs=new Map();this.time=0;this.playing=0;
    this.ray=new T.Raycaster();this.plane=new T.Plane(new T.Vector3(0,1,0),-.06);
    addEventListener('resize',()=>this.resize());this.resize()}
  resize(){const w=innerWidth,h=innerHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.W=w;this.H=h}
  /* ── 지도 ── */
  setState(S){this.S=S;const sc=this.scene;
    for(const o of [this.world,this.cityLayer,this.unitLayer,this.overlay,this.borderLayer,this.impLayer])if(o)sc.remove(o);
    for(const o of this.unitObjs.values())o.badge.remove();for(const o of this.cityObjs.values())o.label.remove();this.unitObjs.clear();this.cityObjs.clear();
    this.world=new T.Group();this.cityLayer=new T.Group();this.unitLayer=new T.Group();this.overlay=new T.Group();this.borderLayer=new T.Group();this.impLayer=new T.Group();
    sc.add(this.world,this.borderLayer,this.impLayer,this.cityLayer,this.unitLayer,this.overlay);
    const {W,H}=S;this.mapW=SQ3*(W+.5);this.mapH=1.5*(H-1);
    this.buildTerrain();this.buildDeco();
    const sea=new T.Mesh(new T.PlaneGeometry(600,600),mat('#2a6894',{roughness:.5}));sea.rotation.x=-Math.PI/2;sea.position.set(this.mapW/2,-.32,this.mapH/2);this.world.add(sea);
    this.seen=new Uint8Array(W*H);this.vis=new Uint8Array(W*H);this.refreshFog(true);this.syncAll(true)}
  heightAt(i){const T0=this.S.tiles[i];return HEIGHT[T0.t]}
  pos(i){const p=hexXZ(i,this.S.W);return new T.Vector3(p.x,this.heightAt(i),p.z)}
  buildTerrain(){const S=this.S,N=S.W*S.H,per=54,pos=new Float32Array(N*per*3),col=new Float32Array(N*per*3);let k=0;
    const cor=[];for(let a=0;a<6;a++){const ang=Math.PI/180*(60*a-30);cor.push([Math.cos(ang)*.995,Math.sin(ang)*.995])}
    const P=(x,y,z)=>{pos[k*3]=x;pos[k*3+1]=y;pos[k*3+2]=z;k++};
    this.baseCol=[];
    for(let i=0;i<N;i++){const {x,z}=hexXZ(i,S.W),h=this.heightAt(i),rnd=seeded(i+7);
      for(let a=0;a<6;a++){const b=(a+1)%6;P(x,h,z);P(x+cor[b][0],h,z+cor[b][1]);P(x+cor[a][0],h,z+cor[a][1])}
      for(let a=0;a<6;a++){const b=(a+1)%6,ax=x+cor[a][0],az=z+cor[a][1],bx=x+cor[b][0],bz=z+cor[b][1];P(ax,h,az);P(bx,h,bz);P(bx,-.35,bz);P(ax,h,az);P(bx,-.35,bz);P(ax,-.35,az)}
      const c=new T.Color(COLOR[S.tiles[i].t]);c.offsetHSL((rnd()-.5)*.02,(rnd()-.5)*.06,(rnd()-.5)*.05);this.baseCol.push(c)}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));this.colAttr=new T.BufferAttribute(col,3);g.setAttribute('color',this.colAttr);g.computeVertexNormals();
    this.terrain=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:.92,flatShading:true}));this.world.add(this.terrain)}
  paintTile(i,state){const c=state===0?new T.Color(FOG):state===1?this.baseCol[i].clone().lerp(new T.Color('#6d7480'),.45):this.baseCol[i],a=this.colAttr.array,o=i*54*3;
    const side=c.clone().multiplyScalar(.78);for(let v=0;v<54;v++){const cc=v<18?c:side;a[o+v*3]=cc.r;a[o+v*3+1]=cc.g;a[o+v*3+2]=cc.b}}
  buildDeco(){const S=this.S,N=S.W*S.H;this.decoIdx={};
    const inst=(geo,m,count)=>{const im=new T.InstancedMesh(geo,m,Math.max(1,count));im.count=count;const z=new T.Matrix4().makeScale(0,0,0);for(let k=0;k<count;k++)im.setMatrixAt(k,z);this.world.add(im);return im};
    const forest=[],hills=[],mts=[],desert=[],grass=[];for(let i=0;i<N;i++){const t=S.tiles[i].t;if(t==='forest')forest.push(i);else if(t==='hills')hills.push(i);else if(t==='mountain'&&!S.tiles[i].wonder)mts.push(i);else if(t==='desert')desert.push(i);else if(t==='grass'||t==='plains')grass.push(i)}
    this.deco={
      trunk:inst(new T.CylinderGeometry(.03,.045,.18,5),mat('#7a5a3a'),forest.length*4),
      crown:inst(new T.ConeGeometry(.17,.42,7),mat('#3f7d43'),forest.length*4),
      crown2:inst(new T.IcosahedronGeometry(.16,0),mat('#6e9d4c'),forest.length*2),
      hill:inst(new T.SphereGeometry(.42,9,6,0,Math.PI*2,0,Math.PI/2),mat('#97a058'),hills.length*2),
      rock:inst(new T.ConeGeometry(.5,1,6),mat('#8f877a'),mts.length*2),
      snow:inst(new T.ConeGeometry(.21,.36,6),mat('#f4f3ee'),mts.length*2),
      mesa:inst(new T.CylinderGeometry(.18,.24,.24,6),mat('#c5814f'),desert.length*2),
      tuft:inst(new T.ConeGeometry(.04,.13,4),mat('#6d9a46'),grass.length*3)};
    const D=this.deco,m4=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),v=new T.Vector3(),s=new T.Vector3();
    const put=(im,k,x,y,z,sx,sy,sz,ry=0)=>{e.set(0,ry,0);q.setFromEuler(e);m4.compose(v.set(x,y,z),q,s.set(sx,sy,sz));im.setMatrixAt(k,m4)};
    this.decoPlace=i=>{const t=S.tiles[i].t,{x,z}=hexXZ(i,S.W),h=this.heightAt(i),rnd=seeded(i*13+1);
      if(t==='forest'){const n=forest.indexOf(i);for(let j=0;j<4;j++){const a=j/4*Math.PI*2+rnd(),d=.25+rnd()*.33,px=x+Math.cos(a)*d,pz=z+Math.sin(a)*d,sc=.8+rnd()*.5;put(D.trunk,n*4+j,px,h+.09*sc,pz,sc,sc,sc);put(D.crown,n*4+j,px,h+.36*sc,pz,sc,sc,sc)}
        for(let j=0;j<2;j++){const a=rnd()*6.3,d=rnd()*.5;put(D.crown2,n*2+j,x+Math.cos(a)*d,h+.15,z+Math.sin(a)*d,1,.9,1)}}
      else if(t==='hills'){const n=hills.indexOf(i);put(D.hill,n*2,x-.2,h-.02,z+.1,1,.42,.9,rnd()*3);put(D.hill,n*2+1,x+.28,h-.02,z-.18,.7,.55,.7,rnd()*3)}
      else if(t==='mountain'&&!S.tiles[i].wonder){const n=mts.indexOf(i);put(D.rock,n*2,x-.12,h+.45,z,1.1,1,1.1,rnd()*3);put(D.snow,n*2,x-.12,h+.82,z,1.1,1,1.1,rnd()*3);put(D.rock,n*2+1,x+.36,h+.25,z+.25,.6,.55,.6,rnd()*3);put(D.snow,n*2+1,x+.36,h+.45,z+.25,.6,.55,.6)}
      else if(t==='desert'){const n=desert.indexOf(i);for(let j=0;j<2;j++){const a=rnd()*6.3,d=.2+rnd()*.4;put(D.mesa,n*2+j,x+Math.cos(a)*d,h+.1,z+Math.sin(a)*d,.7+rnd()*.7,.6+rnd()*1.3,.7+rnd()*.6,rnd()*3)}}
      else if(t==='grass'||t==='plains'){const n=grass.indexOf(i);for(let j=0;j<3;j++){const a=rnd()*6.3,d=.2+rnd()*.6;put(D.tuft,n*3+j,x+Math.cos(a)*d,h+.06,z+Math.sin(a)*d,1,1,1)}}
      const T0=S.tiles[i];
      if(T0.res){const sp=new T.Sprite(new T.SpriteMaterial({map:this.resTex(T0.res),depthWrite:false}));sp.position.set(x+.44,h+.3,z+.32);sp.scale.set(.34,.34,1);sp.renderOrder=2;this.world.add(sp);(this.resSprites||(this.resSprites=new Map())).set(i,sp)}
      if(T0.ruin){const g=new T.Group();g.position.set(x+.1,h,z-.1);const b=new T.Mesh(new T.BoxGeometry(.34,.2,.24),mat('#8b5a2b'));b.position.y=.1;g.add(b);const l=new T.Mesh(new T.BoxGeometry(.36,.08,.26),mat('#d9a93a',{metalness:.4,roughness:.4}));l.position.y=.24;g.add(l);
        const gem=new T.Mesh(new T.OctahedronGeometry(.07),mat('#7fe0f0',{emissive:'#3fb8d0',emissiveIntensity:.6}));gem.position.y=.4;g.add(gem);g.userData.gem=gem;this.world.add(g);(this.ruinObjs||(this.ruinObjs=new Map())).set(i,g)}
      if(T0.wonder)this.buildPeak(i)};
    for(const k in D)D[k].instanceMatrix.needsUpdate=true}
  resTex(r){this.rt=this.rt||{};return this.rt[r]||(this.rt[r]=emojiTex(CIV.RESOURCES[r].icon,96,'rgba(255,251,237,.92)'))}
  buildPeak(i){const {x,z}=hexXZ(i,this.S.W),h=this.heightAt(i),g=new T.Group();g.position.set(x,h,z);
    const rock=new T.Mesh(new T.ConeGeometry(.92,1.9,7),mat('#7f7a6c'));rock.position.y=.95;g.add(rock);const snow=new T.Mesh(new T.ConeGeometry(.42,.8,7),mat('#f7f6f0'));snow.position.y=1.5;g.add(snow);
    const pole=new T.Mesh(new T.CylinderGeometry(.015,.015,.5,5),mat('#5a4632'));pole.position.set(0,2.1,0);g.add(pole);const flag=new T.Mesh(new T.PlaneGeometry(.32,.2),mat('#e2563a',{side:T.DoubleSide}));flag.position.set(.16,2.26,0);g.add(flag);
    const gem=new T.Mesh(new T.OctahedronGeometry(.13),mat('#73e2f2',{emissive:'#39bcd6',emissiveIntensity:.8,flatShading:true}));gem.position.set(0,2.55,0);g.add(gem);g.userData={gem,flag};
    this.peak=g;this.world.add(g);
    const lb=document.createElement('div');lb.className='peak-label';lb.textContent='⛰ 목표봉';this.labels.appendChild(lb);this.peakLabel={el:lb,i}}
  refreshFog(force){const S=this.S,C=S.civs[S.player],N=S.W*S.H;let dirtyDeco=false;
    for(let i=0;i<N;i++){const st=C.visible[i]?2:C.explored[i]?1:0,old=this.seen[i]*2+this.vis[i];const now=(st>0?1:0)*2+(st===2?1:0);
      if(force||old!==now){this.paintTile(i,st);if(st>0&&!this.seen[i]){this.decoPlace(i);dirtyDeco=true}this.seen[i]=st>0?1:0;this.vis[i]=st===2?1:0}}
    this.colAttr.needsUpdate=true;if(dirtyDeco)for(const k in this.deco)this.deco[k].instanceMatrix.needsUpdate=true;
    if(this.ruinObjs)for(const [i,g] of this.ruinObjs)if(!S.tiles[i].ruin){this.world.remove(g);this.ruinObjs.delete(i)}
    if(this.peakLabel)this.peakLabel.el.style.display=this.seen[this.peakLabel.i]?'':'none'}
  /* ── 국경 · 개간 ── */
  buildBorders(){const S=this.S,g=this.borderLayer;while(g.children.length){const o=g.children.pop();o.geometry.dispose()}
    const byCiv=new Map(),fill=new Map(),cor=[];for(let a=0;a<6;a++){const ang=Math.PI/180*(60*a-30);cor.push([Math.cos(ang),Math.sin(ang)])}
    // 이웃 방향(odd-r) → 모서리 번호
    const edgeFor=(i,n)=>{const a=hexXZ(i,S.W),b=hexXZ(n,S.W),ang=Math.atan2(b.z-a.z,b.x-a.x);let best=0,bd=9;for(let e=0;e<6;e++){const mid=Math.atan2(cor[e][1]+cor[(e+1)%6][1],cor[e][0]+cor[(e+1)%6][0]);let d=Math.abs(Math.atan2(Math.sin(ang-mid),Math.cos(ang-mid)));if(d<bd){bd=d;best=e}}return best};
    const ownerCiv=i=>{const o=S.tiles[i].owner;if(o==null)return -1;const c=S.cities.find(c=>c.id===o);return c?c.civ:-1};
    for(let i=0;i<S.W*S.H;i++){if(!this.seen[i])continue;const oc=ownerCiv(i);if(oc<0)continue;const {x,z}=hexXZ(i,S.W),h=Math.max(this.heightAt(i),-.1)+.015;
      if(!fill.has(oc))fill.set(oc,[]);const F=fill.get(oc);for(let a=0;a<6;a++){const b=(a+1)%6;F.push(x,h,z,x+cor[b][0],h,z+cor[b][1],x+cor[a][0],h,z+cor[a][1])}
      const nbs=CIV.neighbors(i,S.W,S.H);const edges=new Set([0,1,2,3,4,5]);for(const n of nbs){const e=edgeFor(i,n);if(ownerCiv(n)===oc)edges.delete(e)}
      if(!byCiv.has(oc))byCiv.set(oc,[]);const L=byCiv.get(oc);
      for(const e of edges){const a=cor[e],b=cor[(e+1)%6],ax=x+a[0]*.97,az=z+a[1]*.97,bx=x+b[0]*.97,bz=z+b[1]*.97,ix=x+a[0]*.84,iz=z+a[1]*.84,jx=x+b[0]*.84,jz=z+b[1]*.84,y=h+.01;
        L.push(ax,y,az,bx,y,bz,jx,y,jz,ax,y,az,jx,y,jz,ix,y,iz)}}
    for(const [civ,arr] of fill){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(arr,3));const m=new T.Mesh(geo,new T.MeshBasicMaterial({color:S.civs[civ].color,transparent:true,opacity:.16,depthWrite:false,side:T.DoubleSide}));m.renderOrder=1;g.add(m)}
    for(const [civ,arr] of byCiv){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(arr,3));const m=new T.Mesh(geo,new T.MeshBasicMaterial({color:S.civs[civ].color,transparent:true,opacity:.9,depthWrite:false,side:T.DoubleSide}));m.renderOrder=1;g.add(m)}}
  buildImprovements(){const S=this.S,g=this.impLayer;while(g.children.length)g.remove(g.children[0]);
    const farmTex=this.farmTex||(this.farmTex=(()=>{const cv=document.createElement('canvas');cv.width=cv.height=64;const x=cv.getContext('2d');x.fillStyle='#d9c25a';x.fillRect(0,0,64,64);for(let k=0;k<8;k++){x.fillStyle=k%2?'#a8b84a':'#e6d27a';x.fillRect(0,k*8,64,5)}const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;return t})());
    const roadM=mat('#9b7b55');
    for(let i=0;i<S.W*S.H;i++){if(!this.seen[i])continue;const T0=S.tiles[i],{x,z}=hexXZ(i,S.W),h=this.heightAt(i);
      if(T0.imp==='farm'){const p=new T.Mesh(new T.CircleGeometry(.62,6),new T.MeshStandardMaterial({map:farmTex,roughness:1}));p.rotation.x=-Math.PI/2;p.rotation.z=Math.PI/6;p.position.set(x,h+.02,z);g.add(p)}
      if(T0.imp==='mine'){const b=new T.Mesh(new T.BoxGeometry(.3,.22,.24),mat('#4f4a45'));b.position.set(x-.25,h+.11,z+.25);g.add(b);const d=new T.Mesh(new T.BoxGeometry(.14,.14,.02),mat('#1e1b19'));d.position.set(x-.25,h+.09,z+.375);g.add(d);const cart=new T.Mesh(new T.BoxGeometry(.16,.09,.1),mat('#c8a04a',{metalness:.4}));cart.position.set(x,h+.06,z+.4);g.add(cart)}
      if(T0.imp==='lumber'){for(let k=0;k<3;k++){const l=new T.Mesh(new T.CylinderGeometry(.045,.045,.36,6),mat('#9a6b3f'));l.rotation.z=Math.PI/2;l.position.set(x+.15,h+.05+k*.07,z+.32+(k%2)*.05);g.add(l)}}
      if(T0.road||T0.city!=null){for(const n of CIV.neighbors(i,S.W,S.H)){if(n<i||!(S.tiles[n].road||S.tiles[n].city!=null)||!this.seen[n])continue;if(!(T0.road||S.tiles[n].road))continue;const b=hexXZ(n,S.W),hb=this.heightAt(n),len=Math.hypot(b.x-x,b.z-z);
        const r=new T.Mesh(new T.BoxGeometry(.13,.03,len),roadM);r.position.set((x+b.x)/2,(h+hb)/2+.03,(z+b.z)/2);r.lookAt(b.x,(h+hb)/2+.03,b.z);g.add(r)}}}}
  /* ── 도시 ── */
  modelProto(name){this.protos=this.protos||{};if(!this.protos[name]){try{this.protos[name]=root.VillageModels.create(name)}catch(e){this.protos[name]=new T.Group()}}return this.protos[name].clone()}
  cityKey(c){return [c.civ,c.pop,c.buildings.join(','),c.capital,c.hp<c.maxHp].join('|')}
  buildCity(c){const S=this.S,g=new T.Group(),p=this.pos(c.tile),col=S.civs[c.civ].color;g.position.copy(p);
    const base=new T.Mesh(new T.CylinderGeometry(.86,.92,.08,6),mat('#e9dfc4'));base.rotation.y=Math.PI/6;base.position.y=.04;g.add(base);
    const ring=new T.Mesh(new T.CylinderGeometry(.9,.9,.05,6,1,true),mat(col,{side:T.DoubleSide}));ring.rotation.y=Math.PI/6;ring.position.y=.07;g.add(ring);
    const slots=[[0,0],[-.42,-.2],[.42,-.22],[-.2,.42],[.3,.38],[-.55,.22],[.6,.1],[0,-.55]];
    const homes=['cottage','rosehouse','shop','cottage','rosehouse','cottage','shop','rosehouse'];
    const bmodel={market:'market',lighthouse:'lighthouse',bank:'vault',post:'shop',fountain:'fountain',dentlight:'lighthouse',tower:'tower',vault:'vault',balloon:'balloon'};
    const items=[];for(const b of c.buildings)if(bmodel[b])items.push({n:bmodel[b],big:!!CIV.WONDERS[b]});
    const nHomes=Math.min(slots.length-Math.min(items.length,4),1+Math.ceil(c.pop/1.5));for(let k=0;k<nHomes;k++)items.push({n:homes[k]});
    items.sort((a,b)=>(b.big?1:0)-(a.big?1:0));
    items.slice(0,slots.length).forEach((it,k)=>{const m=this.modelProto(it.n),sc=it.big?.085:it.n==='market'?.05:.055;m.scale.setScalar(sc);m.position.set(slots[k][0],.08,slots[k][1]);m.rotation.y=Math.atan2(-slots[k][0],-slots[k][1])+Math.PI+(k?0:Math.PI/6);g.add(m)});
    if(c.buildings.includes('walls')){for(let a=0;a<6;a++){const ang=a/6*Math.PI*2+Math.PI/6,w=new T.Mesh(new T.BoxGeometry(.9,.18,.07),mat('#b9ae96'));w.position.set(Math.cos(ang)*.78,.15,Math.sin(ang)*.78);w.rotation.y=-ang+Math.PI/2;g.add(w);
      const tw=new T.Mesh(new T.CylinderGeometry(.08,.09,.28,6),mat('#a89d86'));tw.position.set(Math.cos(ang+Math.PI/6)*.9,.18,Math.sin(ang+Math.PI/6)*.9);g.add(tw)}}
    const pole=new T.Mesh(new T.CylinderGeometry(.012,.012,.7,5),mat('#5a4632'));pole.position.set(.62,.42,-.42);g.add(pole);
    const flag=new T.Mesh(new T.PlaneGeometry(.3,.18),mat(col,{side:T.DoubleSide}));flag.position.set(.77,.68,-.42);g.add(flag);g.userData.flag=flag;
    if(c.capital){const star=new T.Mesh(new T.OctahedronGeometry(.07),mat('#f6d77a',{emissive:'#d8a83a',emissiveIntensity:.5}));star.position.set(.62,.82,-.42);g.add(star)}
    g.remove(flag);const b=bake(g);b.add(flag);b.userData.flag=flag;return b}
  syncCities(){const S=this.S,seenIds=new Set();
    for(const c of S.cities){seenIds.add(c.id);let o=this.cityObjs.get(c.id);const key=this.cityKey(c),vis=!!this.seen[c.tile];
      if(!o){const label=document.createElement('button');label.className='city-label';label.dataset.city=c.id;this.labels.appendChild(label);o={key:null,obj:null,label};this.cityObjs.set(c.id,o)}
      if(o.key!==key&&vis){if(o.obj)this.cityLayer.remove(o.obj);o.obj=this.buildCity(c);this.cityLayer.add(o.obj);o.key=key}
      if(o.obj)o.obj.visible=vis;o.label.style.display=vis?'':'none';
      const C=S.civs[c.civ],mine=c.civ===S.player,b=c.build,cost=b&&b.kind!=='project'?CIV.itemCost(b):0,y=mine?CIV.cityYield(S,c):null;
      const turns=mine&&b&&b.kind!=='project'&&y.p>0?Math.max(1,Math.ceil((cost-c.prod)/y.p)):null;
      const icon=b?(b.kind==='unit'?CIV.UNITS[b.id].icon:b.kind==='building'?CIV.BUILDINGS[b.id].icon:b.kind==='wonder'?CIV.WONDERS[b.id].icon:CIV.PROJECTS[b.id].icon):'❔';
      const html=`<i class="pop">${c.pop}</i><span>${c.capital?'★ ':''}${c.name}</span>${mine?`<em>${icon}${turns?` ${turns}`:''}</em>`:''}${c.hp<c.maxHp?`<b class="hp"><u style="width:${Math.round(c.hp/c.maxHp*100)}%"></u></b>`:''}`;
      if(o.html!==html){o.label.innerHTML=html;o.html=html}o.label.style.setProperty('--civ',C.color);o.label.classList.toggle('mine',mine)}
    for(const [id,o] of this.cityObjs)if(!seenIds.has(id)){if(o.obj)this.cityLayer.remove(o.obj);o.label.remove();this.cityObjs.delete(id)}}
  /* ── 유닛 ── */
  buildUnit(u){const S=this.S,col=S.civs[u.civ].color,g=new T.Group(),D=CIV.UNITS[u.type];
    const body=mat(col),skin=mat('#f2c9a0'),wood=mat('#8a6236'),metal=mat('#cfd4da',{metalness:.5,roughness:.35}),dark=mat('#2c2c33');
    const add=(geo,m,x,y,z,rx=0,ry=0,rz=0)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);g.add(o);return o};
    add(new T.CylinderGeometry(.2,.22,.04,14),mat('#fffbed'),0,.02,0);add(new T.TorusGeometry(.21,.025,6,18),body,0,.04,0,Math.PI/2);
    const person=(x=0,z=0,s=1)=>{add(new T.CylinderGeometry(.06*s,.08*s,.2*s,8),body,x,.16*s,z);add(new T.SphereGeometry(.055*s,10,8),skin,x,.31*s,z)};
    switch(u.type){
      case 'settler':add(new T.BoxGeometry(.3,.12,.18),wood,.02,.12,0);add(new T.CylinderGeometry(.1,.1,.3,10,1,false,0,Math.PI),mat('#f3ead2'),.02,.18,0,0,0,Math.PI/2);for(const x of [-.1,.14])for(const z of [-.1,.1])add(new T.TorusGeometry(.045,.012,5,10),dark,x,.06,z);person(-.2,0,.85);break;
      case 'worker':person(0,0);add(new T.CylinderGeometry(.01,.01,.26,5),wood,.1,.22,0,0,0,-.5);add(new T.BoxGeometry(.12,.025,.03),metal,.16,.33,0,0,0,-.5);break;
      case 'scout':{// 오토바이 우편배달부
        add(new T.TorusGeometry(.06,.02,6,12),dark,0,.08,.13,0,Math.PI/2);add(new T.TorusGeometry(.06,.02,6,12),dark,0,.08,-.13,0,Math.PI/2);add(new T.BoxGeometry(.07,.07,.26),mat('#d8442f'),0,.15,0);
        add(new T.BoxGeometry(.11,.08,.09),mat('#cf9452'),0,.2,-.12);add(new T.BoxGeometry(.14,.015,.015),metal,0,.22,.12);add(new T.CylinderGeometry(.045,.05,.12,8),mat('#3d6fb8'),0,.26,-.01);add(new T.SphereGeometry(.045,10,8),skin,0,.35,.0);add(new T.CylinderGeometry(.05,.05,.03,10),mat('#28406e'),0,.39,0);break}
      case 'warrior':person();add(new T.CylinderGeometry(.015,.03,.2,6),wood,.1,.2,0,0,0,-.4);add(new T.CylinderGeometry(.06,.06,.02,10),wood,-.08,.18,.02,Math.PI/2);break;
      case 'archer':person();add(new T.TorusGeometry(.1,.01,5,12,Math.PI),wood,.09,.21,0,0,Math.PI/2,Math.PI/2);add(new T.CylinderGeometry(.03,.03,.14,6),mat('#8b5a32'),-.06,.2,-.05,.3);break;
      case 'spear':person();add(new T.CylinderGeometry(.008,.008,.46,5),wood,.09,.24,0);add(new T.ConeGeometry(.02,.06,5),metal,.09,.49,0);add(new T.BoxGeometry(.02,.12,.1),mat(col),-.07,.17,0);break;
      case 'sword':person();add(new T.BoxGeometry(.015,.2,.03),metal,.1,.25,0,0,0,-.2);add(new T.BoxGeometry(.02,.14,.11),metal,-.08,.18,0);break;
      case 'musket':person();add(new T.CylinderGeometry(.01,.012,.34,6),dark,.08,.24,0,0,0,-.15);add(new T.CylinderGeometry(.065,.065,.025,10),mat('#2a2a3a'),0,.37,0);break;
      case 'horse':case 'knight':{add(new T.BoxGeometry(.11,.11,.3),mat(u.type==='knight'?'#e8e4dc':'#8a5a32'),0,.17,0);add(new T.BoxGeometry(.07,.13,.08),mat(u.type==='knight'?'#e8e4dc':'#8a5a32'),0,.27,.15,-.5);for(const x of [-.04,.04])for(const z of [-.11,.11])add(new T.CylinderGeometry(.015,.015,.12,5),dark,x,.06,z);
        add(new T.CylinderGeometry(.045,.055,.13,8),body,0,.3,-.02);add(new T.SphereGeometry(.045,10,8),u.type==='knight'?metal:skin,0,.4,-.02);if(u.type==='knight')add(new T.CylinderGeometry(.008,.012,.42,5),wood,.08,.32,.1,Math.PI/2.4);break}
      case 'catapult':add(new T.BoxGeometry(.24,.05,.3),wood,0,.08,0);add(new T.BoxGeometry(.03,.3,.03),wood,0,.22,-.02,-.6);add(new T.SphereGeometry(.04,8,6),mat('#8f877a'),0,.34,-.13);for(const x of [-.13,.13])for(const z of [-.1,.1])add(new T.CylinderGeometry(.045,.045,.02,10),wood,x,.05,z,0,0,Math.PI/2);break;
      case 'cannon':add(new T.CylinderGeometry(.035,.045,.3,10),dark,0,.14,.03,Math.PI/2.2);for(const x of [-.08,.08])add(new T.CylinderGeometry(.065,.065,.02,12),wood,x,.07,-.02,0,0,Math.PI/2);break}
    g.scale.setScalar(1.7);return bake(g)}
  unitSlot(u){const S=this.S,p=this.pos(u.at),D=CIV.UNITS[u.type],city=S.tiles[u.at].city!=null,other=S.units.some(o=>o.at===u.at&&o.id!==u.id);
    if(city)p.add(new T.Vector3(D.civilian?.32:-.32,.08,.5));else if(other)p.x+=D.civilian?.26:-.26;return p}
  syncUnits(instant){const S=this.S,P=S.civs[S.player],ids=new Set();
    for(const u of S.units){ids.add(u.id);let o=this.unitObjs.get(u.id);
      if(o&&o.civ!==u.civ){this.unitLayer.remove(o.obj);o.badge.remove();this.unitObjs.delete(u.id);o=null}
      if(!o||o.type!==u.type){if(o){this.unitLayer.remove(o.obj);o.badge.remove()}const obj=this.buildUnit(u);this.unitLayer.add(obj);const badge=document.createElement('div');badge.className='unit-badge';this.labels.appendChild(badge);o={obj,badge,civ:u.civ,type:u.type};this.unitObjs.set(u.id,o);obj.position.copy(this.unitSlot(u))}
      const vis=!!P.visible[u.at]||u.civ===S.player;o.obj.visible=vis;o.badge.style.display=vis?'':'none';
      if(!o.busy){const p=this.unitSlot(u);if(instant||o.obj.position.distanceTo(p)>3)o.obj.position.copy(p);else o.goal=p}
      const D=CIV.UNITS[u.type],mine=u.civ===S.player;
      const st=mine?(u.build?'⚒':u.fortify||u.fort?'🛡':u.sleep?'💤':u.goto!=null?'➜':u.moves>0&&!u.acted?'':'·'):'';
      const html=`<span>${D.icon}</span>${st?`<em>${st}</em>`:''}${u.hp<100?`<b><u style="width:${u.hp}%"></u></b>`:''}`;
      if(o.html!==html){o.badge.innerHTML=html;o.html=html}o.badge.style.setProperty('--civ',S.civs[u.civ].color);o.badge.classList.toggle('done',mine&&!(u.moves>0&&!u.acted));o.badge.classList.toggle('enemy',!mine&&CIV.isWar(S,S.player,u.civ))}
    for(const [id,o] of this.unitObjs)if(!ids.has(id)&&!o.dying){this.unitLayer.remove(o.obj);o.badge.remove();this.unitObjs.delete(id)}}
  syncAll(instant){if(!this.S)return;this.refreshFog();this.buildBorders();this.buildImprovements();this.syncCities();this.syncUnits(instant)}
  /* ── 선택 · 강조 ── */
  clearMarks(){while(this.overlay.children.length){const o=this.overlay.children.pop();o.geometry&&o.geometry.dispose()}}
  mark(tiles,color,opacity=.35){const S=this.S,arr=[],cor=[];for(let a=0;a<6;a++){const ang=Math.PI/180*(60*a-30);cor.push([Math.cos(ang)*.9,Math.sin(ang)*.9])}
    for(const i of tiles){const {x,z}=hexXZ(i,S.W),h=Math.max(this.heightAt(i),-.1)+.04;for(let a=0;a<6;a++){const b=(a+1)%6;arr.push(x,h,z,x+cor[b][0],h,z+cor[b][1],x+cor[a][0],h,z+cor[a][1])}}
    if(!arr.length)return;const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(arr,3));const m=new T.Mesh(geo,new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:T.DoubleSide}));m.renderOrder=3;this.overlay.add(m)}
  ring(i,color='#ffe27a'){const p=this.pos(i),r=new T.Mesh(new T.TorusGeometry(.62,.045,6,30),new T.MeshBasicMaterial({color,depthWrite:false,transparent:true,opacity:.95}));r.rotation.x=Math.PI/2;r.position.set(p.x,p.y+.06,p.z);r.renderOrder=4;r.userData.spin=true;this.overlay.add(r)}
  pathLine(path){if(!path||path.length<2)return;const pts=path.map(i=>{const p=this.pos(i);p.y+=.12;return p});const curve=new T.CatmullRomCurve3(pts,false,'centripetal',.3);
    const geo=new T.TubeGeometry(curve,path.length*6,.035,5,false);const m=new T.Mesh(geo,new T.MeshBasicMaterial({color:'#fff3c4',transparent:true,opacity:.95,depthWrite:false}));m.renderOrder=4;this.overlay.add(m);
    const end=pts[pts.length-1],dot=new T.Mesh(new T.SphereGeometry(.09,10,8),new T.MeshBasicMaterial({color:'#fff3c4'}));dot.position.copy(end);this.overlay.add(dot)}
  /* ── 카메라 ── */
  clampTarget(){this.target.x=Math.max(-2,Math.min(this.mapW+1,this.target.x));this.target.z=Math.max(-2,Math.min(this.mapH+1,this.target.z))}
  centerOn(i,instant){const p=this.pos(i);if(instant){this.target.set(p.x,0,p.z);this.camGoal=null}else this.camGoal=new T.Vector3(p.x,0,p.z)}
  pan(dx,dz){this.target.x+=dx;this.target.z+=dz;this.camGoal=null;this.clampTarget()}
  zoom(f){this.dist=Math.max(this.minDist,Math.min(this.maxDist,this.dist*f))}
  updateCamera(){const d=this.dist;this.camera.position.set(this.target.x,d*.86,this.target.z+d*.58);this.camera.lookAt(this.target.x,0,this.target.z+.6)}
  groundAt(cx,cy){const v=new T.Vector2(cx/this.W*2-1,-(cy/this.H)*2+1);this.ray.setFromCamera(v,this.camera);const hit=new T.Vector3();return this.ray.ray.intersectPlane(this.plane,hit)?hit:null}
  pick(cx,cy){const p=this.groundAt(cx,cy);if(!p)return null;const S=this.S;
    const q=(SQ3/3*p.x-p.z/3),r=2/3*p.z;let x=q,z=r,y=-x-z;let rx=Math.round(x),ry=Math.round(y),rz=Math.round(z);const dx=Math.abs(rx-x),dy=Math.abs(ry-y),dz=Math.abs(rz-z);
    if(dx>dy&&dx>dz)rx=-ry-rz;else if(dy>dz)ry=-rx-rz;else rz=-rx-ry;const row=rz,col=rx+(row-(row&1))/2;if(col<0||col>=S.W||row<0||row>=S.H)return null;return row*S.W+col}
  project(v){const p=v.clone().project(this.camera);return {x:(p.x+1)/2*this.W,y:(1-p.y)/2*this.H,z:p.z}}
  /* ── 애니메이션 ── */
  play(events,opt={}){const S=this.S,P=S.civs[S.player],steps=[],speed=opt.fast?.55:1;
    for(const e of events){
      if(e.type==='move'){const o=this.unitObjs.get(e.unit);if(!o)continue;const show=P.visible[e.from]||P.visible[e.to]||e.civ===S.player;if(!show)continue;
        steps.push({d:.16*speed,o,from:this.pos(e.from),to:this.pos(e.to),kind:'move'})}
      else if(e.type==='attack'){const show=P.visible[e.from]||P.visible[e.to]||e.civ===S.player;if(!show)continue;steps.push({d:.38*speed,e,kind:'attack',o:e.unit?this.unitObjs.get(e.unit):null,from:this.pos(e.from),to:this.pos(e.to)})}
      else if(e.type==='die'){const o=this.unitObjs.get(e.unit);if(o&&P.visible[e.at]){o.dying=true;steps.push({d:.35*speed,o,kind:'die'})}}
      else if(e.type==='found'||e.type==='capture'){if(P.visible[e.at??S.cities.find(c=>c.id===e.city)?.tile])steps.push({d:.3*speed,kind:'puff',at:e.at??S.cities.find(c=>c.id===e.city).tile})}}
    // 컴퓨터 차례가 너무 길면 줄인다
    const total=steps.reduce((s,x)=>s+x.d,0),cap=opt.cap||3.5;if(total>cap)for(const s of steps)s.d*=cap/total;
    return new Promise(res=>{if(!steps.length){this.syncAll();res();return}this.anims.push({steps,k:0,t:0,res});this.playing++})}
  stepAnim(dt){const A=this.anims[0];if(!A)return;let s=A.steps[A.k];
    if(A.t===0&&s){if(s.o){s.o.busy=true;s.o.goal=null}if(s.kind==='attack'){this.floater(s.to,s.e.deal?`-${s.e.deal}`:'',s.e.fromCity?'#ffd36a':'#ff6a55');if(s.e.take)this.floater(s.from,`-${s.e.take}`,'#ff6a55',.15)}
      if(s.kind==='puff')this.puff(s.at)}
    A.t+=dt;const k=Math.min(1,A.t/s.d);
    if(s.kind==='move'&&s.o){const p=s.from.clone().lerp(s.to,k);p.y+=Math.sin(k*Math.PI)*.12;s.o.obj.position.copy(p);s.o.obj.lookAt(s.to.x,s.o.obj.position.y,s.to.z)}
    if(s.kind==='attack'&&s.o&&s.o.obj){const base=s.from,dir=s.to.clone().sub(base).normalize(),l=Math.sin(k*Math.PI)*.35;s.o.obj.position.copy(base).addScaledVector(dir,l);if(s.o.obj.position.y<base.y)s.o.obj.position.y=base.y}
    if(s.kind==='die'&&s.o){s.o.obj.position.y-=dt*.6;s.o.obj.rotation.z+=dt*3;s.o.badge.style.opacity=String(1-k)}
    if(k>=1){if(s.o)s.o.busy=false;if(s.kind==='die'&&s.o){this.unitLayer.remove(s.o.obj);s.o.badge.remove();for(const [id,o] of this.unitObjs)if(o===s.o)this.unitObjs.delete(id)}A.k++;A.t=0;
      if(A.k>=A.steps.length){this.anims.shift();this.playing--;this.syncAll();A.res()}}}
  floater(v,text,color,delay=0){if(!text)return;const el=document.createElement('div');el.className='floater';el.textContent=text;el.style.color=color;this.labels.appendChild(el);this.floaters.push({el,v:v.clone().add(new T.Vector3(0,.6,0)),t:-delay})}
  puff(i){const p=this.pos(i),r=new T.Mesh(new T.TorusGeometry(.4,.06,6,24),new T.MeshBasicMaterial({color:'#fff7dc',transparent:true,opacity:.9,depthWrite:false}));r.rotation.x=Math.PI/2;r.position.set(p.x,p.y+.1,p.z);this.scene.add(r);
    const t0=this.time;this.fx=(this.fx||[]);this.fx.push(dt=>{const k=(this.time-t0)/.8;r.scale.setScalar(1+k*1.8);r.material.opacity=.9*(1-k);if(k>=1){this.scene.remove(r);return false}return true})}
  /* ── 매 프레임 ── */
  frame(dt){this.time+=dt;if(this.camGoal){this.target.lerp(this.camGoal,Math.min(1,dt*6));if(this.target.distanceTo(this.camGoal)<.02)this.camGoal=null}
    this.updateCamera();this.stepAnim(dt);
    for(const o of this.unitObjs.values())if(o.goal&&!o.busy){o.obj.position.lerp(o.goal,Math.min(1,dt*12));if(o.obj.position.distanceTo(o.goal)<.01){o.obj.position.copy(o.goal);o.goal=null}}
    for(const c of this.overlay.children)if(c.userData.spin){c.rotation.z+=dt*1.2;c.scale.setScalar(1+Math.sin(this.time*4)*.04)}
    if(this.peak){this.peak.userData.gem.rotation.y+=dt*1.5;this.peak.userData.flag.rotation.y=Math.sin(this.time*3)*.3}
    if(this.ruinObjs)for(const g of this.ruinObjs.values()){g.userData.gem.rotation.y+=dt*2;g.userData.gem.position.y=.4+Math.sin(this.time*3)*.04}
    for(const o of this.cityObjs.values())if(o.obj&&o.obj.userData.flag)o.obj.userData.flag.rotation.y=Math.sin(this.time*2.6+o.obj.position.x)*.35;
    if(this.fx)this.fx=this.fx.filter(f=>f(dt));
    this.renderer.render(this.scene,this.camera);
    // 화면 위 글자 위치
    const lift=new T.Vector3();
    for(const [id,o] of this.cityObjs){if(o.label.style.display==='none')continue;const c=this.S.cities.find(c=>c.id===id);if(!c)continue;lift.copy(this.pos(c.tile));lift.y+=.95;lift.z-=.15;const p=this.project(lift);o.label.style.transform=`translate(${p.x|0}px,${p.y|0}px) translate(-50%,-100%)`;o.label.style.visibility=p.z<1?'':'hidden'}
    const far=this.dist>30;this.labels.classList.toggle('far',far);
    for(const o of this.unitObjs.values()){if(o.badge.style.display==='none'||far)continue;lift.copy(o.obj.position);lift.y+=.62;const p=this.project(lift);o.badge.style.transform=`translate(${p.x|0}px,${p.y|0}px) translate(-50%,-100%)`}
    if(this.peakLabel&&this.peakLabel.el.style.display!=='none'){lift.copy(this.pos(this.peakLabel.i));lift.y+=3;const p=this.project(lift);this.peakLabel.el.style.transform=`translate(${p.x|0}px,${p.y|0}px) translate(-50%,-100%)`}
    this.floaters=this.floaters.filter(f=>{f.t+=dt;if(f.t<0){f.el.style.opacity='0';return true}const k=f.t/1.1;const v=f.v.clone();v.y+=k*.6;const p=this.project(v);f.el.style.opacity=String(Math.min(1,2-k*2));f.el.style.transform=`translate(${p.x|0}px,${p.y|0}px) translate(-50%,-50%)`;if(k>=1){f.el.remove();return false}return true})}
}
root.CivView=View;root.CivView.hexXZ=hexXZ;
})(window);
