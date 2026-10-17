/* 뉴욕 거리 산책(3d/nyc)의 명소 · 물 · 먼 스카이라인. 좌표는 walk-city.js 와 같다(R 동쪽 · F 북쪽 · 월드 x = R, z = -F).
   - 배터리 파크(바다 건너 자유의 여신상 전망) · 볼링 그린 · 월스트리트 황소(Charging Bull) · 트리니티 교회 · 뉴욕증권거래소 · 두려움 없는 소녀 · 페더럴 홀 · 원 월드 트레이드 센터
   - 걸어서 건너는 브루클린 브릿지(가운데 나무 산책로 · 고딕 아치 탑 두 개 · 거미줄 케이블) → 브루클린 · 덤보(맨해튼 브릿지 탑이 길 끝에 보이는 워싱턴 스트리트)
   - 브루클린 브릿지 파크 · 제인의 회전목마 · 이스트강 · 뉴욕항 · 스태튼 아일랜드 페리 · 미드타운(엠파이어 스테이트) · 브루클린 · 저지시티 스카이라인
   build({T,scene,YC}) → {bridgeY, bridgeWalk(R,F), walk(R,F), blocked(R,F), pois, update(time,dt,E,cam), people, setEnv(envMap)} */
(function(root){
const ss=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
// 브루클린 브릿지: F 330 을 따라 동쪽으로. 맨해튼 R 240 에서 오르기 시작 · 탑 R 370 / 660 · 브루클린 R 805 에 내려선다
const BBR={F:330,R0:240,T1:370,T2:660,R1:805,D:30,W:2.8};
function bridgeY(R,YC=3.8){if(R<=BBR.R0)return YC;if(R<BBR.T1)return YC+(BBR.D-YC)*ss((R-BBR.R0)/(BBR.T1-BBR.R0));if(R<=BBR.T2)return BBR.D+2.5*Math.sin(Math.PI*(R-BBR.T1)/(BBR.T2-BBR.T1));if(R<BBR.R1)return BBR.D+(YC-BBR.D)*ss((R-BBR.T2)/(BBR.R1-BBR.T2));return YC}
// 맨해튼 브릿지: 브루클린 탑 MB.B (덤보 워싱턴 스트리트 끝, 강 위) · 방향 dir(동남 → 북서 반대) · 맨해튼 탑은 t = -330
const MB={B:[845,650],dir:[.8,-.6],T2:-330,A0:-480,A1:185,D:34};
// 걸을 수 있는 넓은 곳(길 말고): [R0,R1,F0,F1,높이(보도 기준 +)]
const AREAS=[[-185,322,-119,-14],[-32,32,-22,16],[692,744,352,608],[692,1006,586,608]];
// 명소(가까이 가면 안내 · 왼쪽 목록에 ✓)
const POIS=[
 {id:'battery',icon:'🗽',name:'배터리 파크',sub:'바다 건너 자유의 여신상이 보여요',R:0,F:-108,r:34,tp:[0,-106],look:[-160,-720]},
 {id:'bull',icon:'🐂',name:'월스트리트 황소',sub:'Charging Bull · 뿔을 만지면 행운이 온대요',R:0,F:24,r:13,tp:[3,15],look:[0,30]},
 {id:'trinity',icon:'⛪',name:'트리니티 교회',sub:'월스트리트 끝, 1846년 고딕 성당',R:-38,F:170,r:16,tp:[-28,168],look:[-60,172]},
 {id:'nyse',icon:'🏛',name:'뉴욕증권거래소',sub:'Broad St · 앞에는 두려움 없는 소녀',R:70,F:142,r:16,tp:[68,128],look:[52,146]},
 {id:'fedhall',icon:'🎩',name:'페더럴 홀',sub:'조지 워싱턴이 첫 대통령 선서를 한 곳',R:93,F:172,r:12,tp:[68,172],look:[93,192]},
 {id:'bridge',icon:'🌉',name:'브루클린 브릿지',sub:'1883년 · 나무 산책로를 걸어 강을 건너요',R:356,F:330,r:22,tp:[346,330],look:[420,330]},
 {id:'dumbo',icon:'🧱',name:'덤보 · 워싱턴 스트리트',sub:'길 끝 맨해튼 브릿지 탑 사이로 엠파이어 스테이트',R:845,F:500,r:34,tp:[845,470],look:[845,650]},
 {id:'carousel',icon:'🎠',name:'제인의 회전목마',sub:'브루클린 브릿지 파크 · 강가 유리 집',R:716,F:442,r:28,tp:[718,466],look:[716,440]},
 {id:'park',icon:'🌆',name:'브루클린 브릿지 파크',sub:'맨해튼 스카이라인과 자유의 여신상 전망',R:700,F:520,r:22,tp:[699,522],look:[300,330]}];
// 혼자 걷기(G): 이 순서로 걸어 간다
const TOUR=[[0,-106],[0,-40],[0,8],[0,150],[30,170],[66,170],[66,150],[66,170],[180,170],[190,190],[190,322],[236,330],[300,330],[370,330],[515,330],[660,330],[760,330],[805,330],[845,334],[845,480],[845,578],[845,545],[750,545],[728,520],[720,452],[699,470],[699,540]];
function build({T,scene,YC=3.8}){
 const g=new T.Group();g.name='nyc-landmarks';scene.add(g);
 const W=(R,F,y=0)=>new T.Vector3(R,y,-F);
 const fogMats=[],envMats=[];
 // 멀리 있는 명소 · 스카이라인은 안개를 덜 받게(uFogK) 해서 강 건너 · 바다 건너에서도 보이게 한다
 const fogK=(m,k)=>{if(k>=1)return m;const prev=m.onBeforeCompile;m.onBeforeCompile=(sh,r)=>{if(prev)prev(sh,r);sh.uniforms.uFogK={value:k};sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uFogK;').replace('#include <fog_fragment>',`#ifdef USE_FOG
 gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,smoothstep(fogNear,fogFar,vFogDepth*uFogK));
#endif`)};const key=m.customProgramCacheKey.bind(m);m.customProgramCacheKey=()=>key()+'fk'+k;fogMats.push(m);return m};
 const SM=(c,o={},k=1)=>fogK(new T.MeshStandardMaterial(Object.assign({color:c,roughness:.8},o)),k);
 const env=(m,k=.8)=>{m.userData.envK=k;envMats.push(m);return m};
 const add=(geo,mat,x,y,z,p=g,shadow=true)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;p.add(m);return m};
 const box=(p,x,y,z,w,h,d,mat,shadow)=>add(new T.BoxGeometry(w,h,d),mat,x,y,z,p,shadow);
 const cyl=(p,x,y,z,rt,rb,h,mat,n=16)=>add(new T.CylinderGeometry(rt,rb,h,n),mat,x,y,z,p);
 const ball=(p,x,y,z,r,mat,sx=1,sy=1,sz=1)=>{const m=add(new T.SphereGeometry(r,20,14),mat,x,y,z,p);m.scale.set(sx,sy,sz);return m};
 const beam=(p,a,b,r0,r1,mat,n=10)=>{const A=new T.Vector3(...a),B=new T.Vector3(...b),v=B.clone().sub(A),m=add(new T.CylinderGeometry(r1,r0,v.length(),n),mat,0,0,0,p);m.position.copy(A).add(B).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m};
 const tube=(p,pts,r,mat,seg=24)=>add(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(q=>new T.Vector3(...q))),seg,r,8,false),mat,0,0,0,p);
 const tex=(w,h,draw,rep)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;if(rep){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(...rep)}return t};
 let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
 const FONT='"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",Georgia,serif';
 const dmy=new T.Object3D(),cc=new T.Color();
 const inst=(geo,mat,list,f,shadow=true,p=g)=>{if(!list.length)return null;const m=new T.InstancedMesh(geo,mat,list.length);list.forEach((x,i)=>{dmy.position.set(0,0,0);dmy.rotation.set(0,0,0);dmy.scale.set(1,1,1);f(x,i);dmy.updateMatrix();m.setMatrixAt(i,dmy.matrix);if(x.c)m.setColorAt(i,cc.set(x.c))});m.castShadow=shadow;m.receiveShadow=true;p.add(m);return m};
 const glowTex=tex(64,64,(x)=>{const r=x.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.3,'rgba(255,255,255,.6)');r.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=r;x.fillRect(0,0,64,64)});
 const nightGlows=[];   // 밤에만 켜지는 점 불빛(다리 목걸이 조명 · 회전목마 · 횃불)
 const glowPts=(pts,color,size,k=1)=>{const geo=new T.BufferGeometry().setFromPoints(pts),m=new T.PointsMaterial({map:glowTex,color,size,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,sizeAttenuation:true});const o=new T.Points(geo,m);o.frustumCulled=false;o.visible=false;g.add(o);nightGlows.push({o,k});return o};

 // ── 물: 뉴욕항 · 이스트강 (물결 노멀 무늬가 천천히 흐른다)
 const waveN=(()=>{const cv=document.createElement('canvas');cv.width=cv.height=256;const x=cv.getContext('2d'),img=x.createImageData(256,256);
  const h=(i,j)=>Math.sin(i*.31+Math.sin(j*.17)*2)*.5+Math.sin(j*.23+i*.07)*.5+Math.sin((i+j)*.11)*.4;
  for(let j=0;j<256;j++)for(let i=0;i<256;i++){const dx=h(i+1,j)-h(i-1,j),dy=h(i,j+1)-h(i,j-1),k=(j*256+i)*4;img.data[k]=128+dx*60;img.data[k+1]=128+dy*60;img.data[k+2]=255;img.data[k+3]=255}
  x.putImageData(img,0,0);const t=new T.CanvasTexture(cv);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(180,180);return t})();
 const waterMat=env(SM('#2d5866',{roughness:.16,metalness:.12,normalMap:waveN,normalScale:new T.Vector2(.35,.35)},.55),1);
 const water=add(new T.PlaneGeometry(9000,9000).rotateX(-Math.PI/2),waterMat,300,.35,-300,g,false);water.receiveShadow=true;water.userData.noAO=true;

 // ── 땅(시내 장면 밖): 배터리 파크 · 브루클린 브릿지 파크 잔디 + 먼 땅(스카이라인 아래)
 const grassTex=tex(128,128,(x,w,h)=>{x.fillStyle='#6f9a4f';x.fillRect(0,0,w,h);for(let i=0;i<2600;i++){x.fillStyle=Math.random()<.5?'rgba(40,70,25,.25)':'rgba(170,200,110,.18)';x.fillRect(Math.random()*w,Math.random()*h,1.4,2.4)}},[1,1]);
 const grassMat=SM('#ffffff',{map:grassTex,roughness:.95});
 const paveTex=tex(128,128,(x,w,h)=>{x.fillStyle='#b9b3a6';x.fillRect(0,0,w,h);x.strokeStyle='rgba(60,55,50,.45)';x.lineWidth=2;for(let i=0;i<=4;i++){x.beginPath();x.moveTo(0,i*32);x.lineTo(w,i*32);x.stroke()}for(let j=0;j<4;j++)for(let i=0;i<=2;i++){const o=(j%2)*32;x.beginPath();x.moveTo(o+i*64,j*32);x.lineTo(o+i*64,j*32+32);x.stroke()}for(let i=0;i<900;i++){x.fillStyle='rgba(80,70,60,.12)';x.fillRect(Math.random()*w,Math.random()*h,2,2)}},[1,1]);
 const paveMat=SM('#ffffff',{map:paveTex,roughness:.85});
 const slab=(R0,R1,F0,F1,mat,y=YC,rep=10,p=g)=>{const geo=new T.BoxGeometry(R1-R0,y+1.2,F1-F0);const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*(R1-R0)/rep,uv.getY(i)*(F1-F0)/rep);const m=add(geo,mat,(R0+R1)/2,(y-1.2)/2,-(F0+F1)/2,p,false);return m};
 const grassSlabs=[];
 // 배터리 파크: 잔디 + 물가 산책로 + 볼링 그린 앞 광장으로 이어지는 길
 grassSlabs.push(slab(-200,330,-112,-22,grassMat,YC+.02));slab(-200,330,-124,-112,paveMat,YC+.12,4);slab(-10,10,-112,-22,paveMat,YC+.08,4);
 for(const [a,b] of [[-150,-60],[40,300]]){const m=slab(a,b,-74,-66,paveMat,YC+.08,4)}
 // 브루클린 브릿지 파크: 강가 산책로 + 잔디
 grassSlabs.push(slab(698,745,352,586,grassMat,YC+.02));slab(688,698,350,612,paveMat,YC+.12,4);slab(688,1010,586,612,paveMat,YC+.12,4);slab(698,745,505,515,paveMat,YC+.08,4);
 // 먼 땅: 맨해튼 서쪽 · 북쪽(차이나타운 · 시청) · 미드타운 · 브루클린 하이츠 · 다운타운 브루클린 · 저지시티 · 리버티섬은 따로
 const farMat=SM('#7d7f7a',{roughness:.95},.5);
 const LANDS=[[-430,-200,-124,440],[-430,330,440,960],[-650,1450,950,2700],[690,1010,-420,296],[1010,1750,-420,612],[-1400,-880,-500,1100]];
 for(const [a,b,c,d] of LANDS)slab(a,b,c,d,farMat,YC-.4,40);
 // 물가 난간(배터리 · 브루클린 파크)
 const railMat=SM('#2f3437',{metalness:.6,roughness:.4});
 const railLine=(a,b,step=2.4)=>{const L=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(L/step),pts=[];for(let i=0;i<=n;i++)pts.push([a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n]);
  inst(new T.CylinderGeometry(.06,.06,1.15,6).translate(0,.58,0),railMat,pts,q=>{dmy.position.copy(W(q[0],q[1],YC+.12))},false);
  for(const y of [.55,1.12]){const m=add(new T.BoxGeometry(L,.07,.07),railMat,(a[0]+b[0])/2,YC+.12+y,-(a[1]+b[1])/2,g,false);m.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0])}};
 railLine([-200,-123.5],[330,-123.5]);railLine([688.6,350],[688.6,611.5]);railLine([688.6,611.5],[1010,611.5]);
 // 공원 나무(잎 색은 계절을 따른다) · 벤치 · 가로등
 const trunkMat=SM('#5e4632'),crownMat=SM('#5f8a4a',{flatShading:true}),trees=[];
 for(let i=0;i<70;i++){const R=-190+rnd()*500,F=-108+rnd()*80;if(Math.abs(R)<16||(R>-150&&R<-90&&F>-90&&F<-50)||(F>-77&&F<-63))continue;trees.push({R,F,k:.9+rnd()*.6,r:rnd()*6})}
 for(let i=0;i<26;i++){const R=703+rnd()*38,F=360+rnd()*220;if(Math.abs(R-716)<14&&Math.abs(F-440)<16||Math.abs(F-510)<7)continue;trees.push({R,F,k:.8+rnd()*.5,r:rnd()*6})}
 inst(new T.CylinderGeometry(.18,.26,2.8,6).translate(0,1.4,0),trunkMat,trees,t=>{dmy.position.copy(W(t.R,t.F,YC));dmy.scale.setScalar(t.k)});
 inst(new T.IcosahedronGeometry(2,1).translate(0,4,0),crownMat,trees,t=>{dmy.position.copy(W(t.R,t.F,YC));dmy.scale.set(t.k,t.k*1.15,t.k);dmy.rotation.y=t.r});
 const benchMat=SM('#6b4a2e'),benches=[];for(let R=-180;R<320;R+=23)benches.push({R,F:-114,ry:Math.PI});for(let F=360;F<600;F+=24)benches.push({R:691.5,F,ry:Math.PI/2});
 inst(new T.BoxGeometry(2.4,.12,.7).translate(0,.62,0),benchMat,benches,b=>{dmy.position.copy(W(b.R,b.F,YC+.12));dmy.rotation.y=b.ry});
 inst(new T.BoxGeometry(2.4,.6,.1).translate(0,.95,.33),benchMat,benches,b=>{dmy.position.copy(W(b.R,b.F,YC+.12));dmy.rotation.y=b.ry});
 const lampMat=SM('#273036',{metalness:.5,roughness:.45}),lampBulb=new T.MeshStandardMaterial({color:'#fff4d6',emissive:'#ffe2a8',emissiveIntensity:.3}),parkLamps=[];
 for(let R=-188;R<325;R+=34)parkLamps.push([R,-118.5]);for(let F=356;F<606;F+=30)parkLamps.push([694,F]);for(let R=712;R<1004;R+=32)parkLamps.push([R,598]);
 inst(new T.CylinderGeometry(.09,.13,4.6,8).translate(0,2.3,0),lampMat,parkLamps,q=>dmy.position.copy(W(q[0],q[1],YC+.1)));
 inst(new T.SphereGeometry(.34,12,8).translate(0,4.85,0),lampBulb,parkLamps,q=>dmy.position.copy(W(q[0],q[1],YC+.1)),false);
 const lampGlows=glowPts(parkLamps.map(q=>W(q[0],q[1],YC+4.95)),'#ffd9a0',4.5,.85);
 // 망원경(동전 넣는 전망 망원경) — 자유의 여신상 쪽을 본다
 for(const R of [-40,20,80]){const tg=new T.Group();tg.position.copy(W(R,-120.5,YC+.12));tg.rotation.y=Math.atan2(-160-R,720-120);g.add(tg);cyl(tg,0,.6,0,.07,.1,1.2,railMat,8);const head=box(tg,0,1.3,0,.36,.34,.7,SM('#1f6d5a',{metalness:.5,roughness:.35}));head.rotation.x=-.2}

 // ── 캐슬 클린턴(배터리 파크의 둥근 붉은 돌 요새)
 const sand=SM('#a8735a',{roughness:.92});
 {const R=-120,F=-80,cg=new T.Group();cg.position.copy(W(R,F,YC));g.add(cg);
  const wall=new T.Mesh(new T.CylinderGeometry(17,17,8,40,1,true),SM('#ffffff',{map:tex(512,64,(x,w,h)=>{x.fillStyle='#a8735a';x.fillRect(0,0,w,h);x.strokeStyle='rgba(60,30,20,.35)';for(let y=0;y<h;y+=8){x.beginPath();x.moveTo(0,y);x.lineTo(w,y);x.stroke()}x.fillStyle='#2a1c16';for(let i=0;i<16;i++){x.fillRect(i*32+12,26,8,14)}}),side:T.DoubleSide,roughness:.9}));
  wall.position.y=4;wall.castShadow=true;wall.receiveShadow=true;cg.add(wall);
  const top=new T.Mesh(new T.TorusGeometry(17,.5,6,40).rotateX(Math.PI/2),sand);top.position.y=8;cg.add(top);
  const flag=box(cg,0,13,0,.15,10,.15,railMat);box(cg,1.4,17,0,2.6,1.5,.05,SM('#ffffff',{map:tex(128,72,usFlag)}))}
 function usFlag(x,w,h){for(let i=0;i<13;i++){x.fillStyle=i%2?'#ffffff':'#b22234';x.fillRect(0,i*h/13,w,h/13+1)}x.fillStyle='#3c3b6e';x.fillRect(0,0,w*.42,h*7/13);x.fillStyle='#ffffff';for(let j=0;j<5;j++)for(let i=0;i<6;i++){x.beginPath();x.arc(5+i*w*.068,4+j*h*.1,1.1*w/128,0,7);x.fill()}}

 // ── 볼링 그린: 브로드웨이 남쪽 끝 타원 잔디 · 철책 · 분수
 {const R=0,F=-4,rx=9.5,rz=12.5,og=new T.Group();og.position.copy(W(R,F,YC));g.add(og);
  const lawn=new T.Mesh(new T.CircleGeometry(1,40).rotateX(-Math.PI/2),grassMat);lawn.scale.set(rx,1,rz);lawn.position.y=.1;lawn.receiveShadow=true;og.add(lawn);grassSlabs.push(lawn);
  const fence=[];for(let i=0;i<72;i++){const a=i/72*Math.PI*2;fence.push([Math.cos(a)*rx,Math.sin(a)*rz])}
  inst(new T.CylinderGeometry(.05,.05,1.3,5).translate(0,.65,0),railMat,fence,q=>dmy.position.set(q[0],.1,q[1]),false,og);
  for(const y of [.6,1.25]){const ring=new T.Mesh(new T.TorusGeometry(1,.035,4,64).rotateX(Math.PI/2),railMat);ring.scale.set(rx,1,rz);ring.position.y=y;og.add(ring)}
  const fs=SM('#b5ada0',{roughness:.7});cyl(og,0,.45,0,3.2,3.4,.7,fs,28);const wtr=cyl(og,0,.82,0,2.95,2.95,.05,env(SM('#4f7d8a',{roughness:.08,metalness:.2}),1),28);cyl(og,0,1.4,0,.35,.5,1.4,fs,12);cyl(og,0,2.1,0,1.1,.3,.25,fs,16)}
 const fountainPts=new Float32Array(90*3),fountainGeo=new T.BufferGeometry();fountainGeo.setAttribute('position',new T.BufferAttribute(fountainPts,3));
 const fountain=new T.Points(fountainGeo,new T.PointsMaterial({map:glowTex,color:'#dfeef5',size:.35,transparent:true,opacity:.75,depthWrite:false}));fountain.frustumCulled=false;g.add(fountain);

 // ── 월스트리트 황소 (Charging Bull, 1989 · Arturo Di Modica): 브로드웨이 한가운데, 남쪽(배터리 파크)을 보고 돌진하는 청동 황소
 const bronze=env(SM('#6a4728',{metalness:.82,roughness:.36}),1),shiny=env(SM('#caa45c',{metalness:.92,roughness:.18}),1.1);
 const bull=new T.Group();bull.position.copy(W(0,30,YC+.24));g.add(bull);
 {box(bull,0,.12,0,3.4,.24,7.6,SM('#77736c',{roughness:.85}));const b=new T.Group();b.position.y=.24;bull.add(b);
  ball(b,0,2.25,1.15,1.45,bronze,1,1.05,1.15);ball(b,0,2.55,-1.35,1.3,bronze,.95,1,1.2);ball(b,0,2.35,-.1,1.32,bronze,1,.98,1.35);   // 가슴 · 엉덩이(번쩍 든) · 배
  ball(b,0,3.05,1.65,.95,bronze,1.05,.9,1.1);   // 목덜미 혹
  ball(b,0,1.75,3.05,.78,bronze,.92,.95,1.35);ball(b,0,1.28,3.75,.5,shiny,1,.9,1.05);   // 숙인 머리 · 반짝이는 코
  for(const s of [-1,1]){ball(b,s*.22,1.18,4.18,.09,SM('#2a1c12'));ball(b,s*.62,2.05,3.35,.12,SM('#1a120c'));ball(b,s*.75,2.3,2.85,.2,bronze,.6,1,1.2);
   tube(b,[[s*.5,2.15,3.05],[s*1.15,2.3,3.15],[s*1.55,2.55,3.55],[s*1.6,2.85,4.1]],.17,shiny,16);   // 뿔
   // 다리: 앞다리는 버티고(왼) 내딛고(오), 뒷다리는 박차고
   beam(b,[s*.7,2,1.6],[s*.75,1.05,s>0?2.1:2.5],.36,.3,bronze);beam(b,[s*.75,1.05,s>0?2.1:2.5],[s*.7,.12,s>0?2.4:3.1],.28,.22,bronze);ball(b,s*.7,.12,s>0?2.45:3.15,.27,shiny,1,.6,1.3);
   beam(b,[s*.72,2.4,-1.8],[s*.8,1.2,s>0?-2.6:-2.2],.4,.3,bronze);beam(b,[s*.8,1.2,s>0?-2.6:-2.2],[s*.72,.12,s>0?-2.3:-1.7],.26,.22,bronze);ball(b,s*.72,.12,s>0?-2.25:-1.65,.26,shiny,1,.6,1.3)}
  tube(b,[[0,3.2,-2.55],[.15,3.9,-3.05],[.45,4.3,-2.85],[.2,4.25,-2.2],[-.2,4.45,-1.9]],.13,bronze,20);ball(b,-.22,4.5,-1.85,.2,bronze,1,1.4,1);   // 채찍처럼 휘두른 꼬리
  b.traverse(o=>{if(o.isMesh)o.castShadow=true})}
 // ── 두려움 없는 소녀(Fearless Girl): 증권거래소 앞 Broad St 에서 거래소를 마주 보고 허리에 손
 {const fg=new T.Group();fg.position.copy(W(70,150,YC+.02));fg.rotation.y=-Math.PI/2;g.add(fg);box(fg,0,.08,0,1.4,.16,1.4,SM('#6f6b65'));
  const z=new T.Group();z.position.y=.16;z.scale.setScalar(1.35);fg.add(z);
  for(const s of [-1,1]){beam(z,[s*.09,0,0],[s*.13,.55,0],.055,.06,bronze,8);ball(z,s*.13,.04,.05,.07,bronze,1,.6,1.6)}
  cyl(z,0,.68,0,.12,.27,.36,bronze,14);cyl(z,0,.98,0,.13,.13,.34,bronze,12);ball(z,0,1.3,0,.14,bronze);ball(z,0,1.36,-.15,.07,bronze,.8,.8,1.4);beam(z,[0,1.36,-.18],[0,1.08,-.22],.05,.03,bronze,6);
  for(const s of [-1,1]){beam(z,[s*.14,1.12,0],[s*.3,.9,.05],.04,.035,bronze,6);beam(z,[s*.3,.9,.05],[s*.15,.82,.04],.035,.03,bronze,6)}
  z.traverse(o=>{if(o.isMesh)o.castShadow=true})}

 // ── 뉴욕증권거래소: Broad St 서쪽, 코린트식 기둥 6개 · 삼각 박공 · 성조기
 const marble=SM('#e3ddcf',{roughness:.7}),marble2=SM('#cfc8b9',{roughness:.75});
 {const R0=33,R1=59.6,F0=117,F1=160,ng=g;box(ng,(R0+R1)/2-1.5,YC+16,-(F0+F1)/2,R1-R0-3,32,F1-F0,marble2);
  box(ng,R1-1.4,YC+2,-(F0+F1)/2,2.8,4,F1-F0-2,marble);   // 기둥 받침
  for(let i=0;i<6;i++){const F=F0+6+i*(F1-F0-12)/5;cyl(ng,R1-1.2,YC+4+8.5,-F,.85,.95,17,marble,16);box(ng,R1-1.2,YC+21.4,-F,2.1,.8,2.1,marble);box(ng,R1-1.2,YC+4.2,-F,2,.4,2,marble)}
  box(ng,R1-1.2,YC+23,-(F0+F1)/2,3.2,2.4,F1-F0-2,marble);
  const sh=new T.Shape();sh.moveTo(-(F1-F0)/2+1,0);sh.lineTo((F1-F0)/2-1,0);sh.lineTo(0,6);sh.closePath();const ped=new T.Mesh(new T.ExtrudeGeometry(sh,{depth:3,bevelEnabled:false}),marble);ped.rotation.y=Math.PI/2;ped.position.set(R1-2.8,YC+24.2,-(F0+F1)/2);ped.castShadow=true;g.add(ped);
  const sign=new T.Mesh(new T.PlaneGeometry(F1-F0-4,1.6),new T.MeshStandardMaterial({map:tex(1024,64,(x,w,h)=>{x.fillStyle='#d9d2c2';x.fillRect(0,0,w,h);x.fillStyle='#3a3a3a';x.font=`600 40px ${FONT}`;x.textAlign='center';x.fillText('NEW YORK STOCK EXCHANGE',w/2,46)}),roughness:.7}));sign.position.set(R1+.42,YC+23,-(F0+F1)/2);sign.rotation.y=Math.PI/2;g.add(sign);
  const flag=new T.Mesh(new T.PlaneGeometry(30,16),new T.MeshStandardMaterial({map:tex(512,272,usFlag),roughness:.85,side:T.DoubleSide}));flag.position.set(R1-2.7,YC+12.5,-(F0+F1)/2);flag.rotation.y=Math.PI/2;g.add(flag);
  const rf=box(g,R0+8,YC+38,-(F0+F1)/2,.2,12,.2,railMat);box(g,R0+8,YC+42,-(F0+F1)/2+1.9,.05,2.2,3.8,SM('#ffffff',{map:tex(128,72,usFlag),side:T.DoubleSide})).rotation.y=Math.PI/2}
 // ── 페더럴 홀: 월스트리트 북쪽, 도리아식 기둥 8개 · 큰 계단 · 조지 워싱턴 동상
 {const R0=81,R1=106,F0=181,F1=206;box(g,(R0+R1)/2,YC+11,-(F0+8+F1)/2,R1-R0,22,F1-F0-8,marble2);
  for(let i=0;i<6;i++)box(g,(R0+R1)/2,YC+.25*(i+1),-(F0+.45+i*.9),R1-R0,.5*(i+1),.9,marble);   // 큰 계단
  box(g,(R0+R1)/2,YC+1.5,-(F0+5.4+1.3),R1-R0,3,2.6,marble);
  for(let i=0;i<8;i++){const R=R0+1.8+i*(R1-R0-3.6)/7;cyl(g,R,YC+3+7,-(F0+6.6),.75,.82,14,marble,16)}
  box(g,(R0+R1)/2,YC+18,-(F0+6.9),R1-R0,2,3,marble);
  const sh=new T.Shape();sh.moveTo(-(R1-R0)/2,0);sh.lineTo((R1-R0)/2,0);sh.lineTo(0,4.2);sh.closePath();const ped=new T.Mesh(new T.ExtrudeGeometry(sh,{depth:3,bevelEnabled:false}),marble);ped.position.set((R0+R1)/2,YC+19,-(F0+8.4));ped.castShadow=true;g.add(ped);
  // 워싱턴 동상(청동, 계단 아래쪽 받침 위)
  const wg=new T.Group();wg.position.copy(W((R0+R1)/2,F0+2.6,YC));wg.rotation.y=0;g.add(wg);box(wg,0,1.5,0,2.4,3,2.4,SM('#a29a8c'));
  const s=new T.Group();s.position.y=3;s.scale.setScalar(1.6);wg.add(s);cyl(s,0,.9,0,.32,.45,1.6,bronze,12);cyl(s,0,1.95,0,.3,.32,.6,bronze,12);ball(s,0,2.45,0,.2,bronze);beam(s,[.3,2.1,0],[.55,1.5,.3],.08,.07,bronze,6);beam(s,[-.3,2.1,0],[-.35,1.45,.1],.08,.07,bronze,6);cyl(s,.06,1.1,.35,.5,.5,.9,bronze,10).rotation.z=.3;
  s.traverse(o=>{if(o.isMesh)o.castShadow=true})}
 // ── 트리니티 교회: 월스트리트 서쪽 끝(브로드웨이 건너) · 갈색 사암 고딕 · 첨탑 · 묘지
 const brown=SM('#6d5249',{roughness:.88}),brownD=SM('#55403a',{roughness:.9}),roofM=SM('#3d3a3c',{roughness:.7});
 {const gothic=tex(128,256,(x,w,h)=>{x.fillStyle='#6d5249';x.fillRect(0,0,w,h);x.strokeStyle='rgba(30,18,14,.35)';for(let y=0;y<h;y+=10){x.beginPath();x.moveTo(0,y);x.lineTo(w,y);x.stroke()}
   x.fillStyle='#2a3448';x.beginPath();x.moveTo(40,200);x.lineTo(40,90);x.quadraticCurveTo(40,50,64,34);x.quadraticCurveTo(88,50,88,90);x.lineTo(88,200);x.fill();x.strokeStyle='#4d3a33';x.lineWidth=4;x.beginPath();x.moveTo(64,40);x.lineTo(64,200);x.moveTo(40,120);x.lineTo(88,120);x.stroke()},[1,1]);
  const win=SM('#ffffff',{map:gothic,roughness:.85});
  const nave=box(g,-73,YC+8,-170,30,16,16,win);
  const sh=new T.Shape();sh.moveTo(-8.4,0);sh.lineTo(8.4,0);sh.lineTo(0,7.5);sh.closePath();const roof=new T.Mesh(new T.ExtrudeGeometry(sh,{depth:30,bevelEnabled:false}),roofM);roof.rotation.y=Math.PI/2;roof.position.set(-88,YC+16,-170);roof.castShadow=true;g.add(roof);
  box(g,-55,YC+21,-170,10,42,11,win);for(const y of [14,28,40])box(g,-55,YC+y,-170,10.6,.6,11.6,brownD);
  for(const [dx,dz] of [[-5,-5.5],[5,-5.5],[-5,5.5],[5,5.5]]){cyl(g,-55+dx,YC+45,-170+dz,.25,.5,6,brownD,6)}
  const sp=add(new T.ConeGeometry(5.6,32,4),brown,-55,YC+42+16,-170);sp.rotation.y=Math.PI/4;add(new T.CylinderGeometry(.06,.06,3,6),railMat,-55,YC+75.5,-170);box(g,-55,YC+75.8,-170,1.2,.12,.12,railMat);
  const door=new T.Mesh(new T.PlaneGeometry(4,8),new T.MeshStandardMaterial({map:tex(64,128,(x,w,h)=>{x.fillStyle='#6d5249';x.fillRect(0,0,w,h);x.fillStyle='#3a2a20';x.beginPath();x.moveTo(8,h);x.lineTo(8,50);x.quadraticCurveTo(8,14,32,6);x.quadraticCurveTo(56,14,56,50);x.lineTo(56,h);x.fill();x.fillStyle='#c7a34a';x.fillRect(30,80,4,4)}),roughness:.8}));door.position.set(-49.94,YC+4,-170);door.rotation.y=Math.PI/2;g.add(door);
  const clock=new T.Mesh(new T.CircleGeometry(1.7,24),new T.MeshStandardMaterial({color:'#f2ead2',emissive:'#ffefc0',emissiveIntensity:.1}));clock.position.set(-49.94,YC+33,-170);clock.rotation.y=Math.PI/2;g.add(clock);
  const grass2=slab(-100,-50,146,196,grassMat,YC+.03);grassSlabs.push(grass2);nave.position.y+=0;
  const stones=[];for(let i=0;i<70;i++){const R=-98+rnd()*46,F=148+rnd()*46;if(R>-90&&R<-48&&F>159&&F<181)continue;stones.push({R,F,r:(rnd()-.5)*.4,k:.7+rnd()*.6})}
  inst(new T.BoxGeometry(.9,1.2,.18).translate(0,.6,0),SM('#9a978f',{roughness:.9}),stones,s=>{dmy.position.copy(W(s.R,s.F,YC));dmy.rotation.set(0,Math.PI/2+s.r,s.r*.3);dmy.scale.setScalar(s.k)})}

 // ── 하늘 · 먼 빌딩 창문(밤엔 불이 켜진다): 스카이라인 상자들
 const NIGHT={value:0};
 const winMat=(k)=>{const m=SM('#ffffff',{roughness:.6,metalness:.2},k);const prev=m.onBeforeCompile;m.onBeforeCompile=(sh,r)=>{prev&&prev(sh,r);sh.uniforms.uNight=NIGHT;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;varying vec3 vWN;').replace('#include <begin_vertex>',`#include <begin_vertex>
vec4 wpp=vec4(transformed,1.);vec3 wn=objectNormal;
#ifdef USE_INSTANCING
wpp=instanceMatrix*wpp;wn=mat3(instanceMatrix)*wn;
#endif
wpp=modelMatrix*wpp;vWP=wpp.xyz;vWN=normalize(wn);`);
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;varying vec3 vWN;uniform float uNight;float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}').replace('#include <color_fragment>',`#include <color_fragment>
float wm=0.,lw=0.;if(abs(vWN.y)<.5){float a=abs(vWN.x)>.5?vWP.z:vWP.x;vec2 c=vec2(a/3.2,(vWP.y-3.8)/4.);vec2 f=fract(c),id=floor(c);lw=h21(id+floor(vWP.xz*.01));
 wm=step(.18,f.x)*step(f.x,.82)*step(.25,f.y)*step(f.y,.85)*step(1.,c.y);diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*.45+vec3(.08,.11,.15),wm*.8);}else diffuseColor.rgb*=.7;`).replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=wm*step(.45,lw)*uNight*mix(vec3(1.,.72,.4),vec3(.7,.84,1.),step(.85,lw))*1.3;')};
  const key=m.customProgramCacheKey.bind(m);m.customProgramCacheKey=()=>key()+'win';return m};
 const skyMat=winMat(.42);
 const skyList=[],farFree=[];
 const blocked=(R,F,list)=>list.some(([a,b,c,d])=>R>a&&R<b&&F>c&&F<d);
 const NOSKY=[[-200,330,-130,440],[300,700,-2000,3000],[680,1010,296,640],[740,1080,440,640],[400,520,880,1000],[-200,-140,315,365]];
 const addSky=(R,F,w,d,h,col)=>{if(blocked(R,F,NOSKY))return;skyList.push({R,F,w,d,h,c:col})};
 const COLS=['#8d8a83','#a39d92','#6f7b86','#5b6b78','#b6ab98','#7c6f63','#94a3ad','#9c8c78','#c2b8a6'];
 const BRICK=['#8f4e3d','#a8604a','#7f6f62','#a2765a','#94634f'];
 for(let i=0;i<260;i++){const R=-420+rnd()*740,F=450+rnd()*490;addSky(R,F,10+rnd()*14,10+rnd()*14,18+Math.pow(rnd(),2)*120,COLS[Math.floor(rnd()*COLS.length)])}
 for(let i=0;i<70;i++){const R=-420+rnd()*210,F=-110+rnd()*550;addSky(R,F,12+rnd()*14,12+rnd()*14,30+Math.pow(rnd(),1.5)*130,COLS[Math.floor(rnd()*COLS.length)])}
 for(let i=0;i<520;i++){const R=-640+rnd()*2080,F=960+rnd()*1700,mid=Math.exp(-(((F-1800)/600)**2))*Math.exp(-(((R-600)/700)**2));addSky(R,F,12+rnd()*16,12+rnd()*16,25+rnd()*(60+200*mid),COLS[Math.floor(rnd()*COLS.length)])}
 for(let i=0;i<380;i++){const R=700+rnd()*1040,F=-410+rnd()*1010,dt=Math.exp(-(((R-1250)/180)**2))*Math.exp(-(((F+60)/200)**2));if(R<1010&&F>296)continue;addSky(R,F,10+rnd()*12,10+rnd()*12,10+rnd()*22+dt*rnd()*150,dt>.3?COLS[Math.floor(rnd()*COLS.length)]:BRICK[Math.floor(rnd()*BRICK.length)])}
 for(let i=0;i<150;i++){const R=-1380+rnd()*480,F=-480+rnd()*1560;addSky(R,F,14+rnd()*16,14+rnd()*16,20+Math.pow(rnd(),1.6)*180,COLS[Math.floor(rnd()*COLS.length)])}
 inst(new T.BoxGeometry(1,1,1).translate(0,.5,0),skyMat,skyList,s=>{dmy.position.copy(W(s.R,s.F,YC-.4));dmy.scale.set(s.w,s.h,s.d)},false);
 // 엠파이어 스테이트 빌딩(워싱턴 스트리트 끝, 맨해튼 브릿지 탑 아치 사이로 보인다) · 크라이슬러
 const deco=SM('#b9b2a2',{roughness:.6},.38),decoW=winMat(.38);
 {const R=845,F=1750,eg=new T.Group();eg.position.copy(W(R,F,YC-.4));g.add(eg);
  for(const [w,h0,h1] of [[48,0,20],[36,20,190],[30,190,215],[24,215,250],[18,250,262],[10,262,272]]){const m=add(new T.BoxGeometry(w,h1-h0,w*.75),decoW,0,(h0+h1)/2,0,eg,false);m.material.color.set('#c4bcaa')}
  cyl(eg,0,280,0,3.2,4.2,16,deco,8);cyl(eg,0,300,0,.6,1.6,26,deco,8);
  const top=glowPts([new T.Vector3(R,YC+262,-F),new T.Vector3(R,YC+280,-F)],'#fff1c2',30,1)}
 {const R=960,F=1930,cg=new T.Group();cg.position.copy(W(R,F,YC-.4));g.add(cg);add(new T.BoxGeometry(26,190,26),decoW,0,95,0,cg,false);
  for(let i=0;i<6;i++)add(new T.CylinderGeometry(11-i*1.8,12-i*1.8,8,16,1,false,0,Math.PI*2),env(SM('#d8dde2',{metalness:.85,roughness:.25},.38)),0,194+i*7,0,cg,false);cyl(cg,0,250,0,.2,1.2,24,deco,6)}
 // 원 월드 트레이드 센터: 정사각 바닥에서 위로 45° 돌아가며 좁아지는 유리 탑 + 첨탑
 const glassT=env(SM('#7f9bb2',{metalness:.75,roughness:.12},.6),1.2);
 {const R=-165,F=340,H=330,b=15,t=10.5,pos=[],idx=[];const B=[],Tt=[];for(let k=0;k<4;k++){const a=Math.PI/4+k*Math.PI/2,a2=k*Math.PI/2;B.push([Math.cos(a)*b*Math.SQRT2,Math.sin(a)*b*Math.SQRT2]);Tt.push([Math.cos(a2)*t*Math.SQRT2,Math.sin(a2)*t*Math.SQRT2])}
  const P=(p,y)=>{pos.push(p[0],y,p[1]);return pos.length/3-1};
  for(let k=0;k<4;k++){const k1=(k+1)%4,a=P(B[k],30),c=P(B[k1],30),d=P(Tt[k1],H);idx.push(a,d,c);const e=P(Tt[k],H),f=P(B[k],30),h=P(Tt[k1],H);idx.push(e,h,f)}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(idx);const ng=geo.toNonIndexed();ng.computeVertexNormals();
  const tw=new T.Group();tw.position.copy(W(R,F,YC));g.add(tw);add(ng,glassT,0,0,0,tw,true);add(new T.BoxGeometry(b*2,30,b*2),glassT,0,15,0,tw);
  add(new T.CylinderGeometry(t*1.42,t*1.42,4,4),SM('#9aa4ab',{metalness:.6},.6),0,H+2,0,tw).rotation.y=Math.PI/4;add(new T.CylinderGeometry(.5,1.4,90,8),SM('#d0d4d7',{metalness:.7,roughness:.3},.6),0,H+49,0,tw);
  glowPts([new T.Vector3(R,YC+H+94,-F)],'#ffffff',22,1)}

 // ── 브루클린 브릿지
 const stone=SM('#b4a284',{roughness:.9},.55),stoneD=SM('#8f7f66',{roughness:.92},.55),steel=SM('#3d4246',{metalness:.55,roughness:.5},.55),cableMat=SM('#d6cfbd',{roughness:.55,metalness:.3},.55);
 const planks=tex(128,128,(x,w,h)=>{x.fillStyle='#8a6a48';x.fillRect(0,0,w,h);for(let i=0;i<16;i++){const c=110+((i*37)%40);x.fillStyle=`rgb(${c+20},${c-8},${c-40})`;x.fillRect(0,i*8,w,7);x.fillStyle='rgba(40,25,10,.35)';x.fillRect(0,i*8+7,w,1)}},[1,1]);
 const plankMat=SM('#ffffff',{map:planks,roughness:.85},.7),roadMat=SM('#5b5d60',{roughness:.9},.6);
 // 길이 방향(R)으로 늘어선 띠(위 · 옆면): y(R) 을 따라간다
 const strip=(R0,R1,f0,f1,yf,thick,mat,uvR=2,uvF=2,step=2)=>{const pos=[],uv=[],idx=[];const n=Math.ceil((R1-R0)/step);
  for(let i=0;i<=n;i++){const R=R0+(R1-R0)*i/n,y=yf(R);for(const [f,yy] of [[f0,y],[f1,y],[f0,y-thick],[f1,y-thick]]){pos.push(R,yy,-f);uv.push(R/uvR,f/uvF)}}
  for(let i=0;i<n;i++){const a=i*4,b=a+4;idx.push(a,b,a+1,a+1,b,b+1);idx.push(a+2,a+3,b+2,a+3,b+3,b+2);idx.push(a,a+2,b,a+2,b+2,b);idx.push(a+1,b+1,a+3,a+3,b+1,b+3)}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();const m=add(geo,mat,0,0,0,g,true);return m};
 const BY=R=>bridgeY(R,YC),F0=BBR.F;
 strip(BBR.R0-2,BBR.R1+2,F0-BBR.W,F0+BBR.W,R=>BY(R)+.02,.35,plankMat,1,1.6);   // 가운데 나무 산책로
 for(const s of [-1,1]){strip(BBR.R0+18,BBR.R1-14,F0+s*3.1,F0+s*10.2,R=>BY(R)-1.7,.3,roadMat,6,6);   // 양쪽 차도(차는 다니지 않는다)
  strip(BBR.R0+18,BBR.R1-14,F0+s*10.2,F0+s*10.6,R=>BY(R)-.8,3.6,steel,6,6);strip(BBR.T1-30,BBR.T2+30,F0+s*3.1,F0+s*3.4,R=>BY(R)-1.2,2.4,steel,6,6);   // 바깥 보강 트러스 · 안쪽 칸막이
  strip(BBR.R0,BBR.R1,F0+s*(BBR.W-.05),F0+s*(BBR.W+.05),R=>BY(R)+1.18,.1,railMat,4,4)}   // 난간 위 손잡이
 {const posts=[];for(let R=BBR.R0;R<=BBR.R1;R+=2.2)for(const s of [-1,1])if(Math.abs(R-BBR.T1)>9&&Math.abs(R-BBR.T2)>9)posts.push({R,F:F0+s*BBR.W});
  inst(new T.BoxGeometry(.09,1.2,.09).translate(0,.6,0),railMat,posts,q=>dmy.position.copy(W(q.R,q.F,BY(q.R))),false);
  // 산책로 가로등(옛 모양) · 벤치 같은 쉼터는 탑 둘레
  const pl=[];for(let R=BBR.R0+30;R<BBR.R1-10;R+=36)if(Math.abs(R-BBR.T1)>14&&Math.abs(R-BBR.T2)>14)pl.push({R,F:F0+(Math.round(R/36)%2?BBR.W-.3:-(BBR.W-.3))});
  inst(new T.CylinderGeometry(.07,.11,3.6,8).translate(0,1.8,0),lampMat,pl,q=>dmy.position.copy(W(q.R,q.F,BY(q.R))));
  inst(new T.SphereGeometry(.3,10,8).translate(0,3.8,0),lampBulb,pl,q=>dmy.position.copy(W(q.R,q.F,BY(q.R))),false);
  glowPts(pl.map(q=>W(q.R,q.F,BY(q.R)+3.85)),'#ffdca8',3.6,.9)}
 // 돌 진입로(맨해튼 · 브루클린 땅 위) — 아치 무늬 벽
 const archTex=tex(128,64,(x,w,h)=>{x.fillStyle='#b4a284';x.fillRect(0,0,w,h);x.strokeStyle='rgba(70,55,40,.3)';for(let y=0;y<h;y+=6){x.beginPath();x.moveTo(0,y);x.lineTo(w,y);x.stroke()}x.fillStyle='#4a3e33';x.beginPath();x.moveTo(30,h);x.lineTo(30,30);x.quadraticCurveTo(30,8,64,6);x.quadraticCurveTo(98,8,98,30);x.lineTo(98,h);x.fill()});
 const archMat=SM('#ffffff',{map:archTex,roughness:.9},.55);
 for(const [a,b,floor] of [[254,330,YC],[700,792,YC]])for(let R=a;R<b;R+=10){const top=BY(R+5)-2.1;if(top-floor<2)continue;box(g,R+5,(top+floor)/2,-F0,10,top-floor,24,archMat)}
 // 앵커리지(케이블을 잡아 두는 큰 돌덩이)
 const ANCH=[[286,318],[722,756]];for(const [a,b] of ANCH){const top=Math.min(BY(a),BY(b))-2.2;box(g,(a+b)/2,(top+YC)/2,-F0,b-a,top-YC,36,stone);box(g,(a+b)/2,top+.4,-F0,b-a+1,.8,37,stoneD)}
 // 탑: 물속 받침 + 갑판 위 고딕 쌍아치(뾰족 아치 구멍 두 개) + 처마
 const TW=[BBR.T1,BBR.T2],TOP=72,CT=74.6;
 for(const R of TW){box(g,R,13,-F0,20,27,42,stoneD);box(g,R,.6,-F0,24,1.6,46,stoneD,false);
  const sh=new T.Shape();sh.moveTo(-18,0);sh.lineTo(18,0);sh.lineTo(17.2,TOP-26-2);sh.lineTo(-17.2,TOP-26-2);sh.closePath();
  for(const [a,b] of [[-15.5,-3],[3,15.5]]){const h=new T.Path(),c=(a+b)/2,hw=(b-a)/2;h.moveTo(a,0);h.lineTo(b,0);h.lineTo(b,20);h.quadraticCurveTo(b,25,c,28.5);h.quadraticCurveTo(a,25,a,20);h.closePath();sh.holes.push(h)}
  const geo=new T.ExtrudeGeometry(sh,{depth:13,bevelEnabled:false});geo.translate(0,0,-6.5);geo.rotateY(Math.PI/2);const m=add(geo,stone,R,26.5,-F0);
  box(g,R,TOP-1.2,-F0,15,2,38,stoneD);box(g,R,TOP+.6,-F0,13,1.6,35,stone);
  for(const f of [-9.6,-3.6,3.6,9.6])box(g,R,TOP+2.4,-(F0+f),6,2.2,2,stoneD);}
 // 탑 둘레 전망대(산책로가 아치 사이로 갈라진다)
 for(const R of TW){strip(R-11,R+11,F0-15.5,F0+15.5,()=>BY(R)+.02,.35,plankMat,1,1.6);}
 // 케이블 4줄 · 수직 현수선 · 탑에서 퍼지는 대각 사선(브루클린 브릿지의 거미줄)
 const CF=[F0-9.6,F0-3.6,F0+3.6,F0+9.6];const ANC=[[296,BY(296)+2],[748,BY(748)+2]];
 const cableY=R=>{if(R>=BBR.T1&&R<=BBR.T2){const m=(BBR.T1+BBR.T2)/2,h=(BBR.T2-BBR.T1)/2;return 38+(CT-38)*((R-m)/h)**2}
  const [a,y0,t]=R<BBR.T1?[ANC[0][0],ANC[0][1],(R-ANC[0][0])/(BBR.T1-ANC[0][0])]:[ANC[1][0],ANC[1][1],(ANC[1][0]-R)/(ANC[1][0]-BBR.T2)];return y0+(CT-y0)*t-5*Math.sin(Math.PI*t)};
 const linePos=[],necklace=[];
 for(const f of CF){const pts=[];for(let R=ANC[0][0];R<=ANC[1][0];R+=4)pts.push([R,cableY(R),-f]);tube(g,pts,.42,cableMat,160);
  const deckAt=R=>BY(R)-(Math.abs(f-F0)>6?1.5:.2);
  for(let R=ANC[0][0]+4;R<ANC[1][0]-2;R+=4.5){if(Math.abs(R-BBR.T1)<7||Math.abs(R-BBR.T2)<7)continue;const y=cableY(R),d=deckAt(R);if(y-d>.6)linePos.push(R,y,-f,R,d,-f)}
  for(const R of TW)for(const s of [-1,1])for(let k=1;k<=13;k++){const R2=R+s*(8+k*9.5);if(R2<ANC[0][0]+6||R2>ANC[1][0]-6)continue;linePos.push(R,TOP-2-k*.35,-f,R2,deckAt(R2),-f)}
  if(Math.abs(f-F0)>6)for(let R=ANC[0][0]+2;R<ANC[1][0];R+=7)necklace.push(W(R,cableY(R)+.6,f))}
 {const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(linePos,3));const ls=new T.LineSegments(geo,fogK(new T.LineBasicMaterial({color:'#cfc8b4',transparent:true,opacity:.85}),.55));g.add(ls)}
 glowPts(necklace,'#fff0c8',2.6,1);

 // ── 맨해튼 브릿지(파란 회색 강철): 덤보 워싱턴 스트리트 끝 강 위에 브루클린 탑
 const mbSteel=env(SM('#6c8797',{metalness:.55,roughness:.45},.5),.6),mbDark=SM('#3e505b',{metalness:.5,roughness:.55},.5);
 {const mg=new T.Group(),[bx,bf]=MB.B,[dx,df]=MB.dir;mg.position.copy(W(bx,bf,0));mg.rotation.y=-Math.atan2(-df,dx);g.add(mg);   // 지역 x = 다리 방향(t), z = 옆
  const L=MB.A1-MB.A0,mid=(MB.A0+MB.A1)/2;
  const lattice=tex(256,64,(x,w,h)=>{x.clearRect(0,0,w,h);x.strokeStyle='#3e505b';x.lineWidth=5;x.strokeRect(2,2,w-4,h-4);x.beginPath();for(let i=0;i<=8;i++){x.moveTo(i*32,0);x.lineTo(i*32+32,h);x.moveTo(i*32+32,0);x.lineTo(i*32,h)}x.stroke()});lattice.wrapS=T.RepeatWrapping;lattice.repeat.set(L/24,1);
  add(new T.BoxGeometry(L,1.2,26),mbDark,mid,MB.D-.6,0,mg);add(new T.BoxGeometry(L,.3,25),roadMat,mid,MB.D+.15,0,mg);
  for(const s of [-1,1]){const side=new T.Mesh(new T.PlaneGeometry(L,7),fogK(new T.MeshStandardMaterial({map:lattice,transparent:true,alphaTest:.4,side:T.DoubleSide,color:'#7b95a4',metalness:.4,roughness:.5}),.5));side.position.set(mid,MB.D-3.5,s*13);mg.add(side)}
  add(new T.BoxGeometry(L,.6,.6),mbDark,mid,MB.D-7,13,mg);add(new T.BoxGeometry(L,.6,.6),mbDark,mid,MB.D-7,-13,mg);
  // 탑: 다리 양옆 기둥 두 개(아래 돌 받침) · 가로 보 · X 가새 · 위 아치 왕관
  for(const t of [0,MB.T2]){add(new T.BoxGeometry(16,8,40),stoneD,t,2,0,mg);
   for(const s of [-1,1]){add(new T.BoxGeometry(5,92,4.4),mbSteel,t,46+4,s*15.5,mg);add(new T.BoxGeometry(6.4,3,5.8),mbSteel,t,97,s*15.5,mg);add(new T.SphereGeometry(1.6,12,8),mbSteel,t,100,s*15.5,mg);add(new T.ConeGeometry(.5,3,8),mbSteel,t,102.5,s*15.5,mg)}
   for(const y of [MB.D-8,58,80])add(new T.BoxGeometry(3.6,2.6,31),mbSteel,t,y,0,mg);
   for(const [y0,y1] of [[MB.D-6,56],[60,78]])for(const s of [-1,1]){const a=new T.Vector3(t,y0,-15*s),b=new T.Vector3(t,y1,15*s),m=add(new T.BoxGeometry(1.1,a.distanceTo(b),1.1),mbSteel,t,(y0+y1)/2,0,mg);m.rotation.x=Math.atan2(30*s,y1-y0)}
   const arch=add(new T.TorusGeometry(15.5,1.1,8,24,Math.PI),mbSteel,t,84,0,mg);arch.rotation.y=Math.PI/2}
  // 브루클린 땅 위 진입로: 돌 아치 다리(덤보 '아치웨이') · 끝 앵커리지
  for(let t=66;t<MB.A1-20;t+=14)add(new T.BoxGeometry(14,MB.D-1.2-YC,24),archMat,t+7,(MB.D-1.2+YC)/2,0,mg);
  add(new T.BoxGeometry(34,MB.D+4,40),stone,MB.A1-10,(MB.D+4)/2,0,mg);add(new T.BoxGeometry(34,MB.D+4,40),stone,MB.A0+10,(MB.D+4)/2,0,mg);
  // 케이블 4줄 · 현수선 · 목걸이 조명
  const CZ=[-12.6,-10.6,10.6,12.6],my=t=>{if(t>=MB.T2&&t<=0){const m=MB.T2/2;return 40+(96-40)*((t-m)/(-m))**2}const [a,b]=t>0?[0,MB.A1-14]:[MB.A0+14,MB.T2],u=t>0?(t-a)/(b-a):(b-t)/(b-a);return 96+(MB.D+5-96)*u-6*Math.sin(Math.PI*u)};
  const lp=[],nk=[];for(const z of CZ){const pts=[];for(let t=MB.A0+14;t<=MB.A1-14;t+=5)pts.push([t,my(t),z]);tube(mg,pts,.5,mbSteel,140);
   for(let t=MB.A0+18;t<MB.A1-16;t+=6){if(Math.abs(t)<4||Math.abs(t-MB.T2)<4)continue;const y=my(t);if(y-MB.D>.8)lp.push(t,y,z,t,MB.D,z)}
   if(Math.abs(z)>11)for(let t=MB.A0+16;t<MB.A1-14;t+=8)nk.push(new T.Vector3(t,my(t)+.6,z))}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(lp,3));mg.add(new T.LineSegments(geo,fogK(new T.LineBasicMaterial({color:'#5d7380',transparent:true,opacity:.85}),.5)));
  mg.updateMatrixWorld(true);glowPts(nk.map(v=>v.applyMatrix4(mg.matrixWorld)),'#e9f2ff',3.2,1)}

 // ── 자유의 여신상: 리버티섬(별 모양 요새 · 화강암 받침) 위 구리빛 초록 여신, 오른손 횃불 · 왼손 독립선언서
 const copper=env(SM('#79b4a0',{metalness:.35,roughness:.55},.32),.7),granite=SM('#b9b2a4',{roughness:.85},.32),flame=new T.MeshStandardMaterial({color:'#ffcf5a',emissive:'#ffb020',emissiveIntensity:1.2,metalness:.6,roughness:.3});
 const LIB={R:-160,F:-720};
 const lib=new T.Group();lib.position.copy(W(LIB.R,LIB.F,0));lib.rotation.y=Math.atan2(1,-.35);g.add(lib);
 {add(new T.CylinderGeometry(75,80,4,40),SM('#6d8f52',{roughness:.95},.32),0,1.6,0,lib,false);add(new T.CylinderGeometry(80,82,1.4,40),granite,0,.3,0,lib,false);
  const st=new T.Shape();for(let i=0;i<22;i++){const a=i/22*Math.PI*2,r=i%2?18:27;i?st.lineTo(Math.cos(a)*r,Math.sin(a)*r):st.moveTo(Math.cos(a)*r,Math.sin(a)*r)}st.closePath();
  const fort=add(new T.ExtrudeGeometry(st,{depth:8,bevelEnabled:false}),granite,0,3.5,0,lib);fort.rotation.x=-Math.PI/2;fort.position.y=3.5;
  add(new T.BoxGeometry(24,5,24),granite,0,14,0,lib);add(new T.BoxGeometry(18,22,18),granite,0,27.5,0,lib);add(new T.BoxGeometry(20,2,20),granite,0,39.5,0,lib);add(new T.BoxGeometry(15,4,15),granite,0,42.5,0,lib);
  for(const r of [0,1,2,3]){const p=add(new T.BoxGeometry(6,9,.6),SM('#9d968a',{},.32),0,28,9.2,lib);p.position.applyAxisAngle(new T.Vector3(0,1,0),r*Math.PI/2);p.rotation.y=r*Math.PI/2}
  const s=new T.Group();s.position.y=44.5;s.scale.x=-1;lib.add(s);   // 거울로 뒤집어 횃불이 오른손에
  const robe=new T.LatheGeometry([[0,0],[5.2,0],[5.4,1],[4.6,8],[4.2,16],[3.7,24],[3.4,29],[3.1,32],[1.6,34],[0,34.5]].map(p=>new T.Vector2(p[0],p[1])),28);add(robe,copper,0,0,0,s);
  for(let i=0;i<9;i++){const a=i/9*Math.PI*2,m=add(new T.CylinderGeometry(.22,.4,24,6),copper,Math.cos(a)*4.3,12,Math.sin(a)*4.3,s);m.rotation.z=Math.cos(a)*.06;m.rotation.x=-Math.sin(a)*.06}   // 옷 주름
  add(new T.CylinderGeometry(1.1,1.4,2.4,12),copper,0,35.4,0,s);ball(s,0,38,.2,2.1,copper,.92,1.08,1);
  add(new T.CylinderGeometry(2.1,2.1,.8,16),copper,0,39.4,0,s);for(let i=0;i<7;i++){const a=-Math.PI*.9+i*Math.PI*.3,m=add(new T.ConeGeometry(.35,3.4,6),copper,Math.sin(a)*2.1,40.6,Math.cos(a)*2.1,s);m.rotation.x=Math.cos(a)*.9;m.rotation.z=-Math.sin(a)*.9}   // 왕관 7갈래
  beam(s,[2.6,32,0],[3.6,40,.6],1,.8,copper,10);beam(s,[3.6,40,.6],[4.2,48,.8],.8,.7,copper,10);ball(s,4.25,48.6,.8,.85,copper);
  add(new T.CylinderGeometry(.7,.45,3.6,10),copper,4.3,51,.8,s);add(new T.CylinderGeometry(1.5,.75,.9,12),shiny,4.3,53.1,.8,s);const fl=add(new T.ConeGeometry(1.1,2.6,10),flame,4.3,54.9,.8,s,false);
  beam(s,[-2.8,31.5,0],[-3.6,26,.8],.85,.75,copper,10);const tab=add(new T.BoxGeometry(1.2,6.4,4.2),copper,-4.2,26.5,1.1,s);tab.rotation.set(.15,0,.12);
  ball(s,-3.7,24.8,1.6,.7,copper);
  s.traverse(o=>{if(o.isMesh)o.castShadow=true});
  s.updateMatrixWorld(true);glowPts([fl.getWorldPosition(new T.Vector3())],'#ffc24a',26,1)}
 const libFlood=[copper];

 // ── 제인의 회전목마(브루클린 브릿지 파크): 유리 집 안에서 빙글빙글, 밤엔 전구가 반짝
 const carousel=new T.Group();carousel.position.copy(W(716,440,YC+.12));g.add(carousel);
 const glassM=new T.MeshStandardMaterial({color:'#cfe3ea',transparent:true,opacity:.22,roughness:.05,metalness:.1,depthWrite:false,side:T.DoubleSide});
 let rideG=null,horses=[],bulbs=null;
 {const H=8.5,S=17;for(const [x,z,w,d] of [[0,S/2,S,.1],[0,-S/2,S,.1],[S/2,0,.1,S],[-S/2,0,.1,S]]){const m=add(new T.BoxGeometry(w,H,d),glassM,x,H/2,z,carousel,false);m.userData.noAO=true}
  const fr=SM('#2b2f33',{metalness:.6,roughness:.4});for(const [x,z] of [[-1,-1],[1,-1],[1,1],[-1,1]])add(new T.BoxGeometry(.4,H,.4),fr,x*S/2,H/2,z*S/2,carousel);
  for(let i=-3;i<=3;i++){add(new T.BoxGeometry(.12,H,.12),fr,i*S/7,H/2,S/2,carousel,false);add(new T.BoxGeometry(.12,H,.12),fr,i*S/7,H/2,-S/2,carousel,false)}
  add(new T.BoxGeometry(S+1.2,.5,S+1.2),fr,0,H+.25,0,carousel);add(new T.BoxGeometry(S+.4,.3,S+.4),SM('#8b8f92'),0,.15,0,carousel);
  rideG=new T.Group();rideG.position.y=.3;carousel.add(rideG);
  add(new T.CylinderGeometry(6.6,6.6,.5,32),SM('#d8c39a',{roughness:.6}),0,.25,0,rideG);add(new T.CylinderGeometry(.6,.6,6.5,12),shiny,0,3.5,0,rideG);
  const canopy=add(new T.ConeGeometry(7.4,2.2,24),SM('#f1ece0',{roughness:.6}),0,7.1,0,rideG);add(new T.CylinderGeometry(7.4,7.4,.8,24,1,true),SM('#c8463c',{side:T.DoubleSide}),0,5.6,0,rideG);
  const HC=['#f5f1e8','#d9b07a','#8a5a3a','#f0e2c8','#5a4032','#e8d7b5'];
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2,r=i%2?4.6:5.6,hg=new T.Group();hg.position.set(Math.cos(a)*r,0,Math.sin(a)*r);hg.rotation.y=-a;rideG.add(hg);add(new T.CylinderGeometry(.06,.06,6,6),shiny,0,3.4,0,hg,false);
   const hb=new T.Group();hg.add(hb);const hm=SM(HC[i%6],{roughness:.5});ball(hb,0,0,0,.42,hm,.8,.75,1.6);ball(hb,0,.45,.62,.24,hm,.7,1.1,1);beam(hb,[0,.2,.45],[0,.55,.65],.18,.14,hm,6);for(const [x,z] of [[-.2,.4],[.2,.4],[-.2,-.4],[.2,-.4]])beam(hb,[x,-.1,z],[x,-.75,z+.15*Math.sign(z)],.07,.05,hm,6);
   add(new T.BoxGeometry(.5,.08,.5),SM('#b8342c'),0,.33,0,hb,false);horses.push({hb,ph:i*1.3})}
  const bp=[];for(let i=0;i<40;i++){const a=i/40*Math.PI*2;bp.push(new T.Vector3(Math.cos(a)*7.4,6.05,Math.sin(a)*7.4))}const bg=new T.BufferGeometry().setFromPoints(bp);
  bulbs=new T.Points(bg,new T.PointsMaterial({map:glowTex,color:'#ffe08a',size:.9,transparent:true,opacity:.6,depthWrite:false,blending:T.AdditiveBlending}));rideG.add(bulbs)}

 // ── 스태튼 아일랜드 페리(주황 배)가 항구를 천천히 돈다 · 작은 유람선
 const boats=[];
 {const mk=(col,len,wid,decks)=>{const b=new T.Group();g.add(b);add(new T.BoxGeometry(wid,2.6,len),SM(col,{roughness:.6},.5),0,1.6,0,b);for(let i=0;i<decks;i++)add(new T.BoxGeometry(wid*.86-i*.6,2.2,len*.8-i*4),SM(i%2?col:'#f3efe6',{roughness:.6},.5),0,4+i*2.2,0,b);add(new T.CylinderGeometry(.5,.6,3,8),SM('#2b2b2b',{},.5),0,4+decks*2.2+1,0,b);return b};
  boats.push({o:mk('#f08a24',34,10,3),cx:70,cz:420,rx:190,rz:250,w:.012,ph:0},{o:mk('#ffffff',18,5,2),cx:470,cz:-100,rx:70,rz:330,w:.02,ph:2})}

 // ── 걸을 수 있는 곳 · 막힌 곳(동상 · 분수 · 탑 기둥 · 유리 집 · 요새)
 const ovals=[[0,-4,10.3,13.3],[0,30,2.4,4.6],[-120,-80,18.2,18.2],[70,150,.9,.9]];
 const boxesNo=[[709,723,433,447],...TW.map(R=>[R-6.6,R+6.6,F0-2.9,F0+2.9]),[81,106,180.5,190.5]];
 // 카메라가 들어가면 안 되는 덩어리(명소 건물) [R0,R1,F0,F1,높이]
 const SOLID=[[33,59.6,117,160,YC+32],[81,106,181,206,YC+26],[-88,-50,162,178,YC+24],[-180,-150,325,355,400],[-102,-88,140,200,0]].filter(b=>b[4]>0);
 for(const R of TW)SOLID.push([R-6.5,R+6.5,F0-18,F0-3,TOP+4],[R-6.5,R+6.5,F0+3,F0+18,TOP+4],[R-6.5,R+6.5,F0-3,F0+3,TOP+4]);
 function inArea(R,F){for(const a of AREAS)if(R>=a[0]&&R<=a[1]&&F>=a[2]&&F<=a[3])return true;return false}
 function bridgeWalk(R,F){if(R<BBR.R0-2||R>BBR.R1+2)return null;const df=Math.abs(F-F0);if(df<=BBR.W-.3)return BY(R)+.02;for(const T0 of TW)if(Math.abs(R-T0)<11&&df<15.2)return BY(T0)+.02;return null}
 function blocked2(R,F){for(const [r,f,a,b] of ovals)if(((R-r)/a)**2+((F-f)/b)**2<1)return true;for(const [a,b,c,d] of boxesNo)if(R>a&&R<b&&F>c&&F<d)return true;return false}

 // ── 관광객(사진 찍는 사람 · 다리 위를 걷는 사람 · 공원 산책) — CITY_PEOPLE 군중 하나로
 const people=root.CITY_PEOPLE?root.CITY_PEOPLE.make({T,g,max:90}):null;const folk=[];
 if(people){const L=()=>root.CITY_PEOPLE.look(rnd);
  for(let i=0;i<8;i++){const a=-1.2+i*.34,r=6.2+rnd()*2;folk.push({kind:'pose',q:L(),R:Math.sin(a)*r,F:30+Math.cos(a)*r*1.3-2,face:null,at:[0,30],wave:i%3===0})}
  for(let i=0;i<4;i++)folk.push({kind:'pose',q:L(),R:-30+i*25+rnd()*4,F:-119.5,at:[LIB.R,LIB.F],wave:i===1});
  for(let i=0;i<5;i++)folk.push({kind:'pose',q:L(),R:691+rnd()*2,F:420+i*30+rnd()*6,at:[300,330],wave:i===2});
  for(let i=0;i<34;i++){const R=BBR.R0+20+rnd()*(BBR.R1-BBR.R0-40);folk.push({kind:'bridge',q:L(),R,lat:(rnd()-.5)*4,v:(rnd()<.5?-1:1)*(1.1+rnd()*.8),ph:rnd()*6})}
  for(let i=0;i<10;i++)folk.push({kind:'path',q:L(),a:[-180,-116],b:[320,-116],t:rnd(),v:(rnd()<.5?-1:1)*(.004+rnd()*.003),ph:rnd()*6});
  for(let i=0;i<8;i++)folk.push({kind:'path',q:L(),a:[693,356],b:[693,604],t:rnd(),v:(rnd()<.5?-1:1)*(.006+rnd()*.004),ph:rnd()*6})}
 function updatePeople(time,dt,me){if(!people)return;people.begin();
  for(const p of folk){let R,F,ry,amt=0,y=YC+.12;
   if(p.kind==='pose'){R=p.R;F=p.F;ry=Math.atan2(-(p.at[0]-R),(p.at[1]-F));y=YC+(p.F>-24&&p.F<16?.02:.24);if(p.F<-110)y=YC+.12;if(p.R>680)y=YC+.12;
    people.person(R,y,-F,ry,time*.7+p.R,0,p.q,p.wave?{wave:true,t:time+p.R}:null);continue}
   if(p.kind==='bridge'){p.R+=p.v*dt;if(p.R<BBR.R0+6||p.R>BBR.R1-6)p.v=-p.v;R=p.R;F=F0+p.lat;for(const T0 of TW)if(Math.abs(R-T0)<9)F=F0+(p.lat>0?1:-1)*(9);y=BY(R)+.02;ry=p.v>0?-Math.PI/2:Math.PI/2;amt=Math.min(1,Math.abs(p.v)/1.4)}
   else{p.t+=p.v*dt;if(p.t<0||p.t>1){p.v=-p.v;p.t=Math.max(0,Math.min(1,p.t))}R=p.a[0]+(p.b[0]-p.a[0])*p.t;F=p.a[1]+(p.b[1]-p.a[1])*p.t;const dx=(p.b[0]-p.a[0])*Math.sign(p.v),dz=(p.b[1]-p.a[1])*Math.sign(p.v);ry=Math.atan2(-dx,dz);amt=.8}
   if(me&&(R-me.x)**2+(F+me.z)**2>200*200)continue;p.wp=(p.wp||p.ph||0)+dt*4.6*amt;people.person(R,y,-F,ry,p.wp,amt,p.q)}
  people.end()}

 // ── 매 프레임
 const leafC=new T.Color(),snowC=new T.Color('#eef2f6'),grassC=new T.Color('#ffffff');
 function update(time,dt,E,cam,me,extra){const d=E?E.dark:0;NIGHT.value=d;
  waveN.offset.set(time*.004,time*.0025);
  if(E){crownMat.color.set(E.leaf);grassC.set('#ffffff').lerp(snowC,E.snowCover*.85);if(E.season==='autumn')grassC.lerp(leafC.set('#c8b27a'),.35);grassMat.color.copy(grassC);
   waterMat.color.set('#2d5866').lerp(new T.Color('#0b1622'),d*.8).lerp(new T.Color('#55626a'),E.weather*.45);waterMat.roughness=.16+E.rain*.25;
   for(const m of envMats)m.envMapIntensity=(m.userData.envK||.8)*(1-.85*d)*(1-.4*E.weather);
   lampBulb.emissiveIntensity=.3+3.4*d;for(const m of [marble,marble2]){m.emissive.set('#ffe9c4');m.emissiveIntensity=d*.16}for(const m of libFlood){m.emissive.set('#7fc8b0');m.emissiveIntensity=d*.22}flame.emissiveIntensity=1.2+2.5*d}
  for(const n of nightGlows){n.o.visible=d>.03;n.o.material.opacity=Math.min(1,d*1.3)*n.k*(E?1-.5*E.weather:1)}
  // 볼링 그린 분수
  for(let i=0;i<90;i++){const f=((time*.9+i/90)%1),a=i*2.4,r=f*2.2;fountainPts[i*3]=Math.cos(a)*r;fountainPts[i*3+1]=YC+2.3+f*2.6-f*f*3.8;fountainPts[i*3+2]=-(-4)+Math.sin(a)*r}fountainGeo.attributes.position.needsUpdate=true;
  fountain.visible=!(E&&E.snowCover>.5);
  // 회전목마
  if(rideG){rideG.rotation.y-=dt*.45;horses.forEach(h=>{h.hb.position.y=1.6+Math.sin(time*2+h.ph)*.35});bulbs.material.opacity=.35+.65*d}
  boats.forEach(b=>{const a=time*b.w+b.ph,x=b.cx+Math.cos(a)*b.rx,z=b.cz+Math.sin(a)*b.rz;b.o.position.set(x,.35,z);b.o.rotation.y=Math.atan2(-Math.sin(a)*b.rx,Math.cos(a)*b.rz)});
  updatePeople(time,dt,me)}
 function setEnv(envTex){for(const m of envMats){m.envMap=envTex;m.needsUpdate=true}}
 return {group:g,SOLID,bridgeY:BY,bridgeWalk,inArea,blocked:blocked2,pois:POIS,tour:TOUR,update,setEnv,people,NIGHT,BB:BBR,MB,LIB,grassMat,crownMat}}
root.NYC_LANDMARKS={build,bridgeY,BBR,MB,POIS,TOUR,AREAS};
})(typeof window!=='undefined'?window:globalThis);
