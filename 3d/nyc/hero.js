/* 뉴욕 거리 산책의 주인공 — DentPhoto 마을(3d/index.html)의 동글동글 2.5등신 주인공 · 1인용 자전거 · 강아지를 그대로 옮겨 온 것.
   마을 원본(#villageSrc 의 buildChibi · chibiProps · animateChibi · poseRide, 3d/src/bike.part.js)과 같은 모양 · 같은 움직임이다.
   NYC_HERO.make({T,scene,owner:'me'|'wife',K}) → {root,J,bike,dog,dress(o),walk(phase,amt,t,dt),ride(crank,t,dt),jump(),wave(),hand(side)}
   K: 마을 크기에 곱하는 배율(뉴욕 1u ≈ 0.8m 에 맞춤). */
'use strict';
(function(root){
function make({T,scene,owner='me',K=.78}){
 const mc=new Map(),mat=c=>{if(c&&c.isMaterial)return c;if(!mc.has(c))mc.set(c,new T.MeshStandardMaterial({color:c,roughness:.85}));return mc.get(c)};
 const mesh=(geo,c,p)=>{const m=new T.Mesh(geo,mat(c));m.castShadow=true;m.receiveShadow=true;p.add(m);return m};
 const box=(p,x,y,z,w,h,d,c)=>{const m=mesh(new T.BoxGeometry(w,h,d),c,p);m.position.set(x,y,z);return m};
 const cyl=(p,x,y,z,rt,rb,h,c,n=16)=>{const m=mesh(new T.CylinderGeometry(rt,rb,h,n),c,p);m.position.set(x,y,z);return m};
 const sphere=(p,x,y,z,r,c,d=1)=>{const m=mesh(new T.IcosahedronGeometry(r,d),c,p);m.position.set(x,y,z);return m};
 const beam=(p,a,b,r,c)=>{const v1=new T.Vector3(...a),v2=new T.Vector3(...b),v=v2.clone().sub(v1);const m=cyl(p,0,0,0,r,r,v.length(),c,8);m.position.copy(v1.add(v2).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m};

 /* ── 주인공 — 남자: 바보털 · 둥근 안경 · 하늘색 후드 · 노란 가방 / 여자: 똥머리 · 리본 · 옆머리 · 살구색 윗옷 · 분홍 치마 · 민트 가방 */
 const SKIN='#f6d3b5',CH={me:{top:'#86bfe0',pants:'#4f6d8c',shoe:'#fbf6e8',sole:'#6d8fa8',pack:'#f2c14e',hair:'#4b3a2f',hat:'#e06c6c',beanie:'#e0625d',scarf:'#e24b4b',beret:'#8e4a4a',umb:'#7fb2d9'},wife:{top:'#f7c59f',skirt:'#ef8f9a',pants:'#fff1e4',shoe:'#e56b6f',sole:'#b8474f',pack:'#8fd1b5',hair:'#6b4a36',ribbon:'#f06c8f',hat:'#86bfe0',beanie:'#f3a6c0',scarf:'#7fc7a8',beret:'#c7684f',umb:'#f4a3b4'}};
 const hiM=new T.MeshBasicMaterial({color:'#ffffff'}),blushM=new T.MeshBasicMaterial({color:'#f7a3a0',transparent:true,opacity:.72,depthWrite:false});
 const f=owner==='wife',C=CH[f?'wife':'me'],rootG=new T.Group(),J={},eyes=[],top=[];
 const cap=(par,r,len,y,c)=>{const m=mesh(new T.CapsuleGeometry(r,len,4,12),c,par);m.position.y=y;return m},ball=(par,x,y,z,r,c,sx=1,sy=1,sz=1,d=2)=>{const m=sphere(par,x,y,z,r,c,d);m.scale.set(sx,sy,sz);return m};
 const hips=new T.Group();hips.position.y=.56;rootG.add(hips);J.hips=hips;
 for(const [side,sx] of [['L',-1],['R',1]]){const th=new T.Group();th.position.set(sx*.13,-.02,0);hips.add(th);cap(th,.1,.1,-.12,C.pants);const kn=new T.Group();kn.position.y=-.24;th.add(kn);cap(kn,.09,.08,-.1,C.pants);ball(kn,0,-.25,.05,.13,C.shoe,1,.62,1.35);const so=cyl(kn,0,-.3,.05,.12,.12,.035,C.sole,14);so.scale.z=1.3;J['thigh'+side]=th;J['knee'+side]=kn}
 const spine=new T.Group();spine.position.y=.06;hips.add(spine);J.spine=spine;ball(spine,0,.3,0,.34,C.top,1,1.08,.9);
 if(f)cyl(spine,0,.03,0,.3,.47,.34,C.skirt,20);else{box(spine,0,.2,.29,.3,.14,.05,'#6fa3c4');ball(spine,0,.62,-.19,.2,C.top,1.3,.7,.8,1);for(const sx of [-1,1])cyl(spine,sx*.06,.5,.3,.012,.012,.16,'#fbf6e8',5)}
 box(spine,0,.34,-.34,.36,.4,.2,C.pack);ball(spine,0,.52,-.34,.19,C.pack,1,.4,.62,1);box(spine,0,.28,-.45,.2,.12,.04,'#fff6d8');for(const sx of [-1,1])box(spine,sx*.17,.44,.29,.05,.3,.035,C.pack);
 const head=new T.Group();head.position.y=.72;spine.add(head);J.head=head;sphere(head,0,.44,0,.5,SKIN,3);
 for(const sx of [-1,1]){eyes.push(ball(head,sx*.18,.4,.44,.085,'#2e2a2a',1,1.35,.6));for(const [dx,dy,r] of [[-.03,.055,.03],[.025,-.03,.015]]){const h=new T.Mesh(new T.SphereGeometry(r,8,6),hiM);h.position.set(sx*.18+dx,.4+dy,.5);head.add(h);eyes.push(h)}const b=new T.Mesh(new T.SphereGeometry(.075,12,8),blushM);b.position.set(sx*.3,.28,.39);b.scale.set(1,.55,.35);head.add(b)}
 const mouth=mesh(new T.TorusGeometry(.05,.013,6,14,Math.PI),'#8a3b3b',head);mouth.position.set(0,.27,.476);mouth.rotation.z=Math.PI;
 const capM=mesh(new T.SphereGeometry(.535,24,14,0,Math.PI*2,0,Math.PI*.52),C.hair,head);capM.position.set(0,.47,-.03);capM.rotation.x=-.38;
 for(const [x,y,z,r] of [[-.2,.73,.33,.17],[0,.78,.36,.18],[.2,.73,.33,.17]])ball(head,x,y,z,r,C.hair,1.15,.55,.6,1);
 if(f){top.push(ball(head,0,.98,-.14,.21,C.hair));const bow=new T.Group();bow.position.set(-.36,.84,.16);bow.rotation.set(0,-.6,.25);head.add(bow);top.push(bow);sphere(bow,0,0,0,.055,C.ribbon,1);for(const sx of [-1,1]){const w=mesh(new T.ConeGeometry(.09,.19,10),C.ribbon,bow);w.position.x=sx*.11;w.rotation.z=sx*Math.PI/2}for(const sx of [-1,1]){const l=cap(head,.1,.24,.24,C.hair);l.position.x=sx*.47;l.position.z=-.06}}
 else{const ah=mesh(new T.TorusGeometry(.13,.028,6,14,Math.PI*1.1),C.hair,head);ah.position.set(.02,1.02,.02);ah.rotation.set(0,Math.PI/2,.3);top.push(ah);for(const sx of [-1,1]){const g=mesh(new T.TorusGeometry(.12,.016,8,24),'#3a3a3a',head);g.position.set(sx*.18,.4,.5)}box(head,0,.42,.51,.12,.02,.02,'#3a3a3a')}
 for(const [side,sx] of [['L',-1],['R',1]]){const sh=new T.Group();sh.position.set(sx*.3,.48,0);spine.add(sh);cap(sh,.085,.06,-.08,C.top);const el=new T.Group();el.position.y=-.16;sh.add(el);cap(el,.078,.04,-.06,C.top);sphere(el,0,-.16,0,.1,SKIN,2);const hand=new T.Group();hand.position.y=-.16;el.add(hand);J['shoulder'+side]=sh;J['elbow'+side]=el;J['hand'+side]=hand}
 const hat=new T.Group();hat.position.y=.44;head.add(hat);const neck=new T.Group();neck.position.y=.66;spine.add(neck);
 rootG.scale.setScalar(1.2*K);scene.add(rootG);
 const shadow=new T.Mesh(new T.CircleGeometry(.7*K,20),new T.MeshBasicMaterial({color:'#2c3a40',transparent:true,opacity:.18,depthWrite:false}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);

 /* ── 소품 — 봄 꽃핀 · 여름 밀짚모자 · 가을 베레모 · 겨울 털모자와 목도리, 비 오면 우산, 마을 다이아몬드 보상 모자 · 왕관 */
 const P={},grp=par=>{const g=new T.Group();g.visible=false;par.add(g);return g};
 const gemGeo=new T.OctahedronGeometry(.62,0),gemMat=new T.MeshStandardMaterial({color:'#d8f6ff',emissive:'#5cd3ff',emissiveIntensity:1.25,metalness:.3,roughness:.06,flatShading:true});
 P.straw=grp(hat);P.straw.position.y=.28;P.straw.rotation.x=-.12;cyl(P.straw,0,-.02,0,.74,.74,.04,'#ecd28f',28);cyl(P.straw,0,.14,0,.38,.44,.32,'#ecd28f',20);cyl(P.straw,0,.04,0,.45,.45,.09,C.hat,20);
 P.beanie=grp(hat);P.beanie.position.y=.12;mesh(new T.SphereGeometry(.56,22,12,0,Math.PI*2,0,Math.PI*.5),C.beanie,P.beanie);{const r=mesh(new T.TorusGeometry(.53,.08,8,28),'#fbf6e8',P.beanie);r.rotation.x=Math.PI/2;r.position.y=.02}sphere(P.beanie,0,.62,0,.13,'#fbf6e8',1);
 P.beret=grp(hat);P.beret.position.set(.06,.47,-.02);P.beret.rotation.z=-.25;{const b=sphere(P.beret,0,0,0,.52,C.beret,2);b.scale.set(1,.32,1)}sphere(P.beret,0,.17,0,.05,C.beret,1);
 P.flower=grp(hat);P.flower.position.set(.34,.34,.26);for(let k=0;k<5;k++){const a=k/5*Math.PI*2;sphere(P.flower,Math.cos(a)*.07,Math.sin(a)*.07,0,.055,'#f7b6c8',1)}sphere(P.flower,0,0,.02,.045,'#f6d77a',1);
 P.explorer=grp(hat);P.explorer.position.y=.3;cyl(P.explorer,0,-.02,0,.68,.68,.04,'#c9a36b',26);cyl(P.explorer,0,.16,0,.36,.42,.34,'#d8b884',20);cyl(P.explorer,0,.06,0,.43,.43,.08,'#6b5a45',20);
 P.crownF=grp(hat);P.crownF.position.y=.34;{const r=mesh(new T.TorusGeometry(.44,.04,6,28),'#7fae6b',P.crownF);r.rotation.x=Math.PI/2}for(let k=0;k<9;k++){const a=k/9*Math.PI*2;sphere(P.crownF,Math.cos(a)*.44,.03,Math.sin(a)*.44,.075,['#f7b6c8','#fbf6e8','#f6d77a','#c9a6e4'][k%4],1)}
 P.crownD=grp(hat);P.crownD.position.y=.52;cyl(P.crownD,0,0,0,.3,.3,.14,'#e9c46a',20);for(let k=0;k<5;k++){const a=k/5*Math.PI*2,sp=mesh(new T.ConeGeometry(.07,.2,6),'#e9c46a',P.crownD);sp.position.set(Math.cos(a)*.27,.15,Math.sin(a)*.27);const g=new T.Mesh(gemGeo,gemMat);g.scale.setScalar(.14);g.position.set(Math.cos(a)*.27,.3,Math.sin(a)*.27);P.crownD.add(g)}{const g=new T.Mesh(gemGeo,gemMat);g.scale.setScalar(.2);g.position.set(0,.04,.31);P.crownD.add(g)}
 P.scarf=grp(neck);{const s=mesh(new T.TorusGeometry(.24,.085,8,20),C.scarf,P.scarf);s.rotation.x=Math.PI/2}box(P.scarf,.12,-.16,.25,.12,.28,.06,C.scarf);
 P.umb=grp(spine);const umbSide=f?'R':'L';P.umb.position.set((f?1:-1)*.42,1.05,.12);{const can=new T.Mesh(new T.ConeGeometry(1,.45,10,1,true),new T.MeshStandardMaterial({color:C.umb,side:T.DoubleSide,roughness:.6}));can.position.y=.95;can.castShadow=true;P.umb.add(can)}cyl(P.umb,0,.4,0,.02,.02,1.3,'#6b5a45',6);sphere(P.umb,0,1.22,0,.04,'#6b5a45',1);
 const handSide=umbSide==='R'?'L':'R';   // 간식은 우산 반대 손에
 const st={look:0,lookT:1,target:0,wave:0,jump:0,blink:1+Math.random()*3,idle:0,hold:false};
 function dress({season,wet,riding,gems=0,wear={}}){const on=n=>gems>=n&&wear['wear'+n]!==false;
  const hk=on(10)?'crownD':on(3)?(f?'crownF':'explorer'):season==='summer'?'straw':season==='winter'?'beanie':season==='autumn'?'beret':null;
  ['straw','beanie','beret','explorer','crownF','crownD'].forEach(k=>{P[k].visible=k===hk});P.flower.visible=season==='spring'&&!hk;P.scarf.visible=season==='winter';P.umb.visible=!!wet&&!riding;
  const hide=!!hk&&hk!=='crownF';top.forEach(t=>{t.visible=!hide});dog.g.visible=on(6)}

 /* ── 걷기 — 짧은 팔다리를 크게 흔드는 종종걸음, 통통 튀고 갸우뚱. 가만히 있으면 숨 쉬고 두리번거린다 */
 function blink(dt){st.blink-=dt;const shut=st.blink<0;if(st.blink<-.13)st.blink=1.8+Math.random()*3.6;eyes.forEach((e,k)=>{if(k%3===0)e.scale.y=shut?.14:1.35;else e.visible=!shut})}
 function walk(p,a,t,dt){const s=Math.sin(p),co=Math.cos(p),br=Math.sin(t*2.3);
  J.thighL.rotation.set(-s*.8*a,0,0);J.thighR.rotation.set(s*.8*a,0,0);J.kneeL.rotation.set(a*.8*Math.max(0,co),0,0);J.kneeR.rotation.set(a*.8*Math.max(0,-co),0,0);
  J.shoulderL.rotation.set(s*.95*a,0,-.22-.04*br*(1-a));J.shoulderR.rotation.set(-s*.95*a,0,.22+.04*br*(1-a));J.elbowL.rotation.set(-.35*a,0,0);J.elbowR.rotation.set(-.35*a,0,0);
  st.jump=Math.max(0,st.jump-dt);const jy=st.jump>0?Math.sin(Math.PI*(1-st.jump/.75))*.6:0;
  J.hips.position.y=.56+Math.abs(s)*.09*a+br*.006*(1-a)+jy;J.hips.rotation.set(0,-s*.12*a,0);J.spine.rotation.set(.07*a,s*.1*a,s*.09*a);
  if(a<.15){st.idle+=dt;st.lookT-=dt;if(st.lookT<=0){st.lookT=1.6+Math.random()*2.8;st.target=st.idle<1.5?0:Math.random()<.6?(Math.random()-.5)*1.2:0}}else{st.idle=0;st.target=0}
  st.look+=(st.target-st.look)*Math.min(1,dt*4);J.head.rotation.set(-.05*a,st.look-s*.08*a,-s*.1*a+Math.sin(t*.8)*.05*(1-a));
  if(st.hold&&!(st.wave>0)){const sx=handSide==='R'?1:-1;J['shoulder'+handSide].rotation.set(-1.05,0,sx*.18);J['elbow'+handSide].rotation.set(-1.15,0,0)}
  if(st.wave>0){st.wave-=dt;const k=f?'L':'R',sx=k==='R'?1:-1;J['shoulder'+k].rotation.set(0,0,sx*2.5);J['elbow'+k].rotation.set(0,0,sx*(.3+Math.sin(t*14)*.35))}
  if(st.jump>0){J.shoulderL.rotation.set(0,0,-2.5);J.shoulderR.rotation.set(0,0,2.5)}
  if(P.umb.visible){const sx=umbSide==='R'?1:-1;J['shoulder'+umbSide].rotation.set(0,0,sx*2.35);J['elbow'+umbSide].rotation.set(0,0,sx*.55)}
  blink(dt)}
 function ride(cr,t,dt){const s=Math.sin(cr);J.hips.position.y=.56;J.hips.rotation.set(0,0,0);J.spine.rotation.set(.28,0,0);J.head.rotation.set(-.22,Math.sin(t*.7)*.12,0);J.thighL.rotation.set(-1.05-.35*s,0,0);J.thighR.rotation.set(-1.05+.35*s,0,0);J.kneeL.rotation.set(1.1+.35*s,0,0);J.kneeR.rotation.set(1.1-.35*s,0,0);J.shoulderL.rotation.set(-1.15,0,-.12);J.shoulderR.rotation.set(-1.15,0,.12);J.elbowL.rotation.set(-.35,0,0);J.elbowR.rotation.set(-.35,0,0);st.jump=0;blink(dt)}

 /* ── 1인용 자전거 — 바퀴 둘, 안장 하나, 페달 하나, 앞 바구니 (3d/src/bike.part.js) */
 const bike=(()=>{const g=new T.Group(),fc='#5fb8a0',dk='#394a4f',mt='#8a9396',wheels=[],cranks=[];
  for(const z of [.86,-.86]){const w=new T.Group();w.position.set(0,.47,z);g.add(w);{const t=mesh(new T.TorusGeometry(.42,.06,8,26),dk,w);t.rotation.y=Math.PI/2}for(let k=0;k<3;k++){const s=box(w,0,0,0,.02,.8,.02,'#cfd8d6');s.rotation.x=k*Math.PI/3}sphere(w,0,0,0,.07,'#cfd8d6',1);wheels.push(w)}
  const HT=[0,1.1,.6],ST=[0,1.06,-.2],BB=[0,.42,.1];
  beam(g,[0,.47,.86],HT,.04,fc);beam(g,HT,ST,.05,fc);beam(g,HT,BB,.05,fc);beam(g,ST,BB,.045,fc);beam(g,BB,[0,.47,-.86],.035,fc);beam(g,ST,[0,.47,-.86],.035,fc);
  box(g,0,1.18,-.22,.24,.07,.34,'#6b4a36');beam(g,ST,[0,1.15,-.22],.03,mt);
  beam(g,HT,[0,1.32,.52],.03,mt);beam(g,[-.36,1.32,.52],[.36,1.32,.52],.03,mt);for(const x of [-.36,.36])beam(g,[x*1.05,1.32,.52],[x*1.25,1.32,.52],.045,'#6b4a36');
  box(g,0,1.08,1.02,.42,.28,.32,'#c9a372');[['#f2a7b8',-.1],['#f6d77a',.08],['#fbf6e8',0]].forEach(([c,x],k)=>sphere(g,x,1.27,1.02+(k-1)*.07,.08,c,1));
  {const cr=new T.Group();cr.position.set(...BB);g.add(cr);for(const s of [-1,1]){box(cr,s*.1,s*.1,0,.03,.22,.04,mt);box(cr,s*.2,s*.2,0,.14,.04,.1,dk)}cranks.push(cr)}
  g.scale.setScalar(K);g.visible=false;scene.add(g);return {g,wheels,cranks,crank:0}})();

 /* ── 강아지 — 마을 다이아몬드 6개 보상(마을에서 함께 다니는 그 강아지) */
 const dog=(()=>{const g=new T.Group(),c1='#e3a25a',w='#fbf1e2',dk='#3b2a22',legs=[];const body=sphere(g,0,.55,0,.34,c1,2);body.scale.set(.85,.8,1.35);const belly=sphere(g,0,.47,.05,.26,w,1);belly.scale.set(.8,.7,1.2);
  const head=new T.Group();head.position.set(0,.95,.42);g.add(head);sphere(head,0,0,0,.3,c1,2);{const s=sphere(head,0,-.07,.24,.15,w,2);s.scale.set(1.1,.8,1)}sphere(head,0,-.02,.37,.05,dk,1);for(const sx of [-1,1]){const e=mesh(new T.ConeGeometry(.1,.2,8),c1,head);e.position.set(sx*.17,.26,-.02);e.rotation.z=-sx*.35;sphere(head,sx*.12,.07,.25,.045,dk,1)}
  for(const [x,z] of [[-.17,.25],[.17,.25],[-.17,-.25],[.17,-.25]]){const l=new T.Group();l.position.set(x,.36,z);g.add(l);cyl(l,0,-.16,0,.07,.07,.32,c1,8);sphere(l,0,-.32,.02,.08,w,1);legs.push(l)}
  const tail=new T.Group();tail.position.set(0,.72,-.42);g.add(tail);{const t=mesh(new T.TorusGeometry(.14,.05,6,12,Math.PI*1.4),c1,tail);t.rotation.y=Math.PI/2}
  g.scale.setScalar(1.15*K);g.visible=false;scene.add(g);return {g,head,legs,tail,x:0,z:0,y:0,h:0,ph:0,still:0,hop:0,init:false}})();
 // 주인공을 따라온다(x · z 는 월드 좌표). ground(x,z,y) → 그 자리 땅 높이(없으면 null)
 function updateDog(dt,t,px,pz,ang,ridingNow,ground){if(!dog.g.visible)return;const back=(ridingNow?3:2.1)*K/.78,side=1.5*K/.78,tx=px-Math.sin(ang)*back-Math.cos(ang)*side,tz=pz-Math.cos(ang)*back+Math.sin(ang)*side,dx=tx-dog.x,dz=tz-dog.z,d=Math.hypot(dx,dz);let step=0;
  if(!dog.init||d>45){dog.x=tx;dog.z=tz;dog.init=true}else if(d>.35){step=Math.min(d,dt*Math.max(2.2,Math.min(30,d*3.2)));dog.x+=dx/d*step;dog.z+=dz/d*step;let dh=Math.atan2(dx,dz)-dog.h;dh=Math.atan2(Math.sin(dh),Math.cos(dh));dog.h+=dh*Math.min(1,dt*8)}
  const gy=ground(dog.x,dog.z,dog.y);if(gy!==null)dog.y=gy;if(dog.hop>0)dog.hop=Math.max(0,dog.hop-dt);
  const moving=step>dt*.6;dog.still=moving?0:dog.still+dt;dog.ph+=step*7;dog.g.position.set(dog.x,dog.y+.02+(dog.hop>0?Math.sin(Math.PI*(1-dog.hop/.5))*.55*K:0),dog.z);dog.g.rotation.y=dog.h;const sw=moving?Math.sin(dog.ph)*.7:0;dog.legs[0].rotation.x=sw;dog.legs[3].rotation.x=sw;dog.legs[1].rotation.x=-sw;dog.legs[2].rotation.x=-sw;dog.tail.rotation.y=Math.sin(t*(moving?10:16))*.5;const tilt=Math.min(1,dog.still/1.2);dog.head.rotation.z=Math.sin(t*.9)*.28*tilt;dog.head.position.y=.95+(moving?Math.abs(Math.sin(dog.ph))*.05:0)}

 return {root:rootG,J,st,props:P,shadow,bike,dog,female:f,owner,K,handSide,dress,walk,ride,updateDog,
  jump(){st.jump=.75;dog.hop=.5},wave(){st.wave=1.6},hand(){return J['hand'+handSide]}}}
root.NYC_HERO={make};
})(window);
