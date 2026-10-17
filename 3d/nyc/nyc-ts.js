/* 뉴욕 거리 산책(3d/nyc)의 타임스스퀘어 — 지하철을 타고 오는 세 번째 동네.
   - ../ride/city-ts.js 의 움직이는 전광판(BROADWAY · W 42 ST 모서리)을 걷는 배치(walk-city.js, C.ts)로 다시 그린다. 차는 없다.
   - 다운타운 · 덤보와 멀리 떨어진 자리(TX, TF)에 따로 두고, 여기 있는 동안은 다른 동네를 숨긴다(walk.js 의 inTS).
   - 브로드웨이 한가운데 빨간 계단(TKTS)은 걸어 올라갈 수 있다 · 계단 위 관광객 · 둘레를 채우는 미드타운 빌딩 숲(안개 속으로 이어지는 길)
   - 7번가 즐길 거리(nyc-ts-fun.js)의 자리 SP: 라이브 캠 빌딩 · 원 타임스스퀘어 탑 · W 44 ST 극장은 도시 빌딩을 비운 자리(NOB)에 직접 세운다
   build({T,scene,YC}) → {C,S,group,TX,TF,SP,inArea(R,F),walk(R,F),blocked(R,F),update(time,dt,E,me),cheer} */
(function(root){
function build({T,scene,YC=3.8}){
 const TX=-3000,TF=3000;
 // 7번가(R=TX-130) 둘레 즐길 거리 자리. 빌딩 앞면은 길 가운데서 10.4 떨어진다(city-scene WALK+.9)
 const SP={AV7:TX-130,
  LIVE:{r0:TX-119.6,r1:TX-97,f0:TF+20,f1:TF+54,h:66,mark:[TX-131,TF+37]},          // 7번가 동쪽 · 서쪽을 보는 큰 전광판 + 길 가운데 동그라미
  ONE:{r0:TX-141,r1:TX-119,f0:TF-34,f1:TF-10.6,h:84,act:[TX-130,TF+15]},          // W 42 ST 남쪽, 7번가 끝에서 보이는 원 타임스스퀘어 탑 · act: 7번가의 볼 드롭 안내대
  THEATER:{r0:TX-166,r1:TX-141.2,f0:TF+82.4,f1:TF+104,h:27,door:[TX-153.6,TF+79.3]}, // W 44 ST 북쪽 브로드웨이 극장
  TKTS:[TX,TF-66.4],HALAL:[TX-122.6,TF+56.5],
  CHARS:[{id:'bear',R:TX-137.2,F:TF+27,face:-Math.PI/2},{id:'bunny',R:TX-122.8,F:TF+45,face:Math.PI/2},{id:'dino',R:TX+7.2,F:TF-30,face:Math.PI/2}]};
 const C=root.NYC_WALK_CITY.make({V:[[TX,TF-110],[TX,TF],[TX-130,TF],[TX-130,TF+120]],names:['BROADWAY','W 42 ST','7 AV'],
  lights:[{k:0,d:82},{k:2,d:60}],crossStreets:[{k:0,d:30,from:-60,to:60,name:'W 41 ST'},{k:2,d:72,from:-55,to:60,name:'W 44 ST'}],
  BB:{r0:TX-215,r1:TX+80,f0:TF-128,f1:TF+138},EXCL:[],NOB:[[TX-8,TX+8,TF-128,TF-110],[TX-121,TX-94,TF+17,TF+58],[TX-146,TX-114,TF-42,TF-10.5],[TX-170,TX-140.9,TF+81.6,TF+108]],vents:[[0,96],[1,70]],stacks:[[1,40],[2,90]],npc:false,ts:true});
 C.kitBase='../ride/nyc/';
 const S=root.CITY_SCENE.build({T,scene,C});
 const g=new T.Group();g.name='nyc-ts';scene.add(g);
 const W=(R,F,y=0)=>new T.Vector3(R,y,-F);
 const SM=(c,o={})=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:.75},o));
 const add=(geo,mat,x,y,z,p=g,shadow=true)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;p.add(m);return m};
 const tex=(w,h,draw)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t};

 /* ═══ 1. 빨간 계단 (TKTS): 브로드웨이 가운데, 북쪽(전광판)을 보고 앉는 계단 ═══ */
 const ST={R0:TX-4.6,R1:TX+4.6,F0:TF-58,F1:TF-44,N:10,rise:.42,booth:TF-64};
 const red=SM('#d42a2a',{roughness:.35,metalness:.1,emissive:'#ff2020',emissiveIntensity:.25}),glass=new T.MeshStandardMaterial({color:'#e9f3f6',transparent:true,opacity:.16,roughness:.05,depthWrite:false});
 const steps=new T.Group();g.add(steps);
 const dep=(ST.F1-ST.F0)/ST.N;
 for(let k=0;k<ST.N;k++){const h=(k+1)*ST.rise,f=ST.F1-(k+.5)*dep;add(new T.BoxGeometry(ST.R1-ST.R0,h,dep),red,TX,YC+.02+h/2,-f,steps);
  add(new T.BoxGeometry(ST.R1-ST.R0-.2,.05,.08),new T.MeshBasicMaterial({color:'#ffd9d0'}),TX,YC+.02+h+.01,-(ST.F1-k*dep-.05),steps,false)}
 const topY=YC+.02+ST.N*ST.rise;
 for(const s of [-1,1]){add(new T.BoxGeometry(.08,1.1,ST.F1-ST.F0+.6),glass,TX+s*4.65,topY-2+.55,-(ST.F0+ST.F1)/2,steps,false);add(new T.BoxGeometry(.1,.08,ST.F1-ST.F0+.6),SM('#c9ced3',{metalness:.8,roughness:.3}),TX+s*4.65,topY-1.5+1.1,-(ST.F0+ST.F1)/2,steps,false)}
 add(new T.BoxGeometry(ST.R1-ST.R0,1.1,.08),glass,TX,topY+.55,-ST.F0,steps,false);
 // 계단 밑 매표소(TKTS)
 add(new T.BoxGeometry(ST.R1-ST.R0,topY-YC,ST.F0-ST.booth),SM('#2b2f33',{metalness:.4,roughness:.4}),TX,(topY+YC)/2,-(ST.F0+ST.booth)/2,steps);
 {const t=tex(512,160,(x,w,h)=>{x.fillStyle='#d42a2a';x.fillRect(0,0,w,h);x.fillStyle='#fff';x.font='900 96px Outfit,Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('tkts',w/2,h*.5)});
  const m=add(new T.PlaneGeometry(7.6,2.4),new T.MeshBasicMaterial({map:t,toneMapped:false}),TX,YC+2.6,-(ST.booth-.02),steps,false)}
 {const t=tex(512,128,(x,w,h)=>{x.fillStyle='#111';x.fillRect(0,0,w,h);x.fillStyle='#ffd166';x.font='800 40px "Noto Sans KR",Outfit,Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('🎟 오늘 공연 · 바람을 따라',w/2,h*.36);x.fillStyle='#fff';x.font='700 30px "Noto Sans KR",Outfit,Arial,sans-serif';x.fillText('W 44 ST · 반값 표 · 창구에서 F',w/2,h*.76)});
  const m=add(new T.PlaneGeometry(6.4,1.6),new T.MeshBasicMaterial({map:t,toneMapped:false}),TX,YC+.95,-(ST.booth-.02),steps,false)}

 /* ═══ 2. 둘레 미드타운 빌딩 숲 (동네 바깥을 채운다) ═══ */
 const winTex=tex(128,256,(x,w,h)=>{x.fillStyle='#4c535b';x.fillRect(0,0,w,h);for(let j=0;j<32;j++)for(let i=0;i<8;i++){const on=((i*7+j*13)%9)>4;x.fillStyle=on?'#ffe2a8':'#26303a';x.fillRect(4+i*15.5,4+j*7.9,10,5)}});
 const winDark=tex(128,256,(x,w,h)=>{x.fillStyle='#000';x.fillRect(0,0,w,h);for(let j=0;j<32;j++)for(let i=0;i<8;i++){const on=((i*7+j*13)%9)>4;if(on){x.fillStyle='#ffd98a';x.fillRect(4+i*15.5,4+j*7.9,10,5)}}});
 const farMat=SM('#ffffff',{map:winTex,emissiveMap:winDark,emissive:'#ffffff',emissiveIntensity:0,roughness:.8});
 const cells=[];const BB=C.BB;let sd=7;const rnd=()=>{sd=(sd*16807)%2147483647;return sd/2147483647};
 for(let R=TX-620;R<TX+500;R+=42)for(let F=TF-560;F<TF+580;F+=42){if(R+30>BB.r0-14&&R<BB.r1+14&&F+30>BB.f0-14&&F<BB.f1+14)continue;cells.push([R+15,F+15,30+rnd()*24,30+rnd()*24,34+rnd()*rnd()*150])}
 const farM=new T.InstancedMesh(new T.BoxGeometry(1,1,1).translate(0,.5,0),farMat,cells.length);
 {const d=new T.Object3D(),c=new T.Color();cells.forEach((b,i)=>{d.position.copy(W(b[0],b[1],YC-.05));d.scale.set(b[2],b[4],b[3]);d.updateMatrix();farM.setMatrixAt(i,d.matrix);farM.setColorAt(i,c.setHSL(.08+rnd()*.08,.08+rnd()*.12,.55+rnd()*.3))})}
 farM.castShadow=false;farM.receiveShadow=true;g.add(farM);
 add(new T.PlaneGeometry(1600,1600).rotateX(-Math.PI/2),SM('#6b6d6c',{roughness:.95}),TX-60,YC-.06,-TF,g,false);

 /* ═══ 3. 관광객 (계단 위 · 광장) ═══ */
 const people=root.CITY_PEOPLE?root.CITY_PEOPLE.make({T,g,max:46}):null;const folk=[];
 if(people){for(let i=0;i<24;i++){const k=1+Math.floor(rnd()*(ST.N-1)),F=ST.F1-(k+.5)*dep;const sd=i%2?1:-1;folk.push({R:TX+sd*(1.25+rnd()*2.95),F,y:YC+.02+(k+1)*ST.rise,ry:(rnd()-.5)*.6,q:root.CITY_PEOPLE.look(rnd),wave:i%5===0})}
  for(let i=0;i<14;i++){const a=rnd()*Math.PI*2,r=6+rnd()*14;folk.push({R:TX-6+Math.cos(a)*r*.4,F:TF-22+Math.sin(a)*r*.6,y:YC+.02,ry:Math.PI+(rnd()-.5)*1.4,q:root.CITY_PEOPLE.look(rnd),wave:i%4===1,armUp:i%3===0})}}
 if(people)root.NYC_ASSETS&&root.NYC_ASSETS.loadPeople&&root.NYC_ASSETS.loadPeople(T,'../ride/nyc/').then(geo=>people.useKit(geo)).catch(()=>{});

 const inArea=(R,F)=>R>TX-270&&R<TX+140&&F>TF-190&&F<TF+200;
 function walk(R,F){if(R>=ST.R0&&R<=ST.R1&&F>=ST.F0&&F<=ST.F1){const k=Math.min(ST.N-1,Math.max(0,Math.floor((ST.F1-F)/dep)));return YC+.02+(k+1)*ST.rise}return null}
 function blocked(R,F){return R>ST.R0-.1&&R<ST.R1+.1&&F>ST.booth-.1&&F<ST.F0}
 // api.cheer > 0 이면(새해 볼 드롭) 모두 손을 들고 흔든다
 function update(time,dt,E,me){const d=E?E.dark:0;red.emissiveIntensity=.25+d*1.4;farMat.emissiveIntensity=d*.9;if(api.cheer>0)api.cheer-=dt;const ch=api.cheer>0;
  if(people){people.begin();for(const p of folk)people.person(p.R,p.y,-p.F,p.ry,time*.6+p.R,0,p.q,ch?(p.wave||p.F%2<1?{wave:true,t:time*1.6+p.F}:{armUp:true}):p.wave?{wave:true,t:time+p.F}:p.armUp?{armUp:true}:null);people.end()}}
 const api={C,S,group:g,TX,TF,ST,SP,inArea,walk,blocked,update,cheer:0};return api}
root.NYC_TS={build};
})(window);
