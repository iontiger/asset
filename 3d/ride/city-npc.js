/* 뉴욕 시내를 걷는 마을 친구 18명 (DentPhoto 마을 NPC 모두, 클라라 포함).
   달리는 방향 오른쪽 보도에서만 오가며 걷고, 머리 위 말풍선 이름표(이름 · 하는 일)를 띄운다. 바이크가 가까이 오면 이름표가 인사말로 바뀌고 손을 흔든다.
   city-scene.js 가 보도 경로(paths)와 좌표 함수(P · WV)를 넘겨 준다. */
(function(root){
 const PEOPLE=[
  ['겸손히님','카페 바리스타','cat','#fbf6ea','커피 한 잔?',{bow:'#c95d4b'}],
  ['아울러님','꽃집 주인','sheep','#f7b6c5','꽃 사세요~',{hat:'straw',hatC:'#f7b6c5'}],
  ['롱베이케이션님','경제 신문 기자','penguin','#e8e4da','뉴욕 증시 개장!',{hat:'fedora',hatC:'#6b5a4a'}],
  ['편안하게님','도서관 사서','owl','#7c6aa8','쉿, 조용히~',{}],
  ['굿플렉티스님','산책 대장','dog','#8fcf9b','멍멍! 산책 중!',{scarf:'#e0483e'}],
  ['우울라프님','사진사','raccoon','#e9d3a6','찰칵! 김치~',{hat:'beret',hatC:'#c0504d'}],
  ['까미유데물랭님','엽서 배달부','fox','#5d7fb3','엽서 왔어요!',{hat:'cap',hatC:'#2f4f7f'}],
  ['해의호흡님','동네 시인','squirrel','#b7d7c9','뉴욕의 시 한 줄',{scarf:'#f2c14e'}],
  ['조만간은퇴님','신문 배달부','bear','#6f9bc0','신문이요~',{hat:'cap',hatC:'#5d6b78'}],
  ['오키오키님','책방 주인','rabbit','#f3d38c','책 한 권 어때요?',{}],
  ['료멘스쿠나','장난꾸러기 방랑자','sukuna','#f3eee4','크크큭, 어이!',{scarf:'#26262c'}],
  ['포롱이','마을 마스코트','porong','#ffd6e6','포롱! 안뇽!',{}],
  ['스피또꿈나무','행운의 복권 꿈나무','hamster','#fff1d6','긁어 볼까?',{}],
  ['티바이러스','바이오 연구원','blackcat','#f4f6f8','손 씻어요~',{}],
  ['윈터드림','겨울 동화 작가','polar','#dcecf8','눈 올까?',{scarf:'#7fb2d9'}],
  ['원조익평','원조 투자 고수','tiger','#3f4a5c','길게 보자!',{hat:'fedora',hatC:'#5a4636'}],
  ['산타우찬이','산타 선물 배달부','deer','#d8322f','호호호! 선물이요~',{hat:'santa',hatC:'#d8322f'}],
  ['클라라','호두까기 인형 발레리나','pinkrabbit','#f9c9d8','사뿐사뿐~ 빙그르르!',{bow:'#f06c9a'}]];
 // 동물별 머리 색 · 귀 모양
 const ANIMAL={cat:['#f1c48f','tri'],sheep:['#f6f1e6','round'],penguin:['#2a2d33','none'],owl:['#9a7a5a','tuft'],dog:['#d9a46c','flop'],raccoon:['#8d8f94','round'],fox:['#e3843c','tri'],squirrel:['#c07a45','tri'],
  bear:['#a8774f','round'],rabbit:['#f5f1ea','long'],sukuna:['#f0d2c0','none'],porong:['#ffd6e6','long'],hamster:['#f2c48d','round'],blackcat:['#2b2b30','tri'],polar:['#f4f6f8','round'],tiger:['#f0a03c','round'],deer:['#c48a57','antler'],pinkrabbit:['#f7c6d6','long']};
 function tag(T,name,role,greet){const c=document.createElement('canvas');c.width=512;c.height=176;const x=c.getContext('2d');
  const w=512,h=136,r=30;x.fillStyle='rgba(16,22,42,.86)';x.beginPath();x.moveTo(r,0);x.arcTo(w,0,w,h,r);x.arcTo(w,h,0,h,r);x.lineTo(w/2+18,h);x.lineTo(w/2,h+30);x.lineTo(w/2-18,h);x.arcTo(0,h,0,0,r);x.arcTo(0,0,w,0,r);x.closePath();x.fill();
  x.strokeStyle=greet?'#ffd36b':'rgba(255,255,255,.35)';x.lineWidth=5;x.stroke();x.textAlign='center';x.textBaseline='middle';
  const font=(px,wt)=>`${wt} ${px}px "Pretendard","Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif`;
  if(greet){x.fillStyle='#ffd36b';x.font=font(34,800);x.fillText(name,w/2,40);x.fillStyle='#ffffff';x.font=font(40,800);x.fillText('“'+greet+'”',w/2,94)}
  else{x.fillStyle='#ffffff';x.font=font(46,800);x.fillText(name,w/2,52);x.fillStyle='#c9d4ea';x.font=font(28,600);x.fillText(role,w/2,100)}
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t}
 function build({T,g,paths,P,WV,YC,HALF,C}){
  const SM=(c,o)=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:.75},o||{}));
  const body=new T.CylinderGeometry(.34,.4,.95,10).translate(0,1.36,0),leg=new T.CylinderGeometry(.13,.12,.9,7),arm=new T.CylinderGeometry(.09,.08,.72,6).translate(0,-.34,0),head=new T.SphereGeometry(.36,14,10).translate(0,2.2,0);
  const legMat=SM('#2f3540'),eyeMat=new T.MeshBasicMaterial({color:'#1b1b1f'}),eye=new T.SphereGeometry(.045,6,5),umbG=new T.ConeGeometry(1,.42,10).translate(0,2.95,0);
  // 달리는 방향 오른쪽 보도만 골라 길 전체에 고르게 나눠 한 사람씩 (건너편은 잘 안 보인다)
  const rightSide=s=>{const r=C.segs[s.k].right;return Math.sign(s.axis==='F'?r[0]:r[1])};
  const list=paths.filter(p=>p.b-p.a>24&&p.s.k!==undefined&&p.side===rightSide(p.s)),npcs=[];
  PEOPLE.forEach(([name,role,animal,shirt,greet,look],i)=>{const path=list[Math.floor((i+.5)*list.length/PEOPLE.length)];if(!path)return;
   const [hc,ear]=ANIMAL[animal]||['#e0b48f','none'],o=new T.Group(),skin=SM(hc),sh=SM(shirt);
   o.add(new T.Mesh(body,sh),new T.Mesh(head,skin));
   const legs=[-.15,.15].map(x=>{const m=new T.Mesh(leg,legMat);m.geometry=leg;m.position.set(x,.45,0);o.add(m);return m});
   const arms=[-1,1].map(sd=>{const m=new T.Mesh(arm,sh);m.position.set(sd*.42,1.72,0);o.add(m);return m});
   for(const sd of [-1,1]){const e=new T.Mesh(eye,eyeMat);e.position.set(sd*.13,2.26,-.32);o.add(e)}
   const earAt=(geo,y,sx,rz)=>{for(const sd of [-1,1]){const m=new T.Mesh(geo,skin);m.position.set(sd*sx,y,0);m.rotation.z=-sd*rz;o.add(m)}};
   if(ear==='tri')earAt(new T.ConeGeometry(.13,.3,4),2.58,.2,.25);
   else if(ear==='long')earAt(new T.CapsuleGeometry(.07,.42,3,6),2.75,.14,.12);
   else if(ear==='round')earAt(new T.SphereGeometry(.11,8,6),2.52,.25,0);
   else if(ear==='flop')earAt(new T.BoxGeometry(.12,.34,.18),2.2,.38,-.15);
   else if(ear==='tuft')earAt(new T.ConeGeometry(.07,.2,4),2.6,.2,.4);
   else if(ear==='antler')earAt(new T.CylinderGeometry(.03,.04,.5,5),2.75,.2,.45);
   if(animal==='penguin'||animal==='owl'||animal==='polar'||animal==='porong'){const m=new T.Mesh(new T.SphereGeometry(.24,10,8).translate(0,2.12,-.18),SM(animal==='penguin'?'#f4f1ea':animal==='owl'?'#d8c3a0':'#ffffff'));o.add(m)}
   if(look.hat){const hc2=SM(look.hatC||'#444');if(look.hat==='straw'){const m=new T.Mesh(new T.CylinderGeometry(.62,.62,.05,16),hc2);m.position.y=2.5;o.add(m)}
    if(look.hat==='santa'){const m=new T.Mesh(new T.ConeGeometry(.34,.6,12),hc2);m.position.y=2.78;m.rotation.z=.25;o.add(m);const b=new T.Mesh(new T.SphereGeometry(.09,8,6),SM('#ffffff'));b.position.set(.16,3.05,0);o.add(b)}
    else{const m=new T.Mesh(new T.CylinderGeometry(look.hat==='beret'?.38:.32,.36,look.hat==='fedora'?.3:.16,14),hc2);m.position.y=2.58;o.add(m);if(look.hat!=='beret'){const brim=new T.Mesh(new T.CylinderGeometry(look.hat==='cap'?.4:.52,.52,.04,14),hc2);brim.position.set(0,2.47,look.hat==='cap'?-.12:0);o.add(brim)}}}
   if(look.scarf){const m=new T.Mesh(new T.TorusGeometry(.3,.08,6,14),SM(look.scarf));m.rotation.x=Math.PI/2;m.position.y=1.86;o.add(m)}
   if(look.bow){const m=new T.Mesh(new T.BoxGeometry(.3,.12,.06),SM(look.bow));m.position.set(0,1.9,-.38);o.add(m)}
   const umb=new T.Mesh(umbG,SM(['#e76f51','#2a9d8f','#264653','#f4a261','#6a4c93'][i%5],{side:T.DoubleSide,roughness:.5}));umb.visible=false;o.add(umb);
   o.traverse(m=>{if(m.isMesh)m.castShadow=true});
   const tags=[tag(T,name,role,''),tag(T,name,role,greet)],sp=new T.Sprite(new T.SpriteMaterial({map:tags[0],transparent:true,depthWrite:false,fog:false,toneMapped:false}));sp.scale.set(3.3,1.13,1);sp.position.y=3.85;sp.renderOrder=5;o.add(sp);
   o.scale.setScalar(1.1);g.add(o);
   npcs.push({name,o,sp,tags,legs,arms,umb,old:[o.children[0],...legs,...arms],sh,skin,path,t:path.a+(path.b-path.a)*((i*.37)%1),v:(i%2?1:-1)*(1.05+(i%4)*.12),lat:path.side*(HALF+1.5+(i%3)*.5),ph:i*1.3,near:false})});
  // 블렌더 사람 키트(city-people.js 와 같은 부위)가 오면 몸통 · 팔다리를 실제 사람 비율로 바꾼다(동물 머리 · 이름표 · 모자는 그대로)
  function useKit(geo){const G={};for(const k of ['torso','arm','hand','thigh','shin'])if(!(G[k]=geo(k)))return false;const CP=root.CITY_PEOPLE,J=CP.J,K=1.27,L={arm:CP.mirror(G.arm),hand:CP.mirror(G.hand),thigh:CP.mirror(G.thigh),shin:CP.mirror(G.shin)};
   const vm=m=>{const c=m.clone();c.vertexColors=true;return c},legM=vm(legMat);
   for(const n of npcs){for(const o of n.old)o.visible=false;const sh=vm(n.sh),sk=vm(n.skin),mk=(geo,mat)=>{const m=new T.Mesh(geo,mat);m.scale.setScalar(K);m.castShadow=true;return m};
    n.o.add(mk(G.torso,sh));n.knees=[];
    n.legs=[1,-1].map(sg=>{const grp=new T.Group();grp.position.set(sg*J.hip[0]*K,J.hip[1]*K,J.hip[2]*K);grp.add(mk(sg>0?G.thigh:L.thigh,legM));const kn=new T.Group();kn.position.set(J.knee[0]*K,J.knee[1]*K,J.knee[2]*K);kn.add(mk(sg>0?G.shin:L.shin,legM));grp.add(kn);n.knees.push(kn);n.o.add(grp);return grp});
    n.arms=[-1,1].map(sg=>{const grp=new T.Group();grp.position.set(sg*J.shoulder[0]*K,J.shoulder[1]*K,J.shoulder[2]*K);grp.add(mk(sg>0?G.arm:L.arm,sh),mk(sg>0?G.hand:L.hand,sk));n.o.add(grp);return grp})}
   return true}
  const prev=new T.Vector3();
  function update(time,dt,bikePos,env){const rain=env?env.rain>.15:false;
   for(const n of npcs){const p0=P(n.path.s,n.t,n.lat),d=WV(p0[0],p0[1],YC).distanceTo(bikePos),show=d<160;n.o.visible=show;if(!show)continue;
    const near=d<16;if(near!==n.near){n.near=near;n.sp.material.map=n.tags[near?1:0];n.sp.material.needsUpdate=true}
    const stop=near;   // 바이크가 가까이 오면 멈춰서 인사
    if(!stop){n.t+=n.v*dt;if(n.t<n.path.a||n.t>n.path.b){n.v=-n.v;n.t=Math.max(n.path.a,Math.min(n.path.b,n.t))}}
    const p=P(n.path.s,n.t,n.lat),q=P(n.path.s,n.t+Math.sign(n.v),n.lat),w=WV(p[0],p[1],YC+.24),w2=WV(q[0],q[1],YC+.24);
    n.o.position.copy(w);
    const face=stop?Math.atan2(bikePos.x-w.x,bikePos.z-w.z)+Math.PI:Math.atan2(w2.x-w.x,w2.z-w.z)+Math.PI;
    let dr=face-n.o.rotation.y;dr=Math.atan2(Math.sin(dr),Math.cos(dr));n.o.rotation.y+=dr*Math.min(1,dt*8);
    const sw=stop?0:Math.sin(time*7+n.ph)*.5;n.legs[0].rotation.x=sw;n.legs[1].rotation.x=-sw;if(n.knees){n.knees[0].rotation.x=stop?0:-(.1+.6*Math.max(0,Math.cos(time*7+n.ph)));n.knees[1].rotation.x=stop?0:-(.1+.6*Math.max(0,-Math.cos(time*7+n.ph)))}n.arms[0].rotation.x=-sw*.8;
    n.arms[1].rotation.x=stop?Math.PI*.92:sw*.8;n.arms[1].rotation.z=stop?Math.sin(time*9+n.ph)*.35:0;
    n.o.position.y+=stop?0:Math.abs(Math.sin(time*7+n.ph))*.06;
    n.umb.visible=rain;n.sp.material.opacity=Math.max(0,Math.min(1,(110-d)/40));
    const k=Math.max(.7,Math.min(2.4,d/26));n.sp.scale.set(3.3*k,1.13*k,1);n.sp.position.y=3.6+.25*k}}   // 멀어도 이름이 읽히고 가까워도 화면을 덮지 않게
  return {npcs,update,useKit,names:PEOPLE.map(p=>p[0])}}
 root.CITY_NPC={build,PEOPLE};if(typeof module!=='undefined')module.exports={PEOPLE};
})(typeof window!=='undefined'?window:globalThis);
