/* 뉴욕 거리 산책(3d/nyc)의 덧붙인 즐길 거리 — 좌표는 walk-city.js 와 같다(R 동쪽 · F 북쪽 · 월드 x = R, z = -F).
   - 이스트강 불꽃놀이: 여름 끝 ~ 가을 맑은 밤, 두 다리 사이 강 위로 터진다(브루클린 브릿지 · 브루클린 브릿지 파크에서 잘 보인다)
   - 증권거래소 크리스마스 트리: 겨울이면 Broad St 에 큰 트리 · 반짝이는 전구 · 꼭대기 별
   - 간식 카트 3대: 배터리 파크 핫도그 · 볼링 그린 프레첼 · 브루클린 브릿지 파크 아이스크림(가을 · 겨울엔 꿀땅콩). 가까이 가서 F
   build({T,scene,YC,sound}) → {carts, blocked(R,F), update(time,dt,E), updateCarts(time,E), addCart(c,parent), snack(kind), fireworks} */
(function(root){
function build({T,scene,YC=3.8,sound}){
 const g=new T.Group();g.name='nyc-extras';scene.add(g);
 const W=(R,F,y=0)=>new T.Vector3(R,y,-F);
 const SM=(c,o={})=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:.75},o));
 const add=(geo,mat,x,y,z,p=g,shadow=true)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;p.add(m);return m};
 const tex=(w,h,draw)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t};
 const glow=tex(64,64,x=>{const r=x.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,255,255,.75)');r.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=r;x.fillRect(0,0,64,64)});

 /* ═══ 1. 이스트강 불꽃놀이 ═══ */
 const FW={on:false,wait:1,list:[],C:W(505,470,0)};
 const PCOL=['#ff5a5f','#ffd36b','#7fd4ff','#b98cff','#8dffb0','#ffffff','#ff9ad5','#ffb15a'];
 const flash=new T.PointLight('#ffd7a0',0,700,1.2);flash.position.copy(FW.C).setY(YC+60);g.add(flash);
 for(let b=0;b<9;b++){const N=170,pos=new Float32Array(N*3),col=new Float32Array(N*3),geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('color',new T.BufferAttribute(col,3));
  const m=new T.PointsMaterial({size:2.4,map:glow,vertexColors:true,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,fog:false}),pts=new T.Points(geo,m);pts.frustumCulled=false;pts.visible=false;g.add(pts);
  FW.list.push({pts,pos,col,vel:new Float32Array(N*3),N,t:0,life:0,phase:0,o:new T.Vector3(),top:0})}
 function boom(p){if(!sound||!sound.ctx||sound.muted)return;const a=sound.ctx,t=a.currentTime,d=Math.max(30,p.distanceTo(FW.cam||p));setTimeout(()=>{try{const n=a.createBufferSource(),len=a.sampleRate*.9|0,buf=a.createBuffer(1,len,a.sampleRate),c=buf.getChannelData(0);for(let i=0;i<len;i++)c[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);n.buffer=buf;const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=260;const gn=a.createGain();gn.gain.value=Math.min(.9,60/d);n.connect(f);f.connect(gn);gn.connect(sound.master||a.destination);n.start()}catch(e){}},Math.min(2500,d*.8/343*1000))}
 function launch(){const b=FW.list.find(q=>q.phase===0);if(!b)return;b.phase=1;b.t=0;b.o.set(FW.C.x+(Math.random()-.5)*150,YC+2,FW.C.z+(Math.random()-.5)*90);b.top=YC+42+Math.random()*38;b.life=2.4+Math.random()*.8;
  const c1=new T.Color(PCOL[Math.random()*PCOL.length|0]),c2=new T.Color(PCOL[Math.random()*PCOL.length|0]),sp=17+Math.random()*10,ring=Math.random()<.25;
  for(let i=0;i<b.N;i++){let x,y,z;if(ring){const a=i/b.N*Math.PI*2;x=Math.cos(a);y=Math.sin(a)*.25;z=Math.sin(a)}else{const u=Math.random()*2-1,a=Math.random()*Math.PI*2,r=Math.sqrt(1-u*u);x=r*Math.cos(a);y=u;z=r*Math.sin(a)}const s=sp*(ring?1:.75+Math.random()*.35);b.vel.set([x*s,y*s,z*s],i*3);const c=i%3?c1:c2;b.col.set([c.r,c.g,c.b],i*3);b.pos.set([b.o.x,b.o.y,b.o.z],i*3)}
  b.pts.geometry.attributes.color.needsUpdate=true;b.pts.visible=true;b.pts.material.size=1.2}
 function updateFw(dt,E){const want=E.p>.45&&E.p<.62&&E.dark>.45&&E.rain<.15;FW.on=want;
  if(want&&(FW.wait-=dt)<=0){FW.wait=.35+Math.random()*1.1;launch();if(Math.random()<.22){setTimeout(launch,180);setTimeout(launch,360)}}
  let fl=0;for(const b of FW.list){if(!b.phase)continue;b.t+=dt;const pa=b.pts.geometry.attributes.position;
   if(b.phase===1){const k=Math.min(1,b.t/1.1),y=b.o.y+(b.top-b.o.y)*(1-(1-k)*(1-k));for(let i=0;i<b.N;i++){b.pos[i*3]=b.o.x;b.pos[i*3+1]=y-(i%12)*.35*(1-k);b.pos[i*3+2]=b.o.z}b.pts.material.opacity=.9;pa.needsUpdate=true;
    if(k>=1){b.phase=2;b.t=0;for(let i=0;i<b.N;i++)b.pos[i*3+1]=b.top;b.pts.material.size=3.6;boom(new T.Vector3(b.o.x,b.top,b.o.z));fl=Math.max(fl,1)}}
   else{const L=b.t/b.life,dr=Math.exp(-dt*1.6);for(let i=0;i<b.N;i++){const j=i*3;b.vel[j]*=dr;b.vel[j+1]=b.vel[j+1]*dr-4.2*dt;b.vel[j+2]*=dr;b.pos[j]+=b.vel[j]*dt;b.pos[j+1]+=b.vel[j+1]*dt;b.pos[j+2]+=b.vel[j+2]*dt}pa.needsUpdate=true;
    b.pts.material.opacity=Math.pow(Math.max(0,1-L),1.4)*(.85+.15*Math.sin(b.t*40));b.pts.material.size=3.6*(1-L*.4);fl=Math.max(fl,Math.max(0,1-b.t*2.2));if(L>=1){b.phase=0;b.pts.visible=false}}}
  flash.intensity+=(fl*900-flash.intensity)*Math.min(1,dt*12)}

 /* ═══ 2. 증권거래소 앞 크리스마스 트리 (겨울) ═══ */
 const TREE={R:65,F:138,r:3.3};
 const tree=new T.Group();tree.position.copy(W(TREE.R,TREE.F,YC));tree.visible=false;g.add(tree);
 add(new T.CylinderGeometry(.55,.7,3,10),SM('#5a3b26'),0,1.5,0,tree);add(new T.CylinderGeometry(1.3,1.5,.8,16),SM('#6b4a36',{roughness:.8}),0,.4,0,tree);for(const [x,z,c,s] of [[1.9,.6,'#c8463c',.8],[-1.7,1.2,'#2f6db5',.7],[.4,-2,'#e9c46a',.9],[-1.1,-1.6,'#3f8a5a',.6]]){add(new T.BoxGeometry(s,s*.8,s),SM(c,{roughness:.6}),x,s*.4,z,tree);add(new T.BoxGeometry(s+.02,s*.8+.02,.12),SM('#fff6d8'),x,s*.4,z,tree,false)}
 const green=SM('#1f4a2c',{roughness:.9}),lay=[[3.2,6.5,3.8],[2.7,5.6,7.6],[2.2,4.8,11],[1.7,4,14],[1.15,3.2,16.6],[.65,2.4,18.8]];
 for(const [r,h,y] of lay){const c=add(new T.ConeGeometry(r,h,14),green,0,y,0,tree);c.rotation.y=y}
 const star=add(new T.OctahedronGeometry(.75,0),new T.MeshStandardMaterial({color:'#ffe08a',emissive:'#ffc840',emissiveIntensity:1.4,metalness:.4,roughness:.3}),0,20.6,0,tree,false);star.scale.set(1,1.3,.45);
 const BULB=190,bulbs=new T.InstancedMesh(new T.SphereGeometry(.13,8,6),new T.MeshBasicMaterial({color:'#ffffff'}),BULB),BC=['#ff5a5f','#ffd36b','#7fd4ff','#8dffb0','#ff9ad5','#fff6d8'].map(c=>new T.Color(c)),bc=[];
 {const m=new T.Matrix4();for(let i=0;i<BULB;i++){const t=i/BULB,y=2.6+t*16.4,r=3.1*(1-t)*1.02+.2,a=t*Math.PI*2*9.5;m.makeTranslation(Math.cos(a)*r,y,Math.sin(a)*r);bulbs.setMatrixAt(i,m);bc.push(BC[i%BC.length]);bulbs.setColorAt(i,BC[i%BC.length])}}
 tree.add(bulbs);const treeLight=new T.PointLight('#ffd9a0',0,26,1.6);treeLight.position.set(0,8,0);tree.add(treeLight);
 let twT=0;const tmpC=new T.Color();
 function updateTree(dt,E,time){const on=E.seasonIndex===3;tree.visible=on;if(!on)return;const lit=Math.max(.25,Math.min(1,E.dark*1.4+E.dusk*.6));treeLight.intensity=lit*60*(E.dark>.2?1:.2);star.material.emissiveIntensity=.6+lit*2.4;
  if((twT-=dt)<=0){twT=.18;for(let i=0;i<BULB;i++){const k=.35+.65*lit*(.55+.45*Math.sin(time*3+i*1.7));tmpC.copy(bc[i]).multiplyScalar(k);bulbs.setColorAt(i,tmpC)}bulbs.instanceColor.needsUpdate=true}}

 /* ═══ 3. 간식 카트 ═══ */
 const stripe=(a,b)=>{const t=tex(256,32,(x,w,h)=>{for(let i=0;i<8;i++){x.fillStyle=i%2?a:b;x.fillRect(i*w/8,0,w/8,h)}});return t};
 const sign=(txt,bg,fg)=>tex(256,64,(x,w,h)=>{x.fillStyle=bg;x.fillRect(0,0,w,h);x.fillStyle=fg;x.font='800 34px Outfit,Noto Sans KR,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(txt,w/2,h/2+2)});
 const steel=SM('#c9ced3',{metalness:.7,roughness:.35}),tire=SM('#26282b');
 const CARTS=[{id:'hotdog',R:30,F:-46,ry:.3,kinds:['hotdog'],sign:['HOT DOGS','#c8463c','#fff6d8'],umb:['#c8463c','#fff6d8'],steam:true},
  {id:'pretzel',R:24,F:5,ry:-1.2,kinds:['pretzel'],sign:['PRETZELS','#2f6db5','#ffe08a'],umb:['#2f6db5','#ffe08a'],steam:true},
  {id:'treats',R:735,F:505,ry:2.2,kinds:['icecream','nuts'],sign:['ICE CREAM','#f19ab5','#ffffff'],sign2:['NUTS 4 NUTS','#7a4a2a','#ffe08a'],umb:['#f19ab5','#ffffff'],steam:false}];
 const NAMES={halal:['🍗','치킨 오버 라이스','노란 밥 위에 치킨 · 하얀 소스 듬뿍, 빨간 소스는 살짝!'],hotdog:['🌭','뉴욕 핫도그','머스터드 듬뿍! 한 입 크게 먹어요'],pretzel:['🥨','소금 프레첼','따끈하고 쫄깃한 뉴욕 길거리 프레첼'],icecream:['🍦','소프트 아이스크림','강바람 맞으며 먹는 딸기 아이스크림'],nuts:['🥜','꿀땅콩','달콤한 냄새가 거리를 가득 채워요']};
 const steamTex=glow;
 function mkCart(c,par){const cg=new T.Group();cg.position.copy(W(c.R,c.F,YC+.2));cg.rotation.y=c.ry;par.add(cg);c.g=cg;
  add(new T.BoxGeometry(2.6,1.1,1.25),steel,0,1.05,0,cg);add(new T.BoxGeometry(2.7,.08,1.35),SM('#9aa1a7',{metalness:.7,roughness:.3}),0,1.64,0,cg);
  c.signMat=new T.MeshBasicMaterial({map:sign(...c.sign)});c.signMat2=c.sign2?new T.MeshBasicMaterial({map:sign(...c.sign2)}):null;
  for(const s of [-1,1]){const p=add(new T.PlaneGeometry(2.3,.55),c.signMat,0,1.15,s*.63,cg,false);if(s<0)p.rotation.y=Math.PI;(c.signs||(c.signs=[])).push(p)}
  for(const [x,z] of [[-.85,.64],[-.85,-.64]]){const w=add(new T.CylinderGeometry(.42,.42,.12,16),tire,x,.45,z,cg);w.rotation.x=Math.PI/2}
  add(new T.BoxGeometry(.12,.5,.12),steel,1.05,.25,0,cg);add(new T.CylinderGeometry(.04,.04,2.4,8),steel,.2,2.85,0,cg);
  const um=add(new T.ConeGeometry(1.95,.75,16,1,true),new T.MeshStandardMaterial({map:stripe(...c.umb),side:T.DoubleSide,roughness:.8}),.2,4.15,0,cg);um.castShadow=true;
  for(let k=0;k<3;k++)add(new T.CylinderGeometry(.18,.18,.22,12),SM(['#e7d3a8','#d9a066','#f4f0e6'][k],{roughness:.6}),-.7+k*.45,1.8,.15,cg);
  if(c.steam){const N=24,pos=new Float32Array(N*3),geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));const pts=new T.Points(geo,new T.PointsMaterial({map:steamTex,size:.9,color:'#ffffff',transparent:true,opacity:.28,depthWrite:false}));pts.frustumCulled=false;cg.add(pts);c.steamPts={pts,pos,N}}}
 for(const c of CARTS)mkCart(c,g);
 // 다른 동네(타임스스퀘어)에 놓는 카트: 그 동네 묶음(par)에 넣어 함께 숨고 보인다
 function addCart(c,par){CARTS.push(c);mkCart(c,par);return c}
 function cartKind(c,E){if(c.id!=='treats')return c.kinds[0];return E&&E.seasonIndex>=2?'nuts':'icecream'}
 function updateCarts(time,E){for(const c of CARTS){if(c.signMat2){const nuts=cartKind(c,E)==='nuts';for(const p of c.signs)p.material=nuts?c.signMat2:c.signMat}
  if(c.steamPts){const s=c.steamPts;for(let i=0;i<s.N;i++){const f=((time*.35+i/s.N)%1);s.pos[i*3]=-.4+Math.sin(i*7.3+time)*.25*f;s.pos[i*3+1]=1.9+f*2.2;s.pos[i*3+2]=.1+Math.cos(i*3.1+time*.8)*.25*f}s.pts.geometry.attributes.position.needsUpdate=true;s.pts.material.opacity=.32*(E&&E.rain>.3?.4:1)}}}
 // 손에 드는 간식(주인공 손 그룹 안, 마을 크기 단위)
 function snack(kind){const s=new T.Group(),M=c=>SM(c,{roughness:.6});
  if(kind==='hotdog'){const bun=add(new T.CapsuleGeometry(.075,.32,4,10),M('#d9a066'),0,0,0,s,false);bun.rotation.z=Math.PI/2;const sau=add(new T.CapsuleGeometry(.05,.4,4,8),M('#a2412e'),0,.05,0,s,false);sau.rotation.z=Math.PI/2;const mu=add(new T.CylinderGeometry(.012,.012,.34,5),M('#f2c230'),0,.1,0,s,false);mu.rotation.z=Math.PI/2}
  else if(kind==='pretzel'){add(new T.TorusGeometry(.13,.04,8,18),M('#9a5a2b'),0,.05,0,s,false);const x=add(new T.BoxGeometry(.24,.05,.05),M('#9a5a2b'),0,.05,0,s,false);x.rotation.z=.6;for(let i=0;i<6;i++)add(new T.BoxGeometry(.02,.02,.02),M('#ffffff'),Math.cos(i)*.12,.05+Math.sin(i)*.12,.04,s,false)}
  else if(kind==='icecream'){const c=add(new T.ConeGeometry(.08,.24,10),M('#d9a066'),0,.0,0,s,false);c.rotation.x=Math.PI;add(new T.SphereGeometry(.1,12,10),M('#f6b3c8'),0,.15,0,s,false);add(new T.SphereGeometry(.03,6,6),M('#c8463c'),0,.26,0,s,false)}
  else if(kind==='halal'){add(new T.BoxGeometry(.34,.07,.26),SM('#d6dade',{metalness:.85,roughness:.3}),0,0,0,s,false);add(new T.BoxGeometry(.3,.03,.22),M('#f2c74e'),0,.045,0,s,false);
   for(let i=0;i<7;i++)add(new T.BoxGeometry(.06,.035,.05),M('#9b5a2e'),-.1+(i%4)*.065,.07,-.05+Math.floor(i/4)*.09,s,false);
   for(let i=0;i<3;i++){const l=add(new T.BoxGeometry(.26,.012,.02),M('#fbfbf6'),0,.09,-.06+i*.06,s,false);l.rotation.y=.25*(i-1)}for(let i=0;i<4;i++)add(new T.SphereGeometry(.014,5,4),M('#d0302a'),-.09+i*.06,.095,.03*(i%2),s,false)}
  else{add(new T.CylinderGeometry(.09,.05,.2,10),M('#f4f0e6'),0,.02,0,s,false);for(let i=0;i<5;i++)add(new T.SphereGeometry(.035,6,6),M('#a8682f'),Math.cos(i*1.3)*.04,.13+(i%2)*.03,Math.sin(i*1.3)*.04,s,false)}
  return s}
 function blocked(R,F){for(const c of CARTS)if((R-c.R)**2+(F-c.F)**2<2.1**2)return true;if(tree.visible&&(R-TREE.R)**2+(F-TREE.F)**2<TREE.r**2)return true;return false}
 function update(time,dt,E,cam){FW.cam=cam;updateFw(dt,E);updateTree(dt,E,time);updateCarts(time,E)}
 return {group:g,carts:CARTS,NAMES,cartKind,blocked,update,updateCarts,addCart,snack,fireworks:FW,tree,TREE}}
root.NYC_EXTRAS={build};
})(window);
