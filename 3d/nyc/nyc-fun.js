/* 뉴욕 거리 산책(3d/nyc)의 탈것 · 공연 — 좌표는 walk-city.js 와 같다(R 동쪽 · F 북쪽 · 월드 x = R, z = -F).
   - 스태튼 아일랜드 페리: 배터리 파크 동쪽 선착장(PIER)에 주황 페리가 기다린다. 타면 자유의 여신상 바로 앞을 돌아 같은 선착장으로 온다(앞뒤가 같은 배라 돌아올 땐 뒤로 들어온다).
   - 맨해튼 브릿지 지하철: 다리 아래층 선로로 은색 전철이 오가며 덜컹덜컹 지나간다(덤보 워싱턴 스트리트에서 잘 보인다).
   - 덤보 색소폰 버스커: 가까이 가면 재즈가 들리고(마을 소리 설정을 따른다) 동전을 넣을 수 있다.
   - 지하철 입구 3곳: 월스트리트 역(4 · 5) · 요크 스트리트 역(F, 덤보) · 타임스스퀘어-42가 역(N Q R W · 1 2 3 · 7)
   build({T,scene,YC,sound,L,TS}) → {group,ferry,train,busker,stations,walk(R,F),blocked(R,F),update(time,dt,E,me,started)} */
(function(root){
function build({T,scene,YC=3.8,sound,L,TS}){
 const g=new T.Group();g.name='nyc-fun';scene.add(g);
 const W=(R,F,y=0)=>new T.Vector3(R,y,-F);
 const SM=(c,o={})=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:.75},o));
 const add=(geo,mat,x,y,z,p=g,shadow=true)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;p.add(m);return m};
 const tex=(w,h,draw)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t};
 const FONT='"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",Outfit,Arial,sans-serif';
 const glowTex=tex(64,64,x=>{const r=x.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.3,'rgba(255,255,255,.7)');r.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=r;x.fillRect(0,0,64,64)});glowTex.generateMipmaps=false;glowTex.minFilter=T.LinearFilter;   // 작게 보여도 네모가 되지 않게
 const audioOK=()=>sound&&sound.ctx&&!sound.muted;
 function horn(k=1){if(!audioOK())return;const a=sound.ctx,t=a.currentTime,gn=a.createGain(),f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=520;
  gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.2*k,t+.18);gn.gain.setValueAtTime(.2*k,t+1.5);gn.gain.linearRampToValueAtTime(0,t+2.1);f.connect(gn);gn.connect(sound.master);
  for(const fr of [87,130.5]){const o=a.createOscillator();o.type='sawtooth';o.frequency.value=fr;o.connect(f);o.start(t);o.stop(t+2.2)}}
 function clink(){if(!audioOK())return;sound.chime&&sound.chime(2093);setTimeout(()=>sound.chime&&sound.chime(2637),90)}
 const NIGHT=[];   // 밤에 빛나는 재질 [mat, 낮 세기, 밤 세기]

 /* ═══ 1. 스태튼 아일랜드 페리 ═══ */
 const PIER={R0:129,R1:151,F0:-152,F1:-119,y:YC+.12},BOARD={R:140,F:-148.5};let plank=null;
 {const p=new T.Group();g.add(p);const conc=SM('#a29c90',{roughness:.9}),iron=SM('#2f4d3a',{metalness:.5,roughness:.5});
  add(new T.BoxGeometry(PIER.R1-PIER.R0,1.4,PIER.F1-PIER.F0+5),conc,(PIER.R0+PIER.R1)/2,PIER.y-.7,-(PIER.F0+PIER.F1-5)/2,p);
  for(let F=PIER.F0+2;F<-124;F+=6)for(const R of [PIER.R0+1.2,PIER.R1-1.2])add(new T.CylinderGeometry(.55,.6,PIER.y-.8,8),SM('#5d564c'),R,(PIER.y-1.4)/2,-F,p,false);
  const rail=(a,b)=>{const d=a.distanceTo(b),m=add(new T.BoxGeometry(.1,.1,d),iron,(a.x+b.x)/2,a.y,(a.z+b.z)/2,p,false);m.lookAt(b);const n=Math.max(1,Math.round(d/2.4));for(let i=0;i<=n;i++){const q=a.clone().lerp(b,i/n);add(new T.CylinderGeometry(.05,.05,1.05,5),iron,q.x,q.y-.52,q.z,p,false)}};
  const ry=PIER.y+1.05;
  for(const R of [PIER.R0+.25,PIER.R1-.25])rail(W(R,PIER.F1-2,ry),W(R,PIER.F0+.25,ry));
  rail(W(PIER.R0+.25,PIER.F0+.25,ry),W(BOARD.R-2.2,PIER.F0+.25,ry));rail(W(BOARD.R+2.2,PIER.F0+.25,ry),W(PIER.R1-.25,PIER.F0+.25,ry));
  // 들어가는 곳 아치 간판
  for(const R of [PIER.R0+1,PIER.R1-1])add(new T.CylinderGeometry(.22,.26,7.2,10),iron,R,PIER.y+3.6,-(PIER.F1-1.5),p);
  const sg=tex(1024,192,(x,w,h)=>{x.fillStyle='#22675e';x.fillRect(0,0,w,h);x.strokeStyle='#ffe6a8';x.lineWidth=8;x.strokeRect(10,10,w-20,h-20);x.fillStyle='#fffbed';x.textAlign='center';x.textBaseline='middle';x.font=`800 64px ${FONT}`;x.fillText('⛴ STATEN ISLAND FERRY',w/2,h*.4);x.font=`700 36px ${FONT}`;x.fillStyle='#ffe6a8';x.fillText('자유의 여신상 앞을 지나는 무료 페리',w/2,h*.76)});
  for(const s of [0,1]){const m=add(new T.PlaneGeometry(PIER.R1-PIER.R0-1.4,2.8),new T.MeshStandardMaterial({map:sg,roughness:.6}),(PIER.R0+PIER.R1)/2,PIER.y+6.1,-(PIER.F1-1.5)+(s?-.06:.06),p,false);if(s)m.rotation.y=Math.PI}
  add(new T.BoxGeometry(PIER.R1-PIER.R0-1.2,.3,.3),iron,(PIER.R0+PIER.R1)/2,PIER.y+7.6,-(PIER.F1-1.5),p);
  // 건너가는 발판(배가 있을 때)
  plank=add(new T.BoxGeometry(3.8,.18,3.2),SM('#7a6a55',{roughness:.9}),BOARD.R,PIER.y-.02,-(PIER.F0-1.4),p)}
 const FL=68,FWD=18,DY=PIER.y;
 const boat=new T.Group();g.add(boat);
 const orange=SM('#ee7d1f',{roughness:.5}),cream=SM('#f3ecdc',{roughness:.6}),darkM=SM('#26292c',{roughness:.5});
 const hs=new T.Shape();{const hx=FWD/2,hz=FL/2,rr=8;hs.moveTo(-hx,-hz+rr);hs.lineTo(-hx,hz-rr);hs.quadraticCurveTo(-hx,hz,-hx+rr,hz);hs.lineTo(hx-rr,hz);hs.quadraticCurveTo(hx,hz,hx,hz-rr);hs.lineTo(hx,-hz+rr);hs.quadraticCurveTo(hx,-hz,hx-rr,-hz);hs.lineTo(-hx+rr,-hz);hs.quadraticCurveTo(-hx,-hz,-hx,-hz+rr)}
 {const hg=new T.ExtrudeGeometry(hs,{depth:DY+.4,bevelEnabled:false,curveSegments:10});hg.rotateX(-Math.PI/2);hg.translate(0,-.4,0);add(hg,orange,0,0,0,boat);
  const rb=new T.ExtrudeGeometry(hs,{depth:.45,bevelEnabled:false,curveSegments:10});rb.rotateX(-Math.PI/2);const rbm=add(rb,darkM,0,DY-.75,0,boat,false);rbm.scale.set(1.012,1,1.006);
  const dk=new T.ShapeGeometry(hs,10);dk.rotateX(-Math.PI/2);add(dk,SM('#8d918a',{roughness:.85}),0,DY+.01,0,boat,false);
  const band=tex(1024,96,(x,w,h)=>{x.fillStyle='#ee7d1f';x.fillRect(0,0,w,h);x.fillStyle='#fffbed';x.font=`800 54px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText('STATEN ISLAND',w/2,h/2+3)});
  for(const s of [-1,1]){const m=add(new T.PlaneGeometry(36,2.6),new T.MeshStandardMaterial({map:band,roughness:.5}),s*(FWD/2+.03),DY-2.2,0,boat,false);m.rotation.y=s*Math.PI/2}
  const winT=(bg,fr)=>tex(512,64,(x,w,h)=>{x.fillStyle=bg;x.fillRect(0,0,w,h);for(let i=0;i<14;i++){x.fillStyle=fr;x.fillRect(6+i*36.2,14,30,34);x.fillStyle='#1f2a33';x.fillRect(9+i*36.2,17,24,28)}});
  const winE=tex(512,64,(x,w,h)=>{x.fillStyle='#000';x.fillRect(0,0,w,h);for(let i=0;i<14;i++){x.fillStyle='#ffe2a8';x.fillRect(9+i*36.2,17,24,28)}});
  const cab=(w,h,d,y,bg,fr)=>{const t=winT(bg,fr);t.wrapS=T.RepeatWrapping;const side=new T.MeshStandardMaterial({map:t,emissiveMap:winE,emissive:'#ffffff',emissiveIntensity:0,roughness:.55}),tp=SM(bg,{roughness:.6});NIGHT.push([side,0,.9]);return add(new T.BoxGeometry(w,h,d),[side,side,tp,tp,side,side],0,y,0,boat)};
  cab(12.8,3.4,43,DY+1.7,'#ee7d1f','#f3ecdc');cab(11.2,2.9,36,DY+3.4+1.45,'#f3ecdc','#ee7d1f');
  for(const z of [-16,16])cab(6.6,2.3,4.4,DY+6.3+1.15,'#f3ecdc','#2b3a44');
  add(new T.CylinderGeometry(1.35,1.5,4.2,14),orange,0,DY+6.3+2.1,0,boat);add(new T.CylinderGeometry(1.36,1.36,.7,14),darkM,0,DY+6.3+4.2,0,boat,false);
  // 위층 난간 · 구명 튜브
  for(const [w,d] of [[12.8,43]])for(const [x,z,ww,dd] of [[0,d/2,w,.08],[0,-d/2,w,.08],[w/2,0,.08,d],[-w/2,0,.08,d]])add(new T.BoxGeometry(ww,.08,dd),SM('#fffbed'),x,DY+3.4+1,z,boat,false);
  for(const [x,z] of [[6.45,8],[-6.45,-8],[6.45,-12],[-6.45,12]]){const r=add(new T.TorusGeometry(.42,.11,8,18),SM('#ffffff'),x,DY+1.8,z,boat,false);r.rotation.y=Math.PI/2}
  // 갑판 둘레 난간
  const pts=hs.getSpacedPoints(110).map(p=>new T.Vector3(p.x*(1-.5/(FWD/2)),DY+1.05,-p.y*(1-.5/(FL/2))));
  add(new T.TubeGeometry(new T.CatmullRomCurve3(pts,true),220,.055,5,true),SM('#fffbed',{roughness:.5}),0,0,0,boat,false);
  const pg=new T.CylinderGeometry(.04,.04,1.05,5).translate(0,.52,0),pm=new T.InstancedMesh(pg,SM('#fffbed'),56),d=new T.Object3D();for(let i=0;i<56;i++){const q=pts[Math.floor(i*pts.length/56)];d.position.set(q.x,DY,q.z);d.updateMatrix();pm.setMatrixAt(i,d.matrix)}boat.add(pm);
  // 밤 항해등
  for(const [x,c] of [[-9.1,'#ff3b30'],[9.1,'#34c759']]){const m=new T.MeshBasicMaterial({color:c});add(new T.SphereGeometry(.25,8,6),m,x,DY+3.6,0,boat,false)}}
 boat.traverse(o=>{if(o.isMesh)o.userData.ferry=true});
 // 뱃길: 선착장 → 자유의 여신상 동쪽 → 남쪽에서 돌아 → 선착장 (끝점 = 시작점)
 const RP=[[140,-187],[140,-246],[127,-335],[88,-450],[30,-565],[-18,-680],[-28,-795],[22,-888],[108,-878],[152,-760],[170,-565],[166,-392],[140,-262],[140,-187]];
 const curve=new T.CatmullRomCurve3(RP.map(([R,F])=>W(R,F,0)),false,'centripetal'),LEN=curve.getLength();
 const headAt=u=>{const t=curve.getTangentAt(Math.max(0,Math.min(1,u)));return Math.atan2(t.x,t.z)};
 const FS={state:'dock',s:0,v:0,flip:false,t:0,rot:headAt(0),pos:W(140,-187,0),onArrive:null,lib:false,sailT:0};
 const wakeN=60,wakePos=new Float32Array(wakeN*3),wakeGeo=new T.BufferGeometry();wakeGeo.setAttribute('position',new T.BufferAttribute(wakePos,3));
 const wake=new T.Points(wakeGeo,new T.PointsMaterial({map:glowTex,color:'#ffffff',size:3.2,transparent:true,opacity:.55,depthWrite:false}));wake.frustumCulled=false;wake.visible=false;g.add(wake);const wakeAge=new Float32Array(wakeN);let wakeI=0,wakeT=0;
 function ferryPose(){boat.position.set(FS.pos.x,Math.sin(FS.t*.8)*.1,FS.pos.z);boat.rotation.set(0,FS.rot,FS.state==='sail'?Math.sin(FS.t*.55)*.012:0);boat.updateMatrixWorld()}
 ferryPose();
 const inv=new T.Matrix4(),tmp=new T.Vector3();
 const CAB={x:6.55,z:21.6},DECK={x:8.1,z:32.6};
 const ferry={PIER,BOARD,LEN,boat,
  get state(){return FS.state},get progress(){return FS.s/LEN},get nearLiberty(){return FS.lib},
  canBoard(){return FS.state==='dock'},
  board(onArrive){if(FS.state!=='dock')return false;FS.state='board';FS.t=0;FS.s=0;FS.v=0;FS.lib=false;FS.onArrive=onArrive;FS.sailT=0;horn(1);return true},
  // 갑판 좌표(배 기준 x 옆 · z 앞뒤) ↔ 세상
  toWorld(x,z){tmp.set(x,DY+.02,z);boat.localToWorld(tmp);return {R:tmp.x,F:-tmp.z,y:tmp.y}},
  toLocal(R,F,y=DY){inv.copy(boat.matrixWorld).invert();tmp.set(R,y,-F).applyMatrix4(inv);return {x:tmp.x,z:tmp.z}},
  free(x,z){if(Math.abs(x)>DECK.x||Math.abs(z)>DECK.z)return false;const ez=Math.abs(z)-(DECK.z-8);if(ez>0&&Math.abs(x)>DECK.x-ez*.55)return false;return !(Math.abs(x)<CAB.x&&Math.abs(z)<CAB.z)},
  get rot(){return FS.rot},
  pierEnd(){return ferry.toLocal(BOARD.R,BOARD.F-3)}};
 function updateFerry(dt,time,E){FS.t+=dt;plank.visible=FS.state==='dock'||FS.state==='board';
  if(FS.state==='board'){FS.sailT+=dt;if(FS.sailT>2.6){FS.state='sail';FS.sailT=0}}
  else if(FS.state==='sail'){const A=1.6,VM=26,want=Math.min(VM,Math.sqrt(2*A*(FS.s+3)),Math.sqrt(2*A*Math.max(0,LEN-FS.s))+.8);FS.v+=(want-FS.v)*Math.min(1,dt*2);FS.s=Math.min(LEN,FS.s+FS.v*dt);
   const u=FS.s/LEN,p=curve.getPointAt(u);FS.pos.copy(p);FS.rot=headAt(u)+(FS.flip?Math.PI:0);
   const lib=L&&L.LIB?Math.hypot(p.x-L.LIB.R,-p.z-L.LIB.F):1e9;if(!FS.lib&&lib<165)FS.lib=true;
   if(FS.s>=LEN-.05){FS.state='dock';FS.flip=!FS.flip;FS.rot=headAt(0)+(FS.flip?Math.PI:0);FS.pos.copy(curve.getPointAt(1));const cb=FS.onArrive;FS.onArrive=null;horn(.7);cb&&cb()}
   // 배 뒤 하얀 물결
   if((wakeT-=dt)<=0){wakeT=.12;const b=boat.localToWorld(tmp.set(0,.5,0)).clone(),back=new T.Vector3(Math.sin(FS.rot),0,Math.cos(FS.rot)).multiplyScalar(-(FL/2+1)*(FS.flip?-1:1));wakePos.set([b.x+back.x+(Math.random()-.5)*6,.45,b.z+back.z+(Math.random()-.5)*6],wakeI*3);wakeAge[wakeI]=0;wakeI=(wakeI+1)%wakeN}}
  wake.visible=FS.state==='sail';if(wake.visible){for(let i=0;i<wakeN;i++)wakeAge[i]+=dt;wake.material.opacity=.5;wakeGeo.attributes.position.needsUpdate=true}
  ferryPose()}

 /* ═══ 2. 맨해튼 브릿지 아래층을 지나는 지하철 ═══ */
 const MB=L.MB,train={g:new T.Group(),cars:[],t:0,dir:1,wait:3,speed:24,on:false};
 {const [bx,bf]=MB.B,[dx,df]=MB.dir;train.g.position.copy(W(bx,bf,0));train.g.rotation.y=-Math.atan2(-df,dx);g.add(train.g);
  const steel=SM('#c5c9cd',{metalness:.75,roughness:.32}),winM=new T.MeshStandardMaterial({color:'#24303a',emissive:'#ffe0a0',emissiveIntensity:0,roughness:.3}),stripe=SM('#ff6319',{roughness:.5});NIGHT.push([winM,0,1.6]);
  for(let i=0;i<6;i++){const c=new T.Group();train.g.add(c);add(new T.BoxGeometry(20,3.9,3.4),steel,0,0,0,c);add(new T.BoxGeometry(18.4,1.1,3.46),winM,0,.55,0,c,false);add(new T.BoxGeometry(19.6,.22,3.44),stripe,0,-.55,0,c,false);
   for(const x of [-6,0,6])add(new T.BoxGeometry(1.4,2.6,3.47),SM('#9aa0a6',{metalness:.6,roughness:.4}),x,-.1,0,c,false);train.cars.push(c)}}
 const T0=MB.A0+40,T1=72,CARL=20.8,TLEN=CARL*6;
 function updateTrain(dt,time,E,me){if(train.wait>0){train.wait-=dt;train.g.visible=false;if(train.wait<=0){train.dir=-train.dir;train.t=train.dir>0?T0-TLEN:T1+TLEN;train.on=true}if(sound&&sound.rumble)sound.rumble(api.extraRumble||0);return}
  train.g.visible=true;train.t+=train.dir*train.speed*dt;const lane=train.dir>0?7.6:-7.6,y=MB.D-4.5;
  train.cars.forEach((c,i)=>{const x=train.t-train.dir*(i*CARL+CARL/2);c.position.set(x,y,lane);c.visible=x>T0&&x<T1-10});
  const head=train.t;if((train.dir>0&&head-TLEN>T1)||(train.dir<0&&head+TLEN<T0)){train.wait=6+Math.random()*6;train.on=false}
  if(me&&sound&&sound.rumble){const mid=new T.Vector3(train.t-train.dir*TLEN/2,y,lane);train.g.localToWorld(mid);const d=mid.distanceTo(me);sound.rumble(Math.max(train.on&&d<220?Math.max(0,1-d/220)*.55*(.8+.2*Math.sin(time*23)):0,api.extraRumble||0))}}

 /* ═══ 3. 덤보 색소폰 버스커 ═══ */
 const BUSK={R:852.6,F:566,face:-Math.PI/2,caseR:849.6,caseF:566};
 const busker={g:new T.Group(),coins:0,bow:0,notes:[],audio:null,near:0,...BUSK};
 {const b=busker.g;b.position.copy(W(BUSK.R,BUSK.F,YC+.24));b.rotation.y=BUSK.face;g.add(b);
  const skin=SM('#a8714c'),jacket=SM('#c9963a',{roughness:.7}),jeans=SM('#2d3a52'),hatM=SM('#2b2522'),gold=SM('#d8b04a',{metalness:.92,roughness:.22});
  const hips=new T.Group();hips.position.y=1.05;b.add(hips);busker.hips=hips;
  for(const s of [-1,1]){const l=add(new T.CylinderGeometry(.13,.11,1.05,8),jeans,s*.17,-.52,0,hips);add(new T.BoxGeometry(.26,.14,.42),SM('#3a2a20'),s*.17,-1.0,.08,hips)}
  const torso=new T.Group();hips.add(torso);busker.torso=torso;
  add(new T.CylinderGeometry(.3,.27,.95,10),jacket,0,.5,0,torso);add(new T.SphereGeometry(.2,12,10),skin,0,1.2,0,torso);
  add(new T.CylinderGeometry(.3,.3,.06,16),hatM,0,1.36,0,torso);add(new T.CylinderGeometry(.18,.2,.24,14),hatM,0,1.48,0,torso);
  add(new T.BoxGeometry(.3,.07,.05),SM('#111'),0,1.24,.18,torso,false);
  for(const s of [-1,1]){const a=new T.Group();a.position.set(s*.33,.88,0);torso.add(a);add(new T.CylinderGeometry(.08,.07,.55,7),jacket,0,-.27,0,a);a.rotation.set(-.9,0,s*.25);
   const f=new T.Group();f.position.set(0,-.5,0);a.add(f);f.rotation.x=-1.1;add(new T.CylinderGeometry(.065,.06,.45,7),jacket,0,-.22,0,f);add(new T.SphereGeometry(.07,6,6),skin,0,-.46,0,f)}
  const sax=new T.Group();sax.position.set(0,.5,.34);torso.add(sax);busker.sax=sax;
  const sc=new T.CatmullRomCurve3([[0,.62,-.12],[0,.5,0],[0,.1,.02],[0,-.32,.0],[0,-.5,.12],[0,-.38,.3],[0,-.08,.36]].map(p=>new T.Vector3(...p)));
  add(new T.TubeGeometry(sc,30,.065,8,false),gold,0,0,0,sax);const bell=add(new T.CylinderGeometry(.2,.08,.32,14,1,true),gold,0,.06,.38,sax,false);bell.material=gold;
  for(let i=0;i<5;i++)add(new T.CylinderGeometry(.04,.04,.03,8),gold,.06,.38-i*.13,.05,sax,false);
  // 열린 가방 · 동전 · 팻말
  const cs=new T.Group();cs.position.copy(W(BUSK.caseR,BUSK.caseF,YC+.25));cs.rotation.y=BUSK.face+.3;g.add(cs);busker.caseG=cs;
  add(new T.BoxGeometry(1.1,.16,.42),SM('#22262b'),0,.08,0,cs);add(new T.BoxGeometry(1.04,.04,.36),SM('#7a2032',{roughness:1}),0,.17,0,cs,false);const lid=add(new T.BoxGeometry(1.1,.42,.06),SM('#22262b'),0,.3,-.24,cs);lid.rotation.x=-.25;
  const st=tex(256,128,(x,w,h)=>{x.fillStyle='#f6eedb';x.fillRect(0,0,w,h);x.fillStyle='#22675e';x.font=`800 40px ${FONT}`;x.textAlign='center';x.fillText('JAZZ ♪',w/2,52);x.font=`700 28px ${FONT}`;x.fillStyle='#7a2032';x.fillText('TIPS · 고마워요',w/2,98)});
  const sign=add(new T.PlaneGeometry(.7,.35),new T.MeshStandardMaterial({map:st,roughness:.7}),0,.32,-.2,cs,false);sign.rotation.x=-.25;sign.position.z=-.205;
  busker.coinGeo=new T.CylinderGeometry(.06,.06,.015,12);busker.coinMat=SM('#e9c46a',{metalness:.9,roughness:.25});busker.pile=[];
  const noteTex=['♪','♫','♬'].map(c=>tex(64,64,(x,w,h)=>{x.fillStyle='#ffffff';x.font=`900 52px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText(c,w/2,h/2)}));
  for(let i=0;i<7;i++){const s=new T.Sprite(new T.SpriteMaterial({map:noteTex[i%3],color:['#ffd36b','#ffffff','#7fd4ff'][i%3],transparent:true,depthWrite:false}));s.scale.setScalar(.55);s.visible=false;g.add(s);busker.notes.push({s,t:i/7*3})}}
 const flying=[];
 busker.toss=(from)=>{const m=new T.Mesh(busker.coinGeo,busker.coinMat);m.position.copy(from);g.add(m);const to=W(BUSK.caseR+(Math.random()-.5)*.6,BUSK.caseF+(Math.random()-.5)*.2,YC+.45);flying.push({m,a:from.clone(),b:to,t:0});busker.bow=1.2;busker.coins++};
 function updateBusker(dt,time,E,me,started){const b=busker,d=me?Math.hypot(me.x-BUSK.R,-me.z-BUSK.F):999;b.near=d;
  const playing=!(E&&E.rain>.35)&&!(E&&E.snow>.5);b.g.visible=d<420;b.caseG.visible=b.g.visible;
  const sw=Math.sin(time*2.2);if(playing){b.torso.rotation.set(.06+Math.sin(time*4.4)*.05,sw*.12,sw*.05);b.sax.rotation.x=Math.sin(time*4.4)*.08}else b.torso.rotation.set(0,0,0);
  if(b.bow>0){b.bow=Math.max(0,b.bow-dt);const k=Math.sin(Math.PI*Math.min(1,b.bow/1.2));b.torso.rotation.x=.55*k}
  for(const n of b.notes){n.t+=dt*(b.bow>0?2.2:1);const f=(n.t%3)/3;n.s.visible=playing&&d<60;if(n.s.visible){const a=n.t*1.7;n.s.position.copy(W(BUSK.R-.6+Math.sin(a)*.5,BUSK.F+Math.cos(a*1.3)*.5,YC+2.2+f*2.4));n.s.material.opacity=Math.sin(Math.PI*f)*.95}}
  for(let i=flying.length-1;i>=0;i--){const c=flying[i];c.t+=dt/.7;const k=Math.min(1,c.t);c.m.position.lerpVectors(c.a,c.b,k);c.m.position.y+=Math.sin(Math.PI*k)*1.4;c.m.rotation.x+=dt*18;
   if(k>=1){flying.splice(i,1);clink();c.m.rotation.set(0,Math.random()*3,0);c.m.position.y=YC+.42;if(b.pile.length>40){const o=b.pile.shift();o.parent&&o.parent.remove(o)}b.pile.push(c.m)}}
  // 재즈: 가까울수록 크게(30 u 안), 배경 음악은 그만큼 줄인다
  const k=started&&playing&&audioOK()?Math.max(0,Math.min(1,(34-d)/24)):0;
  if(k>0&&!b.audio){b.audio=new Audio('../ride/fusion-jazz.mp3');b.audio.loop=true;b.audio.volume=0;try{b.audio.currentTime=40}catch(e){}}
  if(b.audio){const v=Math.min(1,k)*.7;b.audio.volume+=(v-b.audio.volume)*Math.min(1,dt*3);if(v>.01&&b.audio.paused)b.audio.play().catch(()=>{});else if(v<=.01&&b.audio.volume<.02&&!b.audio.paused)b.audio.pause()}
  if(sound&&sound.music)sound.music.volume=.55*(1-.85*k)}

 /* ═══ 4. 지하철 입구 ═══ */
 const STATIONS=[
  {id:'wall',name:'월스트리트 역',en:'Wall St',sub:'브로드웨이 · 황소 옆',lines:[['4','#00933c'],['5','#00933c']],R:-7.7,F:105,face:1},
  {id:'york',name:'요크 스트리트 역',en:'York St',sub:'덤보 · 워싱턴 스트리트',lines:[['F','#ff6319']],R:852.7,F:452,face:-1},
  {id:'ts',name:'타임스스퀘어-42가 역',en:'Times Sq-42 St',sub:'전광판 · 빨간 계단',lines:[['N','#fccc0a',1],['Q','#fccc0a',1],['R','#fccc0a',1],['1','#ee352e'],['2','#ee352e'],['3','#ee352e'],['7','#b933ad']],R:TS.TX+7.7,F:TS.TF-92,face:1}];
 const bullet=(x,cx,cy,r,t,c,dark)=>{x.fillStyle=c;x.beginPath();x.arc(cx,cy,r,0,7);x.fill();x.fillStyle=dark?'#111':'#fff';x.font=`800 ${Math.round(r*1.3)}px Outfit,Arial,sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(t,cx,cy+r*.06)};
 for(const s of STATIONS){const sg=new T.Group();sg.position.copy(W(s.R,s.F,YC+.24));sg.rotation.y=s.face>0?0:Math.PI;(s.id==='ts'?TS.group:g).add(sg);s.g=sg;   // 지역 +z = 남쪽(F-) · 열린 쪽은 지역 -z · 타임스스퀘어 역은 TS 묶음에 넣어야 TS 안에서 보인다
  const iron=SM('#2f4d3a',{metalness:.55,roughness:.45}),Wd=2.6,Ld=5.6;
  add(new T.PlaneGeometry(Wd-.2,Ld-.2).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:'#0b0e10'}),0,.03,0,sg,false);
  for(let k=0;k<9;k++){const z=-Ld/2+.5+k*.55,c=Math.max(.06,.5-k*.055);add(new T.BoxGeometry(Wd-.3,.04,.12),new T.MeshBasicMaterial({color:new T.Color(c,c,c*1.05)}),0,.06,z,sg,false)}
  for(const x of [-Wd/2,Wd/2]){add(new T.BoxGeometry(.14,.5,Ld),SM('#7d7a73'),x,.25,0,sg);add(new T.BoxGeometry(.08,.08,Ld),iron,x,1.05,0,sg,false);for(let z=-Ld/2;z<=Ld/2+.01;z+=.7)add(new T.BoxGeometry(.05,.55,.05),iron,x,.78,z,sg,false)}
  add(new T.BoxGeometry(Wd,.5,.14),SM('#7d7a73'),0,.25,Ld/2,sg);add(new T.BoxGeometry(Wd,.08,.08),iron,0,1.05,Ld/2,sg,false);
  for(const x of [-Wd/2,Wd/2]){add(new T.CylinderGeometry(.06,.08,2.2,8),iron,x,1.1,-Ld/2,sg);const gm=new T.MeshStandardMaterial({color:'#8fe39e',emissive:'#3fbf5a',emissiveIntensity:.5});NIGHT.push([gm,.5,2.6]);add(new T.SphereGeometry(.24,14,10),gm,x,2.35,-Ld/2,sg,false)}
  const n=s.lines.length,st=tex(512,128,(x,w,h)=>{x.fillStyle='#111';x.fillRect(0,0,w,h);x.fillStyle='#fff';x.fillRect(0,10,w,3);x.font=`800 34px ${FONT}`;x.textAlign='left';x.textBaseline='middle';x.fillText(s.en,16,46);x.font=`600 22px ${FONT}`;x.fillStyle='#d8d8d8';x.fillText(s.name,16,84);s.lines.forEach(([t,c,dk],i)=>bullet(x,w-22-(n-1-i)*36,64,16,t,c,dk))});
  const sm=new T.MeshBasicMaterial({map:st,toneMapped:false});for(const r of [0,Math.PI]){const m=add(new T.PlaneGeometry(2.5,.62),sm,0,1.6,Ld/2+(r?-.05:.05),sg,false);m.rotation.y=r}
  add(new T.BoxGeometry(2.6,.7,.06),SM('#111'),0,1.6,Ld/2,sg,false);
  sg.updateMatrixWorld(true);const a=new T.Vector3(0,0,-Ld/2-1.6).applyMatrix4(sg.matrixWorld);s.act={R:a.x,F:-a.z};const e=new T.Vector3(0,0,-Ld/2-2.4).applyMatrix4(sg.matrixWorld);s.exit={R:e.x,F:-e.z,yaw:s.face>0?0:Math.PI};
  s.box=[s.R-Wd/2-.25,s.R+Wd/2+.25,s.F-Ld/2-.25,s.F+Ld/2+.25]}

 function walk(R,F){if(R>=PIER.R0+.4&&R<=PIER.R1-.4&&F>=PIER.F0+.4&&F<=PIER.F1)return PIER.y;return null}
 function blocked(R,F){for(const s of STATIONS){const b=s.box;if(R>b[0]&&R<b[1]&&F>b[2]&&F<b[3])return true}
  if((R-BUSK.R)**2+(F-BUSK.F)**2<.8)return true;if(Math.abs(R-BUSK.caseR)<.8&&Math.abs(F-BUSK.caseF)<.6)return true;return false}
 function update(time,dt,E,me,started){const d=E?E.dark:0;for(const [m,a,b] of NIGHT)m.emissiveIntensity=a+(b-a)*d;
  updateFerry(dt,time,E);updateTrain(dt,time,E,me);updateBusker(dt,time,E,me,started)}
 const api={group:g,ferry,train,busker,stations:STATIONS,walk,blocked,update,horn,extraRumble:0};return api}
root.NYC_FUN={build};
})(window);
