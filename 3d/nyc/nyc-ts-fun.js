/* 뉴욕 거리 산책(3d/nyc) — 타임스스퀘어 7번가 즐길 거리. 자리는 nyc-ts.js 의 TS.SP 를 쓴다(도시 빌딩을 비운 자리에 직접 세운다).
   - 📺 7번가 라이브 캠: 길 가운데 동그라미 둘레에 오면 동쪽 큰 전광판에 주인공이 생중계된다(따로 찍는 카메라 → 렌더 타깃, 가까울 때만)
   - 🎆 원 타임스스퀘어 탑 · 새해 볼 드롭: 탑 앞에서 F, 또는 겨울이 끝나 새해가 되는 순간 10초 카운트다운 → 공이 내려오고 색종이 · 환호
   - 🎭 브로드웨이 극장(W 44 ST): 빨간 계단 매표소(TKTS)에서 표를 사서 들어가면 짧은 뮤지컬(화면 위 무대 #stage)
   - 🧸 인형 탈 친구 셋(곰 · 토끼 · 공룡): 같이 사진 찍고 팁 1달러 · 🍗 할랄 카트(nyc-extras.js 카트 목록에 더한다)
   build({T,TS,X,YC,sound,toast,hero,flash,heroFace,cycle}) → {group,SOLID,blocked,findAct(P,busy),update(time,dt,E,me,P,busy),renderLive(renderer,scene),
     startNYE(auto),stage:{on,open,close},areaName(R,F),icons,state} */
'use strict';
(function(root){
function build({T,TS,X,YC=3.8,sound,toast,hero,flash,heroFace='👦',cycle=300}){
 const {TX,TF,SP}=TS,g=new T.Group();g.name='nyc-ts-fun';TS.group.add(g);
 const $=id=>document.getElementById(id);
 const W=(R,F,y=0)=>new T.Vector3(R,y,-F);
 const SM=(c,o={})=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:.7},o));
 const add=(geo,mat,x,y,z,p=g,shadow=true)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;p.add(m);return m};
 const tex=(w,h,draw)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;const x=cv.getContext('2d');draw(x,w,h,0);const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;t.x=x;t.draw=draw;return t};
 const redraw=(t,time)=>{t.draw(t.x,t.image.width,t.image.height,time);t.needsUpdate=true};
 const FONT='"Noto Sans KR","Apple SD Gothic Neo",Outfit,Arial,sans-serif';
 const audioOK=()=>sound&&sound.ctx&&!sound.muted;
 const chime=f=>{try{if(audioOK()&&sound.chime)sound.chime(f)}catch(e){}};
 // 군중 환호: 잡음을 띠 거르개로 걸러 2~3초 부풀었다 잦아든다
 function cheer(len=2.6,vol=.32){if(!audioOK())return;try{const a=sound.ctx,t=a.currentTime,n=a.createBufferSource(),b=a.createBuffer(1,a.sampleRate*len,a.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(.6+.4*Math.sin(i/a.sampleRate*31));n.buffer=b;const f=a.createBiquadFilter();f.type='bandpass';f.frequency.value=900;f.Q.value=.7;const gn=a.createGain();
  gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(vol,t+.35);gn.gain.exponentialRampToValueAtTime(.001,t+len);n.connect(f);f.connect(gn);gn.connect(sound.master);n.start(t);n.stop(t+len)}catch(e){}}
 // 박수: 짧은 잡음 딱딱 소리를 여러 번
 function clap(n=26,span=2.4){if(!audioOK())return;try{const a=sound.ctx,t0=a.currentTime,b=a.createBuffer(1,a.sampleRate*.05,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/(a.sampleRate*.008));
  for(let k=0;k<n;k++){const s=a.createBufferSource();s.buffer=b;const gn=a.createGain(),f=a.createBiquadFilter();f.type='highpass';f.frequency.value=900+Math.random()*900;gn.gain.value=.14+Math.random()*.12;s.connect(f);f.connect(gn);gn.connect(sound.master);s.start(t0+Math.random()*span)}}catch(e){}}
 const SOLID=[],blockers=[];   // 카메라가 들어가면 안 되는 빌딩 [R0,R1,F0,F1,꼭대기 y] · 걸어서 못 지나가는 곳 [R,F,반지름]

 /* ── 빌딩 상자: 창문 격자(한 칸 4 u)를 면 크기대로 반복, 밤엔 창마다 불 ── */
 const winT=tex(256,256,(x,w,h)=>{x.fillStyle='#ddd8cc';x.fillRect(0,0,w,h);for(let j=0;j<8;j++)for(let i=0;i<8;i++){x.fillStyle='#3a4552';x.fillRect(i*32+6,j*32+5,20,23);x.fillStyle='rgba(255,255,255,.2)';x.fillRect(i*32+6,j*32+5,20,4)}});
 const winE=tex(256,256,(x,w,h)=>{x.fillStyle='#000';x.fillRect(0,0,w,h);for(let j=0;j<8;j++)for(let i=0;i<8;i++)if(((i*5+j*11)%7)>2){x.fillStyle='#ffd98a';x.fillRect(i*32+6,j*32+5,20,23)}});
 for(const t of [winT,winE]){t.wrapS=t.wrapT=T.RepeatWrapping}
 const roofM=SM('#6d6f72',{roughness:.9}),bldMats=[];
 function block(r0,r1,f0,f1,h,col){const w=r1-r0,d=f1-f0,geo=new T.BoxGeometry(w,h,d),uv=geo.attributes.uv,dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
  for(let f=0;f<6;f++)for(let k=0;k<4;k++){const i=f*4+k;uv.setXY(i,uv.getX(i)*dims[f][0]/32,uv.getY(i)*dims[f][1]/32)}
  const m=SM(col,{map:winT,emissiveMap:winE,emissive:'#ffffff',emissiveIntensity:0,roughness:.8});bldMats.push(m);
  const mesh=add(geo,[m,m,roofM,roofM,m,m],(r0+r1)/2,YC+h/2,-(f0+f1)/2);SOLID.push([r0,r1,f0,f1,YC+h+1]);return mesh}
 const gloT=tex(64,64,(x,w,h)=>{const gr=x.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.4,'rgba(255,255,255,.5)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,w,h)});
 gloT.generateMipmaps=false;gloT.minFilter=T.LinearFilter;

 /* ═══ 1. 📺 7번가 라이브 캠 ═══ */
 const LV=SP.LIVE;block(LV.r0,LV.r1,LV.f0,LV.f1,LV.h,'#9fb0c2');
 const scrW=28,scrH=15.75,scrF=(LV.f0+LV.f1)/2,scrY=YC+6.4+scrH/2,scrR=LV.r0-.3;
 add(new T.BoxGeometry(.6,scrH+1.3,scrW+1.3),SM("#15181c",{metalness:.5,roughness:.4}),scrR+.42,scrY,-scrF);
 const idleT=tex(512,288,(x,w,h,t)=>{const hue=(t*30)%360,gr=x.createLinearGradient(0,0,w,h);gr.addColorStop(0,`hsl(${hue},80%,45%)`);gr.addColorStop(1,`hsl(${(hue+120)%360},80%,40%)`);x.fillStyle=gr;x.fillRect(0,0,w,h);
  x.fillStyle='rgba(0,0,0,.35)';x.fillRect(0,h*.2,w,h*.6);x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.font=`900 46px ${FONT}`;x.fillText('📺 7번가 라이브 캠',w/2,h*.36);
  x.font=`700 26px ${FONT}`;x.fillStyle='#ffe08a';x.fillText('길 가운데 동그라미로 와 보세요',w/2,h*.56);x.fillStyle='#fff';x.fillText('전광판에 내가 나와요!',w/2,h*.7)});
 const idleM=new T.MeshBasicMaterial({map:idleT,toneMapped:false});
 const rt=new T.WebGLRenderTarget(512,288);rt.texture.generateMipmaps=false;rt.texture.minFilter=T.LinearFilter;
 const liveM=new T.MeshBasicMaterial({map:rt.texture});
 const scr=add(new T.PlaneGeometry(scrW,scrH),idleM,scrR,scrY,-scrF,g,false);scr.rotation.y=-Math.PI/2;
 // 전광판 테두리 글씨(● LIVE · 아래 띠) — 생중계 때만
 const frameT=tex(1024,576,(x,w,h,t)=>{x.clearRect(0,0,w,h);x.fillStyle='rgba(0,0,0,.55)';x.fillRect(0,h-64,w,64);x.fillStyle='#fff';x.font=`800 30px ${FONT}`;x.textAlign='left';x.textBaseline='middle';x.fillText('TIMES SQUARE · 7 AV LIVE CAM',28,h-32);
  x.textAlign='right';x.fillStyle='#ffd166';x.fillText('H 로 손 흔들기 👋',w-28,h-32);const on=Math.floor(t*2)%2===0;x.fillStyle='rgba(0,0,0,.5)';x.fillRect(22,22,150,54);x.fillStyle=on?'#ff3b3b':'#7a1d1d';x.beginPath();x.arc(52,49,13,0,7);x.fill();
  x.fillStyle='#fff';x.textAlign='left';x.font=`900 32px ${FONT}`;x.fillText('LIVE',76,50);x.strokeStyle='rgba(255,255,255,.85)';x.lineWidth=8;x.strokeRect(4,4,w-8,h-8)});
 const frameP=add(new T.PlaneGeometry(scrW,scrH),new T.MeshBasicMaterial({map:frameT,transparent:true,toneMapped:false,depthWrite:false}),scrR-.06,scrY,-scrF,g,false);frameP.rotation.y=-Math.PI/2;frameP.visible=false;
 // 카메라 받침(전광판 아래) · 길 가운데 동그라미
 {const cg=new T.Group();cg.position.copy(W(LV.r0-.4,LV.mark[1],YC+5.3));g.add(cg);add(new T.BoxGeometry(1.4,.25,.5),SM('#2a2d31',{metalness:.6}),-.5,.4,0,cg);const body=add(new T.BoxGeometry(1.1,.7,.7),SM('#1d2024',{metalness:.5}),-1.1,.75,0,cg);
  const lens=add(new T.CylinderGeometry(.22,.26,.4,16),SM('#0b0d10',{metalness:.8,roughness:.2}),-1.75,.75,0,cg);lens.rotation.z=Math.PI/2;add(new T.SphereGeometry(.07,8,6),new T.MeshBasicMaterial({color:'#ff3030'}),-1.3,1.15,.3,cg,false)}
 const markT=tex(256,256,(x,w,h)=>{x.clearRect(0,0,w,h);x.strokeStyle='#ffd166';x.lineWidth=14;x.beginPath();x.arc(128,128,108,0,7);x.stroke();x.setLineDash([18,14]);x.lineWidth=6;x.beginPath();x.arc(128,128,82,0,7);x.stroke();
  x.fillStyle='#ffd166';x.font=`900 34px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText('LIVE',128,112);x.font=`800 26px ${FONT}`;x.fillText('📺 CAM',128,150)});
 const mark=add(new T.PlaneGeometry(4.6,4.6).rotateX(-Math.PI/2),new T.MeshBasicMaterial({map:markT,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),LV.mark[0],YC+.05,-LV.mark[1],g,false);
 mark.rotation.y=Math.PI/2;mark.renderOrder=2;
 const live={cam:new T.PerspectiveCamera(30,16/9,.4,420),rt,on:false,frame:0,aim:new T.Vector3(),seen:false,onMark:false};
 live.cam.position.copy(W(LV.r0-2.2,LV.mark[1],YC+6.05));live.aim.copy(W(LV.mark[0],LV.mark[1],YC+2));live.cam.lookAt(live.aim);g.add(live.cam);
 function updateLive(time,dt,E,me,P){const d=Math.hypot(P.R-LV.mark[0],P.F-LV.mark[1]),near=d<24&&P.R<LV.r0-1&&P.F>TF+8&&P.F<TF+66;
  if(near!==live.on){live.on=near;scr.material=near?liveM:idleM;frameP.visible=near}
  if(!near){if(Math.floor(time*2)!==live.idleK){live.idleK=Math.floor(time*2);redraw(idleT,time)}return}
  const want=new T.Vector3(me.x,me.y+1.25,me.z);live.aim.lerp(want,Math.min(1,dt*4));live.cam.lookAt(live.aim);
  const D=live.cam.position.distanceTo(live.aim),H=3.6+Math.max(0,d-2)*.32;live.cam.fov=Math.max(12,Math.min(48,2*Math.atan(H/2/D)*180/Math.PI));live.cam.updateProjectionMatrix();
  liveM.color.setScalar(1+E.dark*1.4);
  if(Math.floor(time*2)!==live.fk){live.fk=Math.floor(time*2);redraw(frameT,time)}
  const on=d<2.4;if(on&&!live.onMark&&!live.seen){live.seen=true;toast('<b>📺 전광판에 내가 나왔어요!</b>H 로 손을 흔들어 봐요 · 📷 사진으로 남겨도 좋아요',5)}live.onMark=on}
 function renderLive(renderer,scene){if(!live.on||!g.visible||!TS.group.visible)return;if((live.frame++)%2)return;
  const au=renderer.shadowMap.autoUpdate,old=renderer.getRenderTarget();renderer.shadowMap.autoUpdate=false;scr.visible=frameP.visible=false;
  renderer.setRenderTarget(rt);renderer.clear(true,true,true);renderer.render(scene,live.cam);renderer.setRenderTarget(old);renderer.shadowMap.autoUpdate=au;scr.visible=frameP.visible=true}

 /* ═══ 2. 🎆 원 타임스스퀘어 탑 · 새해 볼 드롭 ═══ */
 const ON=SP.ONE,yr=new Date().getFullYear()+1,nye={on:false,t:0,n:10,boom:false,armed:true,rise:0};block(ON.r0,ON.r1,ON.f0,ON.f1,ON.h,'#cbc4b4');
 const oneZ=-ON.f1-.08,oneR=(ON.r0+ON.r1)/2,oneW=ON.r1-ON.r0-1.4;   // 북쪽 면(7번가 쪽)
 const face=(t,w,h,y)=>{const m=add(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:t,toneMapped:false}),oneR,y,oneZ,g,false);m.rotation.y=Math.PI;return m};
 // 맨 아래 큰 화면: 평소엔 광고 · 카운트다운 때 숫자
 const cdT=tex(512,320,(x,w,h,t)=>{const s=nye.on?nye:null;if(s&&!s.boom){x.fillStyle='#05070c';x.fillRect(0,0,w,h);x.fillStyle='#ffd166';x.font=`800 30px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText('NEW YEAR COUNTDOWN',w/2,h*.16);
   x.fillStyle='#fff';x.font=`900 190px ${FONT}`;x.fillText(String(s.n||10),w/2,h*.6);return}
  if(s&&s.boom){for(let i=0;i<16;i++){x.fillStyle=`hsl(${(i*22+t*200)%360},90%,55%)`;x.fillRect(i*w/16,0,w/16+1,h)}x.fillStyle='rgba(0,0,0,.45)';x.fillRect(0,h*.22,w,h*.56);x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';
   x.font=`900 60px ${FONT}`;x.fillText('HAPPY NEW YEAR',w/2,h*.4);x.font=`900 70px ${FONT}`;x.fillStyle='#ffd166';x.fillText(String(yr),w/2,h*.64);return}
  const k=Math.floor(t/5)%3;if(k===0){x.fillStyle='#0b1026';x.fillRect(0,0,w,h);const gr=x.createLinearGradient(0,0,w,0);gr.addColorStop(0,`hsl(${t*40%360},90%,60%)`);gr.addColorStop(1,`hsl(${(t*40+90)%360},90%,60%)`);x.fillStyle=gr;
   x.font=`900 74px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText('DENTPHOTO',w/2,h*.42);x.fillStyle='#fff';x.font=`700 28px ${FONT}`;x.fillText('치과 사진관 · ONE TIMES SQUARE',w/2,h*.68)}
  else if(k===1){x.fillStyle='#120814';x.fillRect(0,0,w,h);x.fillStyle='#ffd166';x.textAlign='center';x.textBaseline='middle';x.font=`900 64px ${FONT}`;x.fillText('🎆 '+yr,w/2,h*.36);x.fillStyle='#fff';x.font=`700 28px ${FONT}`;x.fillText('새해 볼 드롭 · 탑 앞에서 F',w/2,h*.62);x.fillText('겨울이 끝나면 자동으로!',w/2,h*.78)}
  else{x.fillStyle='#fff';x.fillRect(0,0,w,h);x.fillStyle='#111';x.textAlign='center';x.textBaseline='middle';x.font=`900 150px ${FONT}`;x.fillText('I',w*.2,h*.55);x.fillText('NY',w*.74,h*.55);x.fillStyle='#e0282e';x.fillText('♥',w*.44,h*.53)}});
 face(cdT,oneW,oneW*.625,YC+8+oneW*.31);
 const adT=tex(320,512,(x,w,h)=>{const gr=x.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#3a0ca3');gr.addColorStop(1,'#f72585');x.fillStyle=gr;x.fillRect(0,0,w,h);x.fillStyle='#ffd166';x.textAlign='center';x.textBaseline='middle';x.font=`800 30px ${FONT}`;x.fillText('BROADWAY',w/2,h*.18);
  x.fillStyle='#fff';x.font=`900 64px ${FONT}`;x.fillText('바람을',w/2,h*.42);x.fillText('따라',w/2,h*.56);x.fillStyle='#ffd166';x.font=`700 24px ${FONT}`;x.fillText('W 44 ST · NOW PLAYING',w/2,h*.78)});
 face(adT,oneW*.62,oneW,YC+24+oneW*.5);
 const tickT=tex(1024,64,(x,w,h)=>{x.fillStyle='#04060a';x.fillRect(0,0,w,h);x.fillStyle='#ff5c5c';x.font=`800 40px ${FONT}`;x.textBaseline='middle';x.fillText('● BREAKING · 타임스스퀘어 새해 볼 드롭 · 7번가 라이브 캠 · W 44 ST 뮤지컬 바람을 따라 · 할랄 카트 오픈 ',10,34)});
 tickT.wrapS=T.RepeatWrapping;const tick=face(tickT,oneW,1.6,YC+21.2);
 // 위쪽 화면 둘(탑 앞면을 전광판으로 덮는다)
 const adT2=tex(512,256,(x,w,h)=>{const gr=x.createLinearGradient(0,0,w,0);gr.addColorStop(0,'#ff006e');gr.addColorStop(.5,'#8338ec');gr.addColorStop(1,'#3a86ff');x.fillStyle=gr;x.fillRect(0,0,w,h);x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';
  x.font=`900 66px ${FONT}`;x.fillText('TIMES SQUARE',w/2,h*.42);x.font=`700 26px ${FONT}`;x.fillStyle='#ffe08a';x.fillText('THE CROSSROADS OF THE WORLD',w/2,h*.72)});
 face(adT2,oneW,oneW*.5,YC+47+oneW*.25);
 const adT3=tex(512,256,(x,w,h)=>{x.fillStyle='#0d3b36';x.fillRect(0,0,w,h);x.fillStyle='#ffe6a8';x.textAlign='center';x.textBaseline='middle';x.font=`900 58px ${FONT}`;x.fillText('🗽 마을 친구들',w/2,h*.38);
  x.fillStyle='#fff';x.font=`700 28px ${FONT}`;x.fillText('뉴욕에 놀러 왔어요 · DENTPHOTO',w/2,h*.7)});
 face(adT3,oneW,oneW*.5,YC+60+oneW*.25);
 // 지붕: 내년 숫자 · 깃대 · 공
 const top=YC+ON.h;const numT=tex(512,160,(x,w,h)=>{x.clearRect(0,0,w,h);x.fillStyle='#ffd34d';x.font=`900 150px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.shadowColor='#ffb020';x.shadowBlur=20;x.fillText(String(yr),w/2,h/2+6)});
 const nums=add(new T.PlaneGeometry(13,4),new T.MeshBasicMaterial({map:numT,transparent:true,toneMapped:false,side:T.DoubleSide}),oneR,top+2.8,-(ON.f0+ON.f1)/2,g,false);
 add(new T.BoxGeometry(14,.5,1.2),SM('#2a2d31',{metalness:.6}),oneR,top+.6,-(ON.f0+ON.f1)/2);
 const mastH=17,ballTop=top+mastH-1.2,ballLow=top+6.8;
 add(new T.CylinderGeometry(.32,.42,mastH,10),SM('#d7dbe0',{metalness:.85,roughness:.25}),oneR,top+mastH/2,-(ON.f0+ON.f1)/2-2.6);
 const ballM=new T.MeshStandardMaterial({color:'#e8f4ff',emissive:'#ffffff',emissiveIntensity:.6,metalness:.4,roughness:.15,flatShading:true});
 const ball=add(new T.IcosahedronGeometry(2.5,2),ballM,oneR,ballTop,-(ON.f0+ON.f1)/2-2.6,g,false);
 const ballGlow=new T.Sprite(new T.SpriteMaterial({map:gloT,color:'#ffe6a8',transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:.6,toneMapped:false}));ballGlow.scale.setScalar(12);ball.add(ballGlow);
 // 7번가 가운데 볼 드롭 안내대: 작은 공 모형 + 'NEW YEAR'S EVE' 판 — 여기서 F
 const kiosk=new T.Group();{const k=kiosk;k.position.copy(W(ON.act[0],ON.act[1],YC+.02));g.add(k);add(new T.CylinderGeometry(.9,1.1,.5,20),SM('#2a2d31',{metalness:.6,roughness:.35}),0,.25,0,k);
  add(new T.CylinderGeometry(.12,.16,2.6,10),SM('#d7dbe0',{metalness:.85,roughness:.25}),0,1.8,0,k);const mini=add(new T.IcosahedronGeometry(.55,1),ballM,0,3.4,0,k,false);k.userData.mini=mini;
  const sT=tex(256,128,(x,w,h)=>{x.fillStyle='#0b1026';x.fillRect(0,0,w,h);x.strokeStyle='#ffd166';x.lineWidth=6;x.strokeRect(3,3,w-6,h-6);x.fillStyle='#ffd166';x.textAlign='center';x.textBaseline='middle';x.font=`800 22px ${FONT}`;x.fillText("NEW YEAR'S EVE",w/2,h*.3);
   x.fillStyle='#fff';x.font=`900 30px ${FONT}`;x.fillText('🎆 볼 드롭 · F',w/2,h*.66)});
  for(const s of [0,Math.PI]){const p=add(new T.PlaneGeometry(1.9,.95),new T.MeshBasicMaterial({map:sT,toneMapped:false}),Math.sin(s)*.17,1.35,Math.cos(s)*.17,k,false);p.rotation.y=s;add(new T.BoxGeometry(2,1.05,.3),SM('#14161a'),0,1.35,0,k)}
  blockers.push([ON.act[0],ON.act[1],1.2])}
 // 색종이
 const CN=900,cPos=new Float32Array(CN*3),cCol=new Float32Array(CN*3),cVel=new Float32Array(CN*3),cGeo=new T.BufferGeometry();cGeo.setAttribute('position',new T.BufferAttribute(cPos,3));cGeo.setAttribute('color',new T.BufferAttribute(cCol,3));
 const confT=tex(16,16,(x,w,h)=>{x.fillStyle='#fff';x.fillRect(2,4,12,8)});confT.generateMipmaps=false;confT.minFilter=T.LinearFilter;
 const conf=new T.Points(cGeo,new T.PointsMaterial({size:.5,map:confT,vertexColors:true,transparent:true,depthWrite:false,toneMapped:false}));conf.frustumCulled=false;conf.visible=false;g.add(conf);
 const PAL=['#ff4b6e','#ffd166','#06d6a0','#4cc9f0','#b388ff','#ffffff','#ff9f1c','#f72585'].map(c=>new T.Color(c));
 function confetti(me){for(let i=0;i<CN;i++){cPos[i*3]=me.x+(Math.random()-.5)*60;cPos[i*3+1]=me.y+8+Math.random()*34;cPos[i*3+2]=me.z+(Math.random()-.5)*60;const c=PAL[i%PAL.length];cCol[i*3]=c.r;cCol[i*3+1]=c.g;cCol[i*3+2]=c.b;
   cVel[i*3]=(Math.random()-.5)*1.2;cVel[i*3+1]=1.6+Math.random()*1.8;cVel[i*3+2]=Math.random()*6.28}cGeo.attributes.color.needsUpdate=true;conf.visible=true;conf.material.opacity=1}
 const ny=$('nye');
 function startNYE(auto){if(nye.on)return false;nye.on=true;nye.t=0;nye.n=10;nye.boom=false;nye.rise=0;ball.position.y=ballTop;
  if(ny){ny.hidden=false;ny.className='nye';$('nye-n').textContent='10';$('nye-sub').textContent='원 타임스스퀘어 탑의 공이 내려와요!'}
  toast(auto?'<b>🎆 한 해가 끝나요!</b>원 타임스스퀘어 탑에서 새해 카운트다운이 시작됐어요':'<b>🎆 새해 볼 드롭</b>다 같이 10초 카운트다운!',4);chime(660);redraw(cdT,0);return true}
 const focus=new T.Vector3();
 function updateNYE(time,dt,E,me,busy){
  // 겨울이 끝나 새해가 되는 순간(E.p 가 1 → 0)에 맞춰 10초 전부터 자동으로
  if(E.p<.9)nye.armed=true;if(nye.armed&&!nye.on&&!busy&&E.p>1-10.4/cycle){nye.armed=false;startNYE(true)}
  const night=E.dark;ballM.emissiveIntensity=.5+night*1.6+(nye.on?1.2:0);ballGlow.material.opacity=.35+night*.5+(nye.on?.4:0);ball.rotation.y+=dt*(nye.on?1.6:.3);
  ballM.emissive.setHSL((time*(nye.on?.6:.05))%1,nye.on?.9:.25,.62);
  tickT.offset.x=(time*.05)%1;kiosk.userData.mini.rotation.y+=dt*.8;
  if(!nye.on){if(nye.rise>0){nye.rise=Math.max(0,nye.rise-dt/5);ball.position.y=ballLow+(ballTop-ballLow)*(1-nye.rise)}else if(Math.floor(time*1.5)!==nye.k){nye.k=Math.floor(time*1.5);redraw(cdT,time)}}
  else{nye.t+=dt;
   if(nye.t<10){const n=Math.max(1,Math.ceil(10-nye.t));ball.position.y=ballTop-(ballTop-ballLow)*Math.min(1,nye.t/10);if(n!==nye.n){nye.n=n;if(ny)$('nye-n').textContent=String(n);chime(n<=3?988:784);redraw(cdT,time)}}
   else if(!nye.boom){nye.boom=true;ball.position.y=ballLow;confetti(me);TS.cheer=8;cheer(3.2,.36);clap(40,3);[523,659,784,1047,1319].forEach((f,i)=>setTimeout(()=>chime(f),i*120));
    if(ny){ny.className='nye boom';$('nye-n').textContent='HAPPY NEW YEAR';$('nye-sub').textContent=`🎉 ${yr} · 새해 복 많이 받으세요!`}}
   if(nye.boom&&Math.floor(time*6)!==nye.k){nye.k=Math.floor(time*6);redraw(cdT,time)}
   if(nye.t>17){nye.on=false;nye.rise=1;if(ny)ny.hidden=true;redraw(cdT,time)}}
  if(conf.visible){let alive=0;for(let i=0;i<CN;i++){const k=i*3;if(cPos[k+1]<YC-1)continue;alive++;cVel[k+2]+=dt*3;cPos[k]+=(cVel[k]+Math.sin(cVel[k+2])*.9)*dt;cPos[k+1]-=cVel[k+1]*dt;cPos[k+2]+=Math.cos(cVel[k+2]*1.3)*.7*dt}
   cGeo.attributes.position.needsUpdate=true;if(!alive)conf.visible=false}}

 /* ═══ 3. 🎭 브로드웨이 극장(W 44 ST) · TKTS 표 ═══ */
 const TH=SP.THEATER,thMats=[];block(TH.r0,TH.r1,TH.f0,TH.f1,TH.h,'#d9c8a6');
 const thZ=-TH.f0,thR=(TH.r0+TH.r1)/2,doorR=TH.door[0];   // 남쪽 면(W 44 ST 쪽) z
 {const fT=tex(512,256,(x,w,h)=>{x.fillStyle='#2b1d16';x.fillRect(0,0,w,h);for(let i=0;i<4;i++){const x0=24+i*122;x.fillStyle='#0d0f12';x.fillRect(x0,40,102,206);x.strokeStyle='#d4a849';x.lineWidth=6;x.strokeRect(x0,40,102,206);
    x.fillStyle='rgba(255,215,140,.35)';x.fillRect(x0+10,52,82,90);x.fillStyle='#d4a849';x.fillRect(x0+46,150,10,40)}x.fillStyle='#d4a849';x.fillRect(0,0,w,26)});
  const m=add(new T.PlaneGeometry(13,6.5),new T.MeshStandardMaterial({map:fT,roughness:.6,emissive:'#ffd08a',emissiveMap:fT,emissiveIntensity:.15}),doorR,YC+3.25,thZ+.06,g,false);thMats.push(m.material)}
 // 포스터 둘
 const posT=tex(256,384,(x,w,h)=>{const gr=x.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#1d1347');gr.addColorStop(1,'#c2185b');x.fillStyle=gr;x.fillRect(0,0,w,h);for(let i=0;i<30;i++){x.fillStyle=`rgba(255,240,180,${(i%5)/6})`;x.beginPath();x.arc((i*53)%w,(i*91)%h*.7,2+(i%3),0,7);x.fill()}
  x.fillStyle='#ffd166';x.textAlign='center';x.textBaseline='middle';x.font=`800 22px ${FONT}`;x.fillText('THE MUSICAL',w/2,h*.16);x.fillStyle='#fff';x.font=`900 54px ${FONT}`;x.fillText('바람을',w/2,h*.4);x.fillText('따라',w/2,h*.54);
  x.font='72px sans-serif';x.fillText('💃',w/2,h*.76);x.strokeStyle='#d4a849';x.lineWidth=10;x.strokeRect(5,5,w-10,h-10)});
 for(const s of [-1,1])add(new T.PlaneGeometry(2.6,3.9),new T.MeshBasicMaterial({map:posT}),doorR+s*8.8,YC+2.6,thZ+.06,g,false);
 // 차양(마키): 길 쪽으로 3 u 튀어나온 붉은 판 · 앞면 글씨판 · 둘레 전구(차례로 깜빡)
 const mq=new T.Group();mq.position.set(doorR,YC+4.9,thZ+1.6);g.add(mq);
 add(new T.BoxGeometry(16,1.1,3.2),SM('#7d1420',{roughness:.5,metalness:.2}),0,0,0,mq);add(new T.BoxGeometry(16.4,.18,3.4),SM('#d4a849',{metalness:.7,roughness:.3}),0,.62,0,mq);
 const mqT=tex(1024,96,(x,w,h)=>{x.fillStyle='#fffaf0';x.fillRect(0,0,w,h);x.fillStyle='#111';x.font=`900 56px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText('바람을 따라 · THE MUSICAL · NOW PLAYING',w/2,h/2+3)});
 add(new T.PlaneGeometry(15.2,.85),new T.MeshBasicMaterial({map:mqT}),0,0,1.62,mq,false);
 for(const s of [-1,1]){const p=add(new T.PlaneGeometry(2.8,.85),new T.MeshBasicMaterial({map:mqT}),s*8.02,0,0,mq,false);p.rotation.y=s*Math.PI/2}
 const BN=46,bulbs=new T.InstancedMesh(new T.SphereGeometry(.09,6,5),new T.MeshBasicMaterial({color:'#ffffff',toneMapped:false}),BN);
 {const d=new T.Object3D();for(let i=0;i<BN;i++){const u=i/BN,x=-7.9+15.8*((i%23)/22),y=i<23?-.58:.78;d.position.set(x,y,1.66);d.updateMatrix();bulbs.setMatrixAt(i,d.matrix);bulbs.setColorAt(i,new T.Color('#ffdf8a'))}}mq.add(bulbs);
 // 세로 간판(블레이드)
 const bladeT=tex(128,512,(x,w,h)=>{x.fillStyle='#14100c';x.fillRect(0,0,w,h);x.fillStyle='#ffcf5a';x.font=`900 70px ${FONT}`;x.textAlign='center';x.textBaseline='middle';['D','E','N','T','극','장'].forEach((c,i)=>x.fillText(c,w/2,50+i*82));x.strokeStyle='#ffcf5a';x.lineWidth=6;x.strokeRect(6,6,w-12,h-12)});
 const blade=new T.Group();blade.position.set(TH.r1-3,YC+13,thZ+1.3);g.add(blade);add(new T.BoxGeometry(.6,11,2.6),SM('#14100c'),0,0,0,blade);
 for(const s of [-1,1]){const p=add(new T.PlaneGeometry(2.4,10.6),new T.MeshBasicMaterial({map:bladeT,toneMapped:false}),s*.31,0,0,blade,false);p.rotation.y=s*Math.PI/2}
 let ticket=false;
 function buyTicket(){if(ticket){toast('<b>🎟 표가 이미 있어요</b>W 44 ST 극장으로 가요 · 지도 🎭',3);return}ticket=true;chime(988);setTimeout(()=>chime(1319),140);
  toast('<b>🎟 뮤지컬 ‘바람을 따라’ 표!</b>반값에 샀어요 · 7번가 북쪽 W 44 ST 극장(지도 🎭)으로 가요',5)}

 /* 무대(화면 위): 막이 열리고 · 조명 · 춤 · 노래 가사 · 막이 닫히면 박수 */
 const LYRICS=['♪ 바람을 따라 브로드웨이로','♪ 반짝이는 불빛 아래 우리 마을 친구들','♪ 오늘 밤 뉴욕이 우리의 무대','♪ 손을 잡고 한 바퀴 빙글','♪ 바람을 따라 — 브라보!'];
 const stage={on:false,timers:[],audio:null};
 function stageOpen(){if(stage.on||!ticket)return false;const el=$('stage');if(!el)return false;stage.on=true;ticket=false;el.hidden=false;el.className='stage';
  const face=$('st-me');if(face)face.textContent=heroFace;const line=$('st-line');line.textContent='곧 공연이 시작됩니다 · 휴대폰은 잠시 꺼 주세요';
  const at=(ms,fn)=>stage.timers.push(setTimeout(fn,ms));
  at(1300,()=>{el.classList.add('open');chime(523);if(audioOK()){try{const a=new Audio('../ride/upbeat.mp3');a.volume=0;a.play().catch(()=>{});stage.audio=a;let v=0;const iv=setInterval(()=>{if(!stage.audio){clearInterval(iv);return}v=Math.min(.6,v+.06);a.volume=v;if(v>=.6)clearInterval(iv)},90)}catch(e){}}});
  LYRICS.forEach((l,i)=>at(2000+i*2300,()=>{line.textContent=l;line.classList.remove('pop');void line.offsetWidth;line.classList.add('pop')}));
  at(2000+LYRICS.length*2300,()=>{el.classList.add('bow');line.textContent='👏 브라보! 커튼콜';clap(46,3.2);cheer(2.4,.22)});
  at(4600+LYRICS.length*2300,()=>{el.classList.remove('open')});
  at(6200+LYRICS.length*2300,()=>stageClose(true));return true}
 function stageClose(done){for(const t of stage.timers)clearTimeout(t);stage.timers=[];if(stage.audio){const a=stage.audio;stage.audio=null;let v=a.volume;const iv=setInterval(()=>{v-=.08;if(v<=0){a.pause();clearInterval(iv)}else a.volume=v},60)}
  const el=$('stage');if(el)el.hidden=true;if(!stage.on)return;stage.on=false;toast(done?'<b>🎭 브라보!</b>뮤지컬 ‘바람을 따라’ 끝 · 또 보려면 TKTS에서 표를 사요':'<b>🎭 공연장을 나왔어요</b>표는 다 썼어요 · 또 보려면 TKTS에서',4)}
 {const b=$('st-exit');if(b)b.onclick=()=>stageClose(false)}

 /* ═══ 4. 🧸 인형 탈 친구들 ═══ */
 const CH={bear:{name:'빅 곰돌이',ic:'🧸',col:'#9a6a43',belly:'#e8cfa8'},bunny:{name:'분홍 토끼',ic:'🐰',col:'#f4a7c3',belly:'#fff1f6'},dino:{name:'꼬마 공룡',ic:'🦖',col:'#5fbf6a',belly:'#e6f5b8'}};
 const chars=SP.CHARS.map(c=>{const k=CH[c.id],o=new T.Group(),b=new T.Group();o.position.copy(W(c.R,c.F,YC+.24));o.rotation.y=c.face;g.add(o);o.add(b);const M=SM(k.col,{roughness:.95}),B=SM(k.belly,{roughness:.95}),dark=SM('#1b1b1b',{roughness:.4});
  const cap=(r,l,col,x,y,z,p=b)=>add(new T.CapsuleGeometry(r,l,4,10),col,x,y,z,p);
  cap(.62,.55,M,0,1.15,0);const bel=add(new T.SphereGeometry(.46,20,16),B,0,1.08,-.44,b);bel.scale.set(1,1.15,.5);
  for(const s of [-1,1])cap(.24,.4,M,s*.32,.36,0);
  const arms=[-1,1].map(s=>{const a=new T.Group();a.position.set(s*.72,1.6,0);b.add(a);cap(.2,.62,M,0,-.4,0,a);a.rotation.z=s*.35;return a});
  const head=new T.Group();head.position.y=2.35;b.add(head);add(new T.SphereGeometry(.72,20,16),M,0,0,0,head);
  for(const s of [-1,1]){add(new T.SphereGeometry(.09,10,8),dark,s*.25,.12,-.64,head,false);add(new T.SphereGeometry(.035,6,5),new T.MeshBasicMaterial({color:'#ffffff'}),s*.25+.03,.16,-.72,head,false)}
  const mz=add(new T.SphereGeometry(.3,14,10),B,0,-.16,-.58,head);mz.scale.set(1.15,.8,.7);add(new T.SphereGeometry(.08,8,6),dark,0,-.08,-.8,head,false);
  if(c.id==='bear')for(const s of [-1,1]){add(new T.SphereGeometry(.24,12,10),M,s*.5,.55,0,head);add(new T.SphereGeometry(.13,10,8),B,s*.5,.55,-.12,head,false)}
  if(c.id==='bunny')for(const s of [-1,1]){const e=cap(.13,.8,M,s*.24,.95,.05,head);e.rotation.z=-s*.18;const i=cap(.07,.6,B,s*.24,.95,-.06,head);i.rotation.z=-s*.18}
  if(c.id==='dino'){const Y=SM('#f2c14e');for(let i=0;i<4;i++){const sp=add(new T.ConeGeometry(.15,.38,6),Y,0,2.7-i*.5,.5+Math.sin(i*.6)*.08,b);sp.rotation.x=.5}for(let i=0;i<3;i++){const sp=add(new T.ConeGeometry(.13,.34,6),Y,0,.68-i*.02,.05+i*.28,head);sp.rotation.x=.25*i}
   const tail=add(new T.ConeGeometry(.35,1.5,10),M,0,.55,.95,b);tail.rotation.x=1.25;mz.scale.set(1.45,.9,1.35);mz.position.set(0,-.2,-.62);for(const s of [-1,1])add(new T.SphereGeometry(.04,6,5),dark,s*.12,-.08,-1.02,head,false)}
  // 팁 통 · 'PHOTO $1' 표지
  const tip=new T.Group();tip.position.set(.9,0,-.7);o.add(tip);add(new T.CylinderGeometry(.22,.18,.45,12),SM('#3a7bd5'),0,.22,0,tip);
  return Object.assign({},c,k,{o,b,arms,head,ph:c.R*.37,jump:0,yaw:c.face})});
 function photoWith(c){if(!c)return;c.jump=1;hero&&hero.wave&&hero.wave();if(flash)flash();chime(1568);setTimeout(()=>chime(1175),200);
  toast(`<b>📸 ${c.ic} ${wa(c.name)} 찰칵!</b>팁 1달러를 넣었어요 · “땡큐! 하이파이브!”`,4)}
 function updateChars(time,dt,me,P){for(const c of chars){const d=Math.hypot(P.R-c.R,P.F-c.F),near=d<9;
   const want=near?Math.atan2(-(P.R-c.R),(P.F-c.F)):c.face;let dy=want-c.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));c.yaw+=dy*Math.min(1,dt*3);c.o.rotation.y=c.yaw;
   if(c.jump>0)c.jump=Math.max(0,c.jump-dt*1.2);const j=Math.sin(c.jump*Math.PI*2)*.6*c.jump;
   c.b.position.y=Math.abs(Math.sin(time*2.2+c.ph))*.08+Math.max(0,j);c.b.rotation.z=Math.sin(time*1.1+c.ph)*.05;c.head.rotation.z=Math.sin(time*1.7+c.ph)*.08;
   const wave=near||c.jump>0;c.arms[1].rotation.z=wave?-2.3+Math.sin(time*9)*.35:.35;c.arms[0].rotation.z=c.jump>0?2.3-Math.sin(time*9)*.35:-.35}}
 for(const c of chars)blockers.push([c.R,c.F,.95]);

 /* ═══ 5. 🍗 할랄 카트 (nyc-extras 카트로 더해서 사기 · 손에 들기 · 심부름이 그대로 된다) ═══ */
 if(X&&X.addCart)X.addCart({id:'halal',R:SP.HALAL[0],F:SP.HALAL[1],ry:Math.PI/2,kinds:['halal'],sign:['HALAL FOOD','#f2b705','#b3261e'],umb:['#f2b705','#b3261e'],steam:true,ts:true},g);

 /* ── 할 수 있는 일(F) ── */
 const near=(P,p,r)=>Math.hypot(P.R-p[0],P.F-p[1])<r;
 const wa=s=>{const c=s.charCodeAt(s.length-1);return s+(c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28?'과':'와')};
 function findAct(P){
  if(near(P,SP.TKTS,3.2))return ticket?{id:'tkts-have',label:'🎟 표가 있어요 · W 44 ST 극장으로',run:null}:{id:'tkts',label:'🎟 TKTS 반값 뮤지컬 표 사기',run:buyTicket};
  if(near(P,TH.door,3.4))return ticket?{id:'show',label:'🎭 뮤지컬 ‘바람을 따라’ 보기',run:stageOpen}:{id:'show-no',label:'🎭 표가 필요해요 · 빨간 계단 TKTS',run:null};
  if(near(P,ON.act,4.6))return nye.on?{id:'nye-on',label:'🎆 카운트다운 중!',run:null}:{id:'nye',label:'🎆 새해 볼 드롭 카운트다운',run:()=>startNYE(false)};
  let bc=null,bd=3.3;for(const c of chars){const d=Math.hypot(P.R-c.R,P.F-c.F);if(d<bd){bd=d;bc=c}}
  if(bc)return {id:'ch:'+bc.id,label:`📸 ${bc.ic} ${wa(bc.name)} 사진 · 팁 1달러`,run:()=>photoWith(bc)};
  if(live.onMark)return {id:'live',label:'👋 전광판에 손 흔들기',run:()=>hero&&hero.wave&&hero.wave()};
  return null}
 function update(time,dt,E,me,P,busy){const n=E.dark;for(const m of bldMats)m.emissiveIntensity=n*.6;for(const m of thMats)m.emissiveIntensity=.15+n*.9;
  {const on=Math.floor(time*6)%3,c=new T.Color();for(let i=0;i<BN;i++){c.set(i%3===on?'#fff3c4':'#a8782a');bulbs.setColorAt(i,c)}bulbs.instanceColor.needsUpdate=true}
  updateLive(time,dt,E,me,P);updateNYE(time,dt,E,me,busy);updateChars(time,dt,me,P)}
 function blocked(R,F){for(const b of blockers)if((R-b[0])**2+(F-b[1])**2<b[2]**2)return true;return false}
 function areaName(R,F){if(Math.hypot(R-LV.mark[0],F-LV.mark[1])<12)return '📺 7번가 라이브 캠';if(Math.hypot(R-ON.act[0],F-ON.act[1])<14)return '🎆 원 타임스스퀘어';if(Math.hypot(R-TH.door[0],F-TH.door[1])<13)return '🎭 W 44 ST 브로드웨이 극장';return null}
 const icons=[['📺',LV.mark[0],LV.mark[1]],['🎆',ON.act[0],ON.act[1]-6],['🎭',TH.door[0],TH.door[1]+5],['🎟',SP.TKTS[0],SP.TKTS[1]],...chars.map(c=>[c.ic,c.R,c.F])];
  // 카운트다운 동안(끝나고 4초까지) 7번가에 있으면 카메라가 올려다볼 곳: 공
 const focusFor=P=>nye.on&&nye.t<14&&Math.abs(P.R-SP.AV7)<12&&P.F>TF-12&&P.F<TF+125?ball.getWorldPosition(focus):null;
 // 타임스스퀘어를 떠나면(지하철) 카운트다운 · 색종이를 멈춘다
 function leave(){if(nye.on){nye.on=false;nye.rise=0;ball.position.y=ballTop;if(ny)ny.hidden=true;redraw(cdT,0)}conf.visible=false;if(stage.on)stageClose(false)}
 return {group:g,SOLID,blocked,findAct,update,renderLive,startNYE,nye,live,focusFor,leave,chars,stage:{get on(){return stage.on},open:stageOpen,close:stageClose},areaName,icons,get ticket(){return ticket},set ticket(v){ticket=!!v},photoWith,buyTicket}}
root.NYC_TS_FUN={build};
})(window);
