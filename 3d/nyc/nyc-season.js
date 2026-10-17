/* 뉴욕 거리 산책(3d/nyc)의 계절 장식 — 좌표는 walk-city.js 와 같다(R 동쪽 · F 북쪽 · 월드 x = R, z = -F).
   - 봄: 볼링 그린 · 배터리 파크 길가 튤립 화단
   - 여름: 배터리 파크 바닥 분수(물줄기)에서 뛰노는 아이들 (비 오거나 밤이면 쉰다)
   - 가을: 덤보 가게 앞(워싱턴 스트리트 · 워터 스트리트) 할로윈 호박 · 밤엔 호박 등불
   - 겨울: 거리 창가마다 리스(초록 고리 · 빨간 리본) · 공원의 눈사람
   build({T,scene,YC,C1,C2,S1,S2}) → {group,blocked(R,F),update(time,dt,E,me)} */
(function(root){
function build({T,scene,YC=3.8,C1,C2,S1,S2}){
 const g=new T.Group();g.name='nyc-season';scene.add(g);
 const W=(R,F,y=0)=>new T.Vector3(R,y,-F);
 const SM=(c,o={})=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:.75},o));
 const add=(geo,mat,x,y,z,p=g,shadow=true)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;p.add(m);return m};
 const tex=(w,h,draw)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;return t};
 let sd=11;const rnd=()=>{sd=(sd*16807)%2147483647;return sd/2147483647};
 const d=new T.Object3D(),col=new T.Color();
 const inst=(geo,mat,list,place,p=g,shadow=false)=>{const m=new T.InstancedMesh(geo,mat,Math.max(1,list.length));m.count=list.length;list.forEach((q,i)=>{place(q,i);d.updateMatrix();m.setMatrixAt(i,d.matrix);if(q.c)m.setColorAt(i,col.set(q.c))});m.castShadow=shadow;m.receiveShadow=true;p.add(m);return m};
 const blockers=[];

 /* ═══ 봄: 튤립 ═══ */
 const spring=new T.Group();g.add(spring);
 {const TC=['#e63946','#ffd166','#f7a1c4','#ffffff','#ff7b39','#b5179e'],tl=[];
  // 볼링 그린: 분수 둘레 타원 띠(울타리 안)
  for(let i=0;i<420;i++){const a=rnd()*Math.PI*2,k=.42+rnd()*.42,ci=Math.floor((a/(Math.PI*2))*8)%TC.length;tl.push({R:Math.cos(a)*9.5*k,F:-4+Math.sin(a)*12.5*k,y:YC+.1,c:TC[ci]})}
  // 배터리 파크 가운데 길 양옆 화단
  for(const s of [-1,1])for(let F=-98;F<-30;F+=9)for(let i=0;i<34;i++){const c=TC[(Math.floor((F+98)/9)+(s>0?2:0))%TC.length];tl.push({R:s*(12.6+rnd()*4.6),F:F+rnd()*6,y:YC+.02,c})}
  const beds=[];for(const s of [-1,1])for(let F=-98;F<-30;F+=9)beds.push({R:s*14.9,F:F+3});
  inst(new T.BoxGeometry(6.4,.22,6.6).translate(0,.11,0),SM('#5b3d29',{roughness:1}),beds,q=>{d.position.copy(W(q.R,q.F,YC+.02));d.rotation.set(0,0,0);d.scale.set(1,1,1)},spring);
  inst(new T.CylinderGeometry(.025,.03,.55,4).translate(0,.28,0),SM('#3f7d32'),tl,q=>{d.position.copy(W(q.R,q.F,q.y+.1));d.rotation.set(0,0,(rnd()-.5)*.2);d.scale.set(1,.8+rnd()*.5,1)},spring);
  inst(new T.SphereGeometry(.11,7,6,0,Math.PI*2,0,Math.PI*.62).rotateX(Math.PI).translate(0,.62,0),SM('#ffffff',{roughness:.6,side:T.DoubleSide}),tl,q=>{d.position.copy(W(q.R,q.F,q.y+.12));d.rotation.set(0,rnd()*3,0);d.scale.set(1,1.45,1)},spring);
  inst(new T.BoxGeometry(.05,.16,.18),SM('#4f9a3c'),tl.filter((q,i)=>i%2===0),q=>{d.position.copy(W(q.R+.06,q.F,q.y+.3));d.rotation.set(0,rnd()*3,.4);d.scale.set(1,1,1)},spring)}

 /* ═══ 여름: 배터리 파크 바닥 분수 · 뛰노는 아이들 ═══ */
 const summer=new T.Group();g.add(summer);
 const SP={R:62,F:-90,r:7.5};
 add(new T.CylinderGeometry(SP.r,SP.r,.06,40),SM('#c9d3d6',{roughness:.3,metalness:.1}),SP.R,YC+.05,-SP.F,summer,false);
 add(new T.CylinderGeometry(SP.r-.4,SP.r-.4,.02,40),SM('#7fb3c4',{roughness:.06,metalness:.2,transparent:true,opacity:.55}),SP.R,YC+.09,-SP.F,summer,false);
 const JN=11,JP=26,jetPos=new Float32Array(JN*JP*3),jetGeo=new T.BufferGeometry();jetGeo.setAttribute('position',new T.BufferAttribute(jetPos,3));
 const dropTex=tex(32,32,x=>{const r=x.createRadialGradient(16,16,0,16,16,16);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=r;x.fillRect(0,0,32,32)});dropTex.generateMipmaps=false;dropTex.minFilter=T.LinearFilter;
 const jets=new T.Points(jetGeo,new T.PointsMaterial({map:dropTex,color:'#f2fbff',size:.5,transparent:true,opacity:.9,depthWrite:false}));jets.frustumCulled=false;summer.add(jets);
 const JET=[];for(let i=0;i<JN;i++){const a=i/JN*Math.PI*2,r=i%2?5.2:2.6;JET.push({x:Math.cos(a)*r,z:Math.sin(a)*r,h:2.2+(i%3)*.9,ph:i*.7})}
 const kidsP=root.CITY_PEOPLE?root.CITY_PEOPLE.make({T,g:summer,max:9}):null,KC=['#ff6b6b','#ffd166','#4cc9f0','#80ed99','#f72585','#ff9f1c','#9b5de5','#00bbf9'];
 const kids=[];for(let i=0;i<8;i++){const q=root.CITY_PEOPLE?root.CITY_PEOPLE.look(rnd):{};q.top=KC[i];q.leg=KC[(i+3)%KC.length];q.h=.5+rnd()*.12;q.coat=false;kids.push({q,a:rnd()*6,r:2+rnd()*4,v:(rnd()<.5?-1:1)*(.6+rnd()*.6),jump:rnd()*3,ph:rnd()*6})}

 /* ═══ 가을: 덤보 가게 앞 할로윈 호박 ═══ */
 const autumn=new T.Group();g.add(autumn);
 const pk=[],lanterns=[];
 {const spots=[];const ok=(R,F)=>Math.hypot(R-852.6,F-566)>6&&Math.hypot(R-852.7,F-452)>6&&Math.hypot(R-845,F-540)>14;
  for(let F=348;F<534;F+=9)for(const R of [836.1,853.9])if(ok(R,F))spots.push({R,F,ry:R<845?Math.PI/2:-Math.PI/2});
  for(let R=764;R<834;R+=9)for(const F of [549.1,530.9])if(ok(R,F))spots.push({R,F,ry:F>540?0:Math.PI});   // ry: 호박 얼굴이 길 쪽을 보는 방향
  spots.forEach((s,i)=>{const n=2+(i%3);for(let k=0;k<n;k++){const off=(k-(n-1)/2)*.75;const ax=Math.abs(s.ry)===Math.PI/2?[0,1]:[1,0];const sz=k===1?.46:.3+rnd()*.12;pk.push({R:s.R+ax[0]*off,F:s.F+ax[1]*off,s:sz,c:['#e8741c','#f28c28','#d9621a'][k%3]});if(k===1)lanterns.push({R:s.R+ax[0]*off,F:s.F+ax[1]*off,s:sz,ry:s.ry})}
   if(i%3===0)pk.push({R:s.R+(Math.abs(s.ry)===Math.PI/2?0:1.6),F:s.F+(Math.abs(s.ry)===Math.PI/2?1.6:0),s:.0,hay:true});blockers.push([s.R,s.F,1.1,autumn])})}
 const pumpGeo=new T.SphereGeometry(1,14,10);{const p=pumpGeo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x),k=1+.06*Math.cos(a*8);p.setXYZ(i,x*k,y*.72,z*k)}pumpGeo.computeVertexNormals()}
 inst(pumpGeo,SM('#ffffff',{roughness:.55}),pk.filter(q=>!q.hay),q=>{d.position.copy(W(q.R,q.F,YC+.24+q.s*.7));d.rotation.set(0,rnd()*3,0);d.scale.setScalar(q.s)},autumn,true);
 inst(new T.CylinderGeometry(.05,.07,.22,5),SM('#4b5d2a'),pk.filter(q=>!q.hay),q=>{d.position.copy(W(q.R,q.F,YC+.24+q.s*1.42));d.rotation.set(.2,0,.1);d.scale.setScalar(Math.max(.6,q.s*2))},autumn);
 inst(new T.BoxGeometry(1.2,.6,.75),SM('#d9b55e',{roughness:1}),pk.filter(q=>q.hay),q=>{d.position.copy(W(q.R,q.F,YC+.54));d.rotation.set(0,rnd()*.4,0);d.scale.set(1,1,1)},autumn,true);
 const faceT=tex(128,128,(x,w,h)=>{x.fillStyle='#000';x.fillRect(0,0,w,h);x.fillStyle='#ffc23a';const tri=(a,b,c)=>{x.beginPath();x.moveTo(...a);x.lineTo(...b);x.lineTo(...c);x.closePath();x.fill()};tri([30,52],[52,52],[41,32]);tri([76,52],[98,52],[87,32]);tri([56,70],[72,70],[64,58]);
  x.beginPath();x.moveTo(26,80);x.lineTo(102,80);x.lineTo(92,100);x.lineTo(80,92);x.lineTo(70,104);x.lineTo(58,92);x.lineTo(46,104);x.lineTo(36,92);x.closePath();x.fill()});
 const faceM=new T.MeshBasicMaterial({map:faceT,transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,color:'#ffffff'});
 for(const q of lanterns){const m=new T.Mesh(new T.PlaneGeometry(q.s*1.5,q.s*1.1),faceM),o=new T.Vector3(Math.sin(q.ry),0,Math.cos(q.ry));m.position.copy(W(q.R,q.F,YC+.24+q.s*.72)).addScaledVector(o,q.s*1.04);m.rotation.y=q.ry;autumn.add(m)}
 // 허수아비 하나(워싱턴 스트리트 모퉁이)
 {const sc=new T.Group();sc.position.copy(W(836.4,522,YC+.24));sc.rotation.y=-Math.PI/2;autumn.add(sc);add(new T.CylinderGeometry(.06,.06,2.4,6),SM('#7a5a3a'),0,1.2,0,sc);add(new T.CylinderGeometry(.05,.05,1.6,6),SM('#7a5a3a'),0,1.7,0,sc).rotation.z=Math.PI/2;
  add(new T.BoxGeometry(.7,.8,.3),SM('#a23b2a'),0,1.55,0,sc);add(new T.SphereGeometry(.24,10,8),SM('#e2c48a'),0,2.2,0,sc);add(new T.ConeGeometry(.42,.42,12),SM('#c9a24a'),0,2.5,0,sc);blockers.push([836.4,522,.8,autumn])}

 /* ═══ 겨울: 창가 리스 · 눈사람 ═══ */
 const winter=new T.Group();g.add(winter);
 const wr=[];
 for(const [C,S] of [[C1,S1],[C2,S2]])for(const b of S.blds){if(wr.length>420)break;const faces=[[b.r0-.18,(b.f0+b.f1)/2,-1,0,b.f1-b.f0],[b.r1+.18,(b.f0+b.f1)/2,1,0,b.f1-b.f0],[(b.r0+b.r1)/2,b.f0-.18,0,-1,b.r1-b.r0],[(b.r0+b.r1)/2,b.f1+.18,0,1,b.r1-b.r0]];
  for(const [R,F,nr,nf,w] of faces){const st=C.onStreet(R+nr*2.2,F+nf*2.2);if(!st||st.road)continue;const n=Math.min(4,Math.floor(w/6.5));for(let k=0;k<n;k++){const o=(k-(n-1)/2)*(w/n),R2=R+(nf?o:0),F2=F+(nr?o:0);wr.push({R:R2+nr*.04,F:F2+nf*.04,ry:Math.atan2(nr,-nf),y:YC+(k%2?6.4:5.6)})}}}
 const ringGeo=new T.TorusGeometry(.42,.13,6,16),bowGeo=new T.BoxGeometry(.34,.16,.08);
 inst(ringGeo,SM('#2f6b3a',{roughness:.9}),wr,q=>{d.position.copy(W(q.R,q.F,q.y));d.rotation.set(0,q.ry,0);d.scale.set(1,1,1)},winter);
 inst(bowGeo,SM('#c8302c',{roughness:.6}),wr,q=>{const o=new T.Vector3(Math.sin(q.ry),0,Math.cos(q.ry));d.position.copy(W(q.R,q.F,q.y-.42)).addScaledVector(o,.08);d.rotation.set(0,q.ry,0);d.scale.set(1,1,1)},winter);
 const berries=[];wr.forEach((q,i)=>{if(i%2)return;const o=new T.Vector3(Math.sin(q.ry),0,Math.cos(q.ry));for(let k=0;k<3;k++){const a=1+k*.9;const p=W(q.R,q.F,q.y).add(new T.Vector3(Math.cos(q.ry)*Math.cos(a)*.42,Math.sin(a)*.42,-Math.sin(q.ry)*Math.cos(a)*.42)).addScaledVector(o,.12);berries.push(p)}});
 const berryM=inst(new T.SphereGeometry(.06,6,5),new T.MeshStandardMaterial({color:'#e63946',emissive:'#ff3030',emissiveIntensity:0}),berries,p=>{d.position.copy(p);d.rotation.set(0,0,0);d.scale.set(1,1,1)},winter).material;
 const SNOWMEN=[[-34,-88,.4],[26,-58,-.6],[18,-14,2.6],[722,558,1.4],[726,392,2],[-24,-60,.2]];
 for(const [R,F,ry] of SNOWMEN){const s=new T.Group();s.position.copy(W(R,F,YC+.1));s.rotation.y=ry;winter.add(s);const snow=SM('#f6f8fb',{roughness:.9});
  add(new T.SphereGeometry(.85,16,12),snow,0,.75,0,s);add(new T.SphereGeometry(.62,16,12),snow,0,1.95,0,s);add(new T.SphereGeometry(.44,16,12),snow,0,2.85,0,s);
  for(const x of [-.15,.15])add(new T.SphereGeometry(.05,6,5),SM('#1d1d1d'),x,2.95,.39,s,false);add(new T.ConeGeometry(.07,.42,8).rotateX(Math.PI/2),SM('#f28c28'),0,2.84,.6,s,false);
  for(let k=0;k<3;k++)add(new T.SphereGeometry(.05,6,5),SM('#1d1d1d'),0,1.75+k*.22,.6-k*.02,s,false);
  add(new T.TorusGeometry(.42,.1,6,16).rotateX(Math.PI/2),SM('#c8302c'),0,2.45,0,s,false);add(new T.BoxGeometry(.18,.5,.06),SM('#c8302c'),.25,2.2,.38,s,false);
  add(new T.CylinderGeometry(.36,.36,.05,14),SM('#1d1d1d'),0,3.22,0,s,false);add(new T.CylinderGeometry(.24,.26,.45,14),SM('#1d1d1d'),0,3.46,0,s,false);
  for(const sg of [-1,1]){const a=add(new T.CylinderGeometry(.03,.04,1.1,5),SM('#5a3b26'),sg*.95,2.2,0,s,false);a.rotation.z=sg*1.0}
  blockers.push([R,F,1.1,winter])}

 function blocked(R,F){for(const [r,f,rad,grp] of blockers){if(!grp.visible)continue;if((R-r)**2+(F-f)**2<rad*rad)return true}return false}
 function update(time,dt,E,me){const si=E?E.seasonIndex:0,dark=E?E.dark:0;
  spring.visible=si===0;autumn.visible=si===2;winter.visible=si===3;
  const play=si===1&&E.rain<.2&&dark<.55;summer.visible=si===1;jets.visible=play;
  if(play){for(let j=0;j<JN;j++){const J=JET[j],on=Math.sin(time*.9+J.ph)>-.3;for(let i=0;i<JP;i++){const f=((time*.8+i/JP+J.ph)%1),k=(j*JP+i)*3;jetPos[k]=SP.R+J.x+Math.sin(i*5.1)*.12*f;jetPos[k+1]=on?YC+.1+J.h*4*f*(1-f):-50;jetPos[k+2]=-SP.F+J.z+Math.cos(i*3.7)*.12*f}}jetGeo.attributes.position.needsUpdate=true}
  if(kidsP){kidsP.begin();if(summer.visible&&me&&(me.x-SP.R)**2+(me.z+SP.F)**2<180*180){for(const k of kids){const run=play?1:0;k.a+=k.v*dt/k.r*3*run;k.jump+=dt;const R=SP.R+Math.cos(k.a)*k.r,F=SP.F+Math.sin(k.a)*k.r,hop=play?Math.max(0,Math.sin(k.jump*4.2))*.35:0,sg=Math.sign(k.v),ry=Math.atan2(Math.sin(k.a)*sg,Math.cos(k.a)*sg);
    kidsP.person(R,YC+.1+hop,-F,ry,time*7+k.ph,run*.9,k.q,play&&Math.sin(k.jump*1.3)>.3?{armUp:true,wave:true,t:time+k.ph}:null)}}kidsP.end()}
  faceM.opacity=.35+dark*.65;berryM.emissiveIntensity=dark*.6}
 return {group:g,blocked,update,SP}}
root.NYC_SEASON={build};
})(window);
