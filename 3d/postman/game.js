/* 골목 배달부 — DentPhoto 마을 주인공이 언덕 위 작은 골목 마을에서 하루 동안 편지 · 소포를 배달한다.
   - 그림체: 툰 셰이딩 · 만화 외곽선 · 파스텔 색, 땅이 둥글게 휘어 보이는 작은 행성(town.js curve), 바짝 붙은 3인칭 카메라.
   - 진행: 골목 우체국장 까미유데물랭님에게 가방을 받아(4번) 동네 사람 15명에게 배달 15건. 몇몇은 받은 뒤 다른 사람에게 보낼 물건을 맡긴다.
     배달할수록 아침 → 한낮 → 노을 → 밤. 다 끝내면 종탑 광장 등불 축제.
   - 머리 위 ▼ 표시 = 나에게 볼일이 있는 사람. 1~5 이모지로 인사하면 대답한다(❓ 는 길 힌트).
   - 저장 localStorage asset-postman-v1 · 마을 보상 asset-village-3d-postman · 마을 iframe 에서는 ✕ 가 postMessage {dpPostman:'close'}.
   - 시험용 window.pmDebug */
'use strict';
(function(){
const T=THREE,$=id=>document.getElementById(id);
const store=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}};
const Q=new URLSearchParams(location.search),EMBED=window.parent!==window||Q.has('embed');
const heroOwner=(()=>{const q=Q.get('hero');if(q==='me'||q==='wife')return q;return store('asset-village-3d-hero')==='wife'?'wife':'me'})();
const gems=(()=>{try{return JSON.parse(store('asset-village-3d-gems')||'[]').length||0}catch(e){return 0}})();
const VP=(()=>{try{return JSON.parse(store('asset-village-3d-prefs')||'{}')}catch(e){return {}}})();
const TOUCH=matchMedia('(pointer:coarse)').matches;
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,wrapA=a=>Math.atan2(Math.sin(a),Math.cos(a));

/* ═══ 1. 화면 · 하늘 · 빛 ═══ */
const canvas=$('game'),renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,TOUCH?1.6:2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();scene.fog=new T.Fog('#d6ebe0',38,160);
const camera=new T.PerspectiveCamera(TOUCH&&innerWidth<innerHeight?66:58,innerWidth/innerHeight,.08,700);
const hemi=new T.HemisphereLight('#cfe6ff','#c9a98a',1.1);scene.add(hemi);
const sun=new T.DirectionalLight('#ffd2a8',1.6);sun.castShadow=true;sun.shadow.mapSize.set(TOUCH?1024:2048,TOUCH?1024:2048);
Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:1,far:140});sun.shadow.bias=-.0005;sun.shadow.normalBias=.035;scene.add(sun,sun.target);
const skyU={top:{value:new T.Color()},bot:{value:new T.Color()},sunC:{value:new T.Color()},sunD:{value:new T.Vector3(0,1,0)}};
const sky=new T.Mesh(new T.SphereGeometry(500,32,16),new T.ShaderMaterial({uniforms:skyU,side:T.BackSide,depthWrite:false,fog:false,
 vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform vec3 top,bot,sunC,sunD;varying vec3 vP;void main(){float h=vP.y;vec3 c=mix(bot,top,smoothstep(-.12,.6,h));float s=max(0.,dot(normalize(vP),sunD));c+=sunC*(pow(s,400.)*1.6+pow(s,12.)*.18);gl_FragColor=vec4(c,1.);\n#include <colorspace_fragment>\n}'}));
sky.renderOrder=-10;scene.add(sky);
// 별(밤) · 뭉게구름(낮)
const stars=(()=>{const n=500,p=new Float32Array(n*3),r=PM_TOWN.rng(3);for(let k=0;k<n;k++){const a=r()*Math.PI*2,y=.08+r()*.92,q=Math.sqrt(1-y*y);p[k*3]=Math.cos(a)*q*480;p[k*3+1]=y*480;p[k*3+2]=Math.sin(a)*q*480}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));
 const m=new T.Points(g,new T.PointsMaterial({color:'#fff8e0',size:2.2,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false}));m.renderOrder=-9;scene.add(m);return m})();
const clouds=new T.Group();scene.add(clouds);{const r=PM_TOWN.rng(11),cm=new T.MeshToonMaterial({color:'#ffffff',gradientMap:PM_TOWN.GRAD,fog:false}),geo=new T.IcosahedronGeometry(1,2);
 for(let k=0;k<16;k++){const c=new T.Group(),a=r()*Math.PI*2,d=230+r()*120;c.position.set(Math.cos(a)*d,40+r()*70,Math.sin(a)*d);c.lookAt(0,c.position.y,0);const s=8+r()*10;for(let b=0;b<5;b++){const m=new T.Mesh(geo,cm);m.position.set((b-2)*s*.55+(r()-.5)*s*.3,(r()-.3)*s*.35,(r()-.5)*s*.3);m.scale.setScalar(s*(.45+r()*.35));m.scale.y*=.42;c.add(m)}clouds.add(c)}}

// 먼 산 — 하늘빛에 물든 납작한 산줄기(휘지 않고 카메라를 따라온다)
const MT={a:new T.MeshBasicMaterial({color:'#7fb3b9',fog:false}),b:new T.MeshBasicMaterial({color:'#9cc4c6',fog:false}),g:new T.Group()};scene.add(MT.g);
{const r=PM_TOWN.rng(21);for(let k=0;k<16;k++){const a=k/16*Math.PI*2+r()*.3,d=360+r()*50,h=200+r()*80,w=110+r()*90;const m=new T.Mesh(new T.ConeGeometry(w,h,5+Math.floor(r()*3)),k%2?MT.a:MT.b);m.position.set(Math.cos(a)*d,h/2-175+r()*20,Math.sin(a)*d);m.rotation.y=r()*3;m.renderOrder=-8;MT.g.add(m)}}

/* ═══ 2. 마을 ═══ */
const town=PM_TOWN.build({scene});const {curve,toon,outline,CURVE}=PM_TOWN,CS=town.CS,cx=town.cx,ci=town.ci;
const SKF=[[0,{top:'#7ec8c8',bot:'#e2f1e6',fog:'#d8ece2',sun:'#ffe0bb',si:1.8,hs:'#d8efe9',hg:'#b8a88e',hi:1.15,night:0,el:.35,az:-1.1,mt:'#7fb3b9'}],
 [.33,{top:'#6cc2c6',bot:'#d6f0ea',fog:'#cde9e2',sun:'#fff6e6',si:2.1,hs:'#e2f5f0',hg:'#bdb29a',hi:1.2,night:0,el:1.0,az:-.25,mt:'#76afb8'}],
 [.62,{top:'#80b4c4',bot:'#f4ddb6',fog:'#ecdcc0',sun:'#ffc98a',si:2.0,hs:'#f5e6cc',hg:'#b39275',hi:1.05,night:0,el:.5,az:.75,mt:'#8aa6b4'}],
 [.84,{top:'#5b5ca6',bot:'#f6a089',fog:'#cf98a2',sun:'#ff9a6a',si:1.25,hs:'#dab7da',hg:'#8a6a7a',hi:.92,night:.5,el:.13,az:1.25,mt:'#77669a'}],
 [1,{top:'#121a3c',bot:'#363c76',fog:'#283060',sun:'#a8b8ff',si:.6,hs:'#7383cf',hg:'#3b3550',hi:.78,night:1,el:.75,az:2.3,mt:'#252c55'}]];
const ENV={tod:0,want:0,night:0};const _c1=new T.Color(),_c2=new T.Color();
function applySky(){const t=ENV.tod;let a=SKF[0],b=SKF[SKF.length-1];for(let k=0;k<SKF.length-1;k++)if(t>=SKF[k][0]&&t<=SKF[k+1][0]){a=SKF[k];b=SKF[k+1];break}
 const u=b[0]>a[0]?clamp((t-a[0])/(b[0]-a[0]),0,1):0,A=a[1],B=b[1],mix=(k,out)=>out.copy(_c1.set(A[k])).lerp(_c2.set(B[k]),u);
 mix('top',skyU.top.value);mix('mt',MT.a.color);MT.b.color.copy(MT.a.color).lerp(skyU.bot.value,.35);mix('bot',skyU.bot.value);mix('fog',scene.fog.color);mix('sun',sun.color);mix('hs',hemi.color);mix('hg',hemi.groundColor);skyU.sunC.value.copy(sun.color);
 sun.intensity=lerp(A.si,B.si,u);hemi.intensity=lerp(A.hi,B.hi,u);ENV.night=lerp(A.night,B.night,u);const el=lerp(A.el,B.el,u),az=lerp(A.az,B.az,u);
 skyU.sunD.value.set(Math.cos(el)*Math.sin(az),Math.sin(el),Math.cos(el)*Math.cos(az)).normalize();stars.material.opacity=clamp((ENV.night-.4)*1.6,0,1);
 clouds.children[0]&&(clouds.children[0].children[0].material.color.setRGB(1-ENV.night*.55,1-ENV.night*.5,1-ENV.night*.3));
 const hh=7+t*14;$('clock').textContent=`${String(Math.floor(hh)).padStart(2,'0')}:${String(Math.floor(hh%1*60/10)*10).padStart(2,'0')} · ${t<.18?'아침':t<.45?'한낮':t<.7?'오후':t<.9?'노을':'밤'}`}

/* ═══ 3. 주인공 — 마을 주인공 그대로(툰 재질로만 갈아입힘) ═══ */
const HERO=NYC_HERO.make({T,scene,owner:heroOwner,K:.55});
HERO.dress({season:'spring',wet:false,riding:false,gems,wear:VP});HERO.dog.g.visible=false;HERO.bike.g.visible=false;
function toonify(root){root.traverse(m=>{if(!m.isMesh)return;if(m.material.isMeshStandardMaterial){const c='#'+m.material.color.getHexString();m.material=toon(c)}else curve(m.material)})}
toonify(HERO.root);curve(HERO.shadow.material);
HERO.root.traverse(m=>{if(m.isMesh&&m.material.color){const c=m.material.color;if(c.r+c.g+c.b<.25)m.userData.noOutline=true}});outline(HERO.root,120);

/* ═══ 4. 동네 사람들 ═══ */
const PEOPLE=(window.CITY_NPC&&CITY_NPC.PEOPLE)||[];
// 마을 바깥에만 사는 사람(이름표 목록에 없는 동네 어른들)
const LOCALS=[['정원사 할머니','꽃삽 화원 주인','sheep','#7fb37a','흙 냄새 좋지?',{hat:'straw',hatC:'#e8d9a8'}],['언덕집 할아버지','언덕 위 빨간 집','polar','#6b5d4f','허허, 손님인가?',{glasses:true}]];
const byName=n=>LOCALS.find(p=>p[0]===n)||PEOPLE.find(p=>p[0]===n)||[n,'','cat','#9cc7e0','',{}];
const ANIMAL={cat:['#f1c48f','tri'],sheep:['#f6f1e6','round'],penguin:['#2a2d33','none'],owl:['#9a7a5a','tuft'],dog:['#d9a46c','flop'],raccoon:['#8d8f94','round'],fox:['#e3843c','tri'],squirrel:['#c07a45','tri'],
 bear:['#a8774f','round'],rabbit:['#f5f1ea','long'],sukuna:['#f0d2c0','none'],porong:['#ffd6e6','long'],hamster:['#f2c48d','round'],blackcat:['#2b2b30','tri'],polar:['#f4f6f8','round'],tiger:['#f0a03c','round'],deer:['#c48a57','antler'],pinkrabbit:['#f7c6d6','long']};
const markerMat=curve(new T.MeshBasicMaterial({color:'#ffb547'})),markerGeo=new T.ConeGeometry(.12,.26,4).rotateX(Math.PI);
function makeNpc(name){const [nm,role,animal,shirt,greet,look]=byName(name),[hc,ear]=ANIMAL[animal]||['#e0b48f','none'];
 const g=new T.Group(),body=new T.Group();g.add(body);
 const mk=(geo,c,x,y,z,par=body)=>{const o=new T.Mesh(geo,toon(c));o.position.set(x,y,z);o.castShadow=true;par.add(o);return o};
 const legs=[-1,1].map(s=>{const l=new T.Group();l.position.set(s*.12,.36,0);body.add(l);mk(new T.CapsuleGeometry(.085,.14,4,10),'#4a4f5c',0,-.14,0,l);mk(new T.SphereGeometry(.105,12,8),'#3b3346',0,-.3,.04,l).scale.set(1,.6,1.35);return l});
 mk(new T.CapsuleGeometry(.25,.2,6,16),shirt,0,.64,0);
 const arms=[-1,1].map(s=>{const a=new T.Group();a.position.set(s*.29,.8,0);a.rotation.z=s*.2;body.add(a);mk(new T.CapsuleGeometry(.07,.18,4,10),shirt,0,-.15,0,a);mk(new T.SphereGeometry(.085,10,8),hc,0,-.31,0,a);return a});
 const head=new T.Group();head.position.y=1.14;body.add(head);mk(new T.SphereGeometry(.38,24,16),hc,0,0,0,head);
 const face=['penguin','owl','polar','porong','sukuna'].includes(animal)?null:['cat','dog','fox','bear','tiger','raccoon','deer','hamster','squirrel','blackcat'].includes(animal)?'snout':null;
 if(['penguin','owl'].includes(animal)){const f=mk(new T.SphereGeometry(.3,18,12),animal==='penguin'?'#f4f1ea':'#e3cfa8',0,-.03,.12,head);f.scale.set(1,.9,.85)}
 if(face){const sn=mk(new T.SphereGeometry(.15,14,10),animal==='blackcat'?'#4a4a52':'#fbf1e2',0,-.1,.3,head);sn.scale.set(1.15,.8,.8);mk(new T.SphereGeometry(.045,8,6),'#2e2a2a',0,-.05,.42,head).userData.noOutline=true}
 if(animal==='penguin'){const b=mk(new T.ConeGeometry(.07,.16,8),'#f2b13a',0,-.08,.4,head);b.rotation.x=Math.PI/2}
 for(const s of [-1,1]){const e=mk(new T.SphereGeometry(.052,10,8),'#2e2a2a',s*.14,.04,.34,head);e.scale.set(1,1.35,.6);e.userData.noOutline=true;const hl=new T.Mesh(new T.SphereGeometry(.018,6,5),curve(new T.MeshBasicMaterial({color:'#fff'})));hl.position.set(s*.14-.015,.075,.375);head.add(hl);
  const bl=new T.Mesh(new T.SphereGeometry(.06,10,8),curve(new T.MeshBasicMaterial({color:'#f7a3a0',transparent:true,opacity:.7,depthWrite:false})));bl.position.set(s*.24,-.07,.3);bl.scale.set(1,.55,.35);head.add(bl)}
 const earAt=(geo,y,sx,rz,c=hc)=>{for(const s of [-1,1]){const m=mk(geo,c,s*sx,y,0,head);m.rotation.z=-s*rz}};
 if(ear==='tri')earAt(new T.ConeGeometry(.12,.26,4),.36,.2,.32);else if(ear==='long')earAt(new T.CapsuleGeometry(.065,.36,4,8),.52,.13,.12);else if(ear==='round')earAt(new T.SphereGeometry(.11,10,8),.3,.27,0);
 else if(ear==='flop')earAt(new T.BoxGeometry(.12,.3,.18),.05,.38,-.18);else if(ear==='tuft')earAt(new T.ConeGeometry(.07,.2,4),.38,.22,.4);else if(ear==='antler')earAt(new T.CylinderGeometry(.025,.035,.42,5),.48,.2,.45,'#8a6648');
 if(animal==='sukuna'){mk(new T.SphereGeometry(.4,18,10,0,Math.PI*2,0,Math.PI*.45),'#f2a8b4',0,.04,-.02,head)}
 if(look.hat){const hc2=look.hatC||'#444';if(look.hat==='straw'){mk(new T.CylinderGeometry(.55,.55,.04,20),hc2,0,.3,0,head);mk(new T.CylinderGeometry(.27,.31,.2,16),hc2,0,.4,0,head)}
  else if(look.hat==='santa'){const m=mk(new T.ConeGeometry(.3,.52,14),hc2,.02,.5,0,head);m.rotation.z=.3;mk(new T.SphereGeometry(.08,8,6),'#ffffff',.17,.72,0,head);mk(new T.TorusGeometry(.3,.06,6,16),'#ffffff',0,.28,0,head).rotation.x=Math.PI/2}
  else if(look.hat==='beret'){const m=mk(new T.SphereGeometry(.36,16,8),hc2,.05,.3,0,head);m.scale.set(1,.3,1);m.rotation.z=-.2}
  else{mk(new T.CylinderGeometry(.3,.34,look.hat==='fedora'?.26:.16,16),hc2,0,.36,0,head);mk(new T.CylinderGeometry(look.hat==='cap'?.36:.5,look.hat==='cap'?.36:.5,.035,16),hc2,0,.28,look.hat==='cap'?.12:0,head)}}
 if(look.scarf){const m=mk(new T.TorusGeometry(.22,.07,8,16),look.scarf,0,.9,0);m.rotation.x=Math.PI/2}
 if(look.glasses){for(const s of [-1,1]){const gl=mk(new T.CylinderGeometry(.075,.075,.03,14),'#1f2226',s*.14,.04,.37,head);gl.rotation.x=Math.PI/2;gl.userData.noOutline=true}mk(new T.BoxGeometry(.1,.02,.02),'#1f2226',0,.05,.38,head).userData.noOutline=true;const bd=mk(new T.SphereGeometry(.22,14,10),'#f4f2ee',0,-.2,.22,head);bd.scale.set(1.15,.85,.7)}
 if(look.bow){const bw=new T.Group();bw.position.set(-.3,.28,.12);head.add(bw);mk(new T.SphereGeometry(.05,8,6),look.bow,0,0,0,bw);for(const s of [-1,1]){const w=mk(new T.ConeGeometry(.08,.16,8),look.bow,s*.09,0,0,bw);w.rotation.z=s*Math.PI/2}}
 outline(g,60);
 const marker=new T.Mesh(markerGeo,markerMat);marker.position.y=2.05;marker.visible=false;g.add(marker);
 scene.add(g);return {g,body,head,legs,arms,marker,name:nm,role,animal,greet,face:animal}}
const FACE={cat:'🐱',sheep:'🐑',penguin:'🐧',owl:'🦉',dog:'🐶',raccoon:'🦝',fox:'🦊',squirrel:'🐿️',bear:'🐻',rabbit:'🐰',sukuna:'😈',porong:'🎀',hamster:'🐹',blackcat:'🐈‍⬛',polar:'🐻‍❄️',tiger:'🐯',deer:'🦌',pinkrabbit:'🩰'};
// 동네 사람 15명(집 · 간판) + 우체국장 + 광장 벤치 할아버지
const RES=[
 {name:'겸손히님',shop:'☕ 겸손 카페',sub:'COFFEE & BREAD',lines:['아침엔 역시 갓 구운 빵 냄새죠.','골목 끝까지 커피 향이 퍼지면 장사 시작이에요!']},
 {name:'롱베이케이션님',shop:'📰 롱베이 신문사',sub:'MORNING NEWS',lines:['오늘 증시? 골목 배달부 주가는 상한가!','특종은 늘 골목 안에 있어요.']},
 {name:'오키오키님',shop:'📚 오키 책방',sub:'BOOKS',lines:['오키오키~ 책 한 권 어때요?','지도 없는 골목 산책은 책 읽기랑 비슷해요.']},
 {name:'아울러님',shop:'🌷 아울러 꽃집',sub:'FLOWERS',lines:['화분 골목 화분은 거의 다 우리 가게 거예요!','꽃이 피면 골목이 웃어요.']},
 {name:'편안하게님',shop:'📖 작은 도서관',sub:'LIBRARY',lines:['쉿… 여기선 발소리도 살금살금.','반납일은 꼭 지켜 주세요~']},
 {name:'해의호흡님',shop:'✒ 시인의 집',sub:'POET',lines:['골목은 짧은 시, 광장은 긴 시.','바람이 문틈으로 편지를 읽어 줘요.']},
 {name:'윈터드림',shop:'❄ 동화 작업실',sub:'STORY STUDIO',lines:['오늘 밤 눈이 올까요?','배달부 이야기를 동화로 써 볼까 해요.']},
 {name:'우울라프님',shop:'📷 우울라프 사진관',sub:'PHOTO STUDIO',lines:['찰칵! 방금 표정 좋았어요.','노을 질 때 골목이 제일 예뻐요.']},
 {name:'굿플렉티스님',shop:'🐾 산책 클럽',sub:'WALKING CLUB',lines:['멍멍! 같이 한 바퀴 돌래요?','막다른 골목도 산책엔 좋아요.']},
 {name:'스피또꿈나무',shop:'🍀 행운 복권방',sub:'LUCKY',lines:['오늘은 왠지 좋은 일이 생길 것 같아요!','긁어 볼까? 긁어 볼까?']},
 {name:'티바이러스',shop:'🧪 티 연구소',sub:'BIO LAB',lines:['손 씻기 30초, 잊지 마세요!','골목 화분 흙에도 미생물 친구들이 살아요.']},
 {name:'원조익평',shop:'📈 익평 투자연구소',sub:'INVEST',lines:['길게 보자! 골목도 인생도.','좋은 자산은 천천히 걸어가도 도착해요.']},
 {name:'포롱이',shop:'🎀 포롱이네',sub:'PORONG',lines:['포롱! 안뇽!','포롱포롱~ 배달부님 최고!']},
 {name:'클라라',shop:'🩰 클라라 발레교실',sub:'BALLET',lines:['사뿐사뿐~ 빙그르르!','오늘 밤엔 광장에서 춤출 거예요.']},
 {name:'산타우찬이',shop:'🎁 우찬이 선물가게',sub:'GIFTS',lines:['호호호! 선물은 언제나 좋아요.','배달이라면 나도 좀 하죠~']}];
const POSTMASTER='까미유데물랭님',BENCH='조만간은퇴님';
const NPCS=[];
function placeNpc(n,x,z,ry){n.x=n.hx=x;n.z=n.hz=z;n.ry=n.hry=ry;n.y=town.footY(x,z,.15);n.g.position.set(x,n.y,z);n.g.rotation.y=ry}
const post=town.post;
{const n=makeNpc(POSTMASTER);n.isPost=true;n.role='골목 우체국장';const d=post.door;placeNpc(n,d.x+d.nx*.95,d.z+d.nz*.95,Math.atan2(d.nx,d.nz));n.lines=['엽서도 편지도 마음을 싣고 가요.','골목은 지도보다 발이 더 잘 알아요.'];NPCS.push(n)}
RES.forEach((r,k)=>{const h=town.homes[k];if(!h)return;const n=makeNpc(r.name);Object.assign(n,r);n.home=h;n.idx=k+1;const d=h.door;placeNpc(n,d.x+d.nx*.95,d.z+d.nz*.95,Math.atan2(d.nx,d.nz));setSignFor(h,r);NPCS.push(n)});
// 마을 바깥 세 곳 사람들 — 집 대신 자리(spot)
const OUTRES=[{name:'료멘스쿠나',at:'forest',lines:['크크큭, 개울 소리를 들으며 낮잠 자기엔 여기가 최고지.','다리 위에서 뛰면 삐걱 소리가 나. 재밌지?']},
 {name:'정원사 할머니',at:'shop',lines:['큰길 화분은 내가 다 심었단다.','흙을 만지면 마음이 차분해져요.']},
 {name:'언덕집 할아버지',at:'hill',lines:['여기서 보면 마을 종탑이 둥근 땅 너머로 쏙 숨는다네.','이 돌계단이 몇 칸인지, 내 무릎은 다 기억하지.']}];
const OUT=town.outer;OUTRES.forEach(r=>{const sp=OUT&&OUT.spots[r.at];if(!sp)return;const n=makeNpc(r.name);Object.assign(n,r);n.spot=sp;placeNpc(n,sp.x,sp.z,sp.ry);NPCS.push(n)});
function setSignFor(h,r){const bg=['#fffaf0','#fde7d3','#e6f4ea','#e5f0fb','#fbe6ef'][h.id%5];town.setSign(h,r.shop,r.sub,bg)}
{const n=makeNpc(BENCH);n.bench=true;placeNpc(n,4.6,2.8,-Math.PI/2);n.body.position.set(0,-.15,0);n.legs.forEach(l=>{l.rotation.x=-1.4;l.position.z=.12});n.lines=['허허, 젊은 배달부 양반! 나도 예전엔 신문 배달을 했지.','막다른 골목이면 한 칸 돌아서 옆 골목으로 가 봐요.','종탑이 보이면 광장이 가까운 거라오.','건물 밑 샛길을 지나면 숨은 안마당이 나오기도 하지.'];NPCS.push(n)}
const npcBy=name=>NPCS.find(n=>n.name===name);

/* ═══ 5. 배달 목록 ═══ */
const ICON={letter:'✉️',parcel:'📦',flower:'💐',poem:'📜',photo:'🖼️',cold:'🧊',fan:'💌'};
const JOBS=[
 {id:1,r:1,to:'겸손히님',k:'parcel',item:'볶은 원두 한 자루',thx:'와, 아침 커피를 내릴 수 있겠어요! ☕ 고마워요 배달부님.'},
 {id:2,r:1,to:'롱베이케이션님',k:'letter',item:'조간신문 교정지',thx:'마감에 딱 맞췄어요! 오늘 1면은 "골목 배달부 대활약"으로 할까요?'},
 {id:3,r:1,to:'오키오키님',k:'parcel',item:'주문한 동화책 세 권',thx:'이 책 기다렸어요! 다 읽으면 빌려 드릴게요 📚'},
 {id:4,r:1,to:'아울러님',k:'letter',item:'봄꽃 씨앗 봉투',thx:'씨앗 고마워요! 대신 이 꽃다발 좀 도서관 편안하게님께 전해 줄래요? 🌷',give:5},
 {id:5,r:1,from:'아울러님',to:'편안하게님',k:'flower',item:'아울러님의 꽃다발',thx:'어머, 꽃향기… 쉿, 도서관에서는 조용히 기뻐할게요 (속닥속닥)'},
 {id:6,r:2,to:'해의호흡님',k:'letter',item:'시 공모전 결과',thx:'당선이래요!! 이 시를 윈터드림님께 제일 먼저 보여 주고 싶어요. 부탁해요!',give:7},
 {id:7,r:2,from:'해의호흡님',to:'윈터드림',k:'poem',item:'해의호흡님의 시 한 편',thx:'"골목마다 바람이 편지를 나른다"… 다음 동화 첫 줄로 써도 될까요? ❄'},
 {id:8,r:2,to:'우울라프님',k:'parcel',item:'사진 필름 열 통',thx:'필름이다! 방금 찍은 강아지 사진, 굿플렉티스님께 갖다 줄래요? 📷',give:9},
 {id:9,r:2,from:'우울라프님',to:'굿플렉티스님',k:'photo',item:'산책 클럽 단체 사진',thx:'멍멍! 우리 클럽 단체 사진이네! 현관에 걸어야지 🐾'},
 {id:10,r:3,to:'스피또꿈나무',k:'letter',item:'복권 당첨 엽서',thx:'꺄! 5등… 그래도 당첨은 당첨이에요! 🍀'},
 {id:11,r:3,to:'티바이러스',k:'cold',item:'차가운 시약 상자',thx:'아직 차갑네요, 완벽해요! 손 씻는 거 잊지 마세요~ 🧪'},
 {id:12,r:3,to:'원조익평',k:'letter',item:'주주총회 안내문',thx:'길게 보면 오늘 같은 하루가 쌓여 큰 수익이 되죠. 📈'},
 {id:13,r:4,to:'포롱이',k:'fan',item:'팬레터 한 묶음',thx:'포롱! 이렇게 많이?! 포롱포롱 🎀'},
 {id:14,r:4,to:'클라라',k:'letter',item:'무대 의상 도착 안내',thx:'사뿐~ 이 초대장, 산타우찬이님께도 꼭 전해 줘요! 오늘 밤 광장 등불 축제 초대장이에요.',give:15},
 {id:15,r:4,from:'클라라',to:'산타우찬이',k:'fan',item:'클라라의 축제 초대장',thx:'호호호! 나도 선물 잔뜩 들고 광장으로 갈게요! 🎁'},
 {id:16,r:2,to:'료멘스쿠나',k:'parcel',item:'캠핑용 등불',thx:'크크큭, 숲까지 들고 왔다고? 오늘 밤엔 개울가에서 등불 켜고 별을 봐야겠군.'},
 {id:17,r:3,to:'정원사 할머니',k:'parcel',item:'꽃모종 흙 한 포대',thx:'아이고 무거웠지? 이 흙이면 큰길 화분이 봄까지 활짝 피겠구나. 🌱'},
 {id:18,r:4,to:'언덕집 할아버지',k:'letter',item:'바다 건너 온 손자의 편지',thx:'손자 편지구먼… 고맙네. 계단 오르느라 힘들었지? 여기서 보면 마을이 둥근 땅 너머로 숨는다네. ✉'}].filter(j=>j.id<16||(town.outer&&OUTRES.some(r=>r.name===j.to&&town.outer.spots[r.at])));
const TOTAL=JOBS.length,job=id=>JOBS.find(j=>j.id===id);
const SAVE='asset-postman-v1';
let S=(()=>{try{return Object.assign({done:[],bag:[],round:0,fest:false,dist:0,time:0},JSON.parse(store(SAVE)||'{}'))}catch(e){return {done:[],bag:[],round:0,fest:false,dist:0,time:0}}})();
function save(){store(SAVE,JSON.stringify(S));store('asset-village-3d-postman',JSON.stringify({done:S.done.length,total:TOTAL,cleared:!!S.fest,at:Date.now()}))}
// 예전 저장(바깥 배달이 없던 때)으로 이미 지난 차례의 새 배달은 가방에 넣어 준다
JOBS.forEach(j=>{if(j.r<=S.round&&!j.from&&!S.done.includes(j.id)&&!S.bag.includes(j.id))S.bag.push(j.id)});
const whereOf=o=>o.spot?o.spot.label:`${town.district(o.home.door.x,o.home.door.z)} 쪽, ${o.home.wallName} 벽에 ${o.home.door.col[1]} 문 '${o.shop}' 간판 집`;
function hintFor(name){const n=npcBy(name);if(n&&n.spot)return n.spot.label;if(!n||!n.home)return '';const h=n.home;return `${town.district(h.door.x,h.door.z)} · ${h.wallName} 벽 ${h.door.col[1]} 문 · '${n.shop}' 간판`}
const roundDone=r=>JOBS.filter(j=>j.r<=r).every(j=>S.done.includes(j.id));
function canIssue(){return S.round<4&&roundDone(S.round)}

/* ═══ 6. 고양이 · 비둘기 · 꽃잎 ═══ */
const CATS=town.cats.slice(0,10).map((c,k)=>{const g=new T.Group(),col=['#f1c48f','#3b3346','#f6f1e6','#a8a8b0','#e3a25a'][k%5];const mk=(geo,x,y,z,sx=1,sy=1,sz=1,cc=col)=>{const m=new T.Mesh(geo,toon(cc));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;g.add(m);return m};
 mk(new T.SphereGeometry(.2,14,10),0,.2,0,1,1.05,1.25);mk(new T.SphereGeometry(.16,14,10),0,.45,.12);for(const s of [-1,1]){const e=mk(new T.ConeGeometry(.06,.12,4),s*.08,.6,.12);e.rotation.z=-s*.3}
 for(const s of [-1,1]){const e=mk(new T.SphereGeometry(.025,6,5),s*.06,.47,.27,1,1,1,'#2e2a2a');e.userData.noOutline=true}
 const tail=new T.Group();tail.position.set(0,.12,-.22);g.add(tail);const tm=new T.Mesh(new T.CapsuleGeometry(.035,.32,4,6),toon(col));tm.position.y=.17;tm.rotation.x=-.4;tail.add(tm);outline(g,60);
 g.position.set(c.x,c.y,c.z);g.rotation.y=c.ry;scene.add(g);town.colliders.push({x:c.x,z:c.z,r:.3});return {g,tail,ph:k*1.7,x:c.x,z:c.z,t:0}});
const PIGEONS=[...Array(9)].map((_,k)=>{const g=new T.Group();const b=new T.Mesh(new T.SphereGeometry(.13,10,8),toon('#9aa0ad'));b.scale.set(1,.85,1.4);b.position.y=.13;g.add(b);const h=new T.Mesh(new T.SphereGeometry(.07,8,6),toon('#7c8494'));h.position.set(0,.25,.13);g.add(h);
 const bk=new T.Mesh(new T.ConeGeometry(.02,.06,4),toon('#e3a25a'));bk.rotation.x=Math.PI/2;bk.position.set(0,.24,.21);g.add(bk);g.traverse(m=>{if(m.isMesh)m.castShadow=true});scene.add(g);
 const a=k/9*Math.PI*2,r=3+(k%3)*.8;const p={g,hx:Math.cos(a)*r,hz:Math.sin(a)*r+.5,x:0,z:0,y:0,vy:0,fly:0,ph:k};p.x=p.hx;p.z=p.hz;return p});
const PET=(()=>{const n=TOUCH?120:220,pos=new Float32Array(n*3),g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));const r=PM_TOWN.rng(4);const sd=[];for(let k=0;k<n;k++){sd.push({x:(r()-.5)*30,y:r()*8,z:(r()-.5)*30,ph:r()*6,s:.3+r()*.6})}
 const m=new T.Points(g,curve(new T.PointsMaterial({color:'#ffd0de',size:.09,transparent:true,opacity:.85,depthWrite:false})));m.frustumCulled=false;scene.add(m);return {m,sd,pos}})();

/* ═══ 7. 입력 ═══ */
const keys={};const P={x:0,z:0,y:0,air:0,gy:null,vy:0,vx:0,vz:0,h:0,phase:0,walk:0,onGround:true};const cam={yaw:0,pitch:.2,dist:TOUCH?4.8:4.3,cur:4.3,user:-9};
const joy={on:false,id:null,sx:0,sy:0,x:0,y:0};let drag=null;
addEventListener('keydown',e=>{if(e.repeat&&!['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))return;keys[e.code]=true;
 if(!started){if(e.code==='Enter'||e.code==='Space'){e.preventDefault();$('start').click()}return}
 if(e.code==='Space'){e.preventDefault();jump()}if(['KeyE','KeyF','Enter'].includes(e.code)){e.preventDefault();act()}if(e.code==='KeyM'||e.code==='Tab'){e.preventDefault();toggleMap()}
 if(/^Digit[1-5]$/.test(e.code))emote(+e.code.slice(5)-1);if(e.code==='Escape'){if($('map').classList.contains('on'))toggleMap(false);else if(!$('finale').hidden)$('fin-walk').click();else if(EMBED)goHome()}});
addEventListener('keyup',e=>{keys[e.code]=false});addEventListener('blur',()=>{for(const k in keys)keys[k]=false});
canvas.addEventListener('pointerdown',e=>{au();if(!started)return;canvas.setPointerCapture(e.pointerId);
 if(e.pointerType==='touch'&&e.clientX<innerWidth*.5&&!joy.on){joy.on=true;joy.id=e.pointerId;joy.sx=e.clientX;joy.sy=e.clientY;joy.x=joy.y=0;showJoy();return}
 drag={id:e.pointerId,x:e.clientX,y:e.clientY}});
canvas.addEventListener('pointermove',e=>{if(joy.on&&e.pointerId===joy.id){const dx=e.clientX-joy.sx,dy=e.clientY-joy.sy,m=Math.hypot(dx,dy),R=56;joy.x=m>R?dx/m:dx/R;joy.y=m>R?dy/m:dy/R;showJoy();return}
 if(drag&&e.pointerId===drag.id){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;cam.yaw-=dx*.0065;cam.pitch=clamp(cam.pitch+dy*.0045,-.05,1.05);cam.user=clock.t}});
const endP=e=>{if(joy.on&&e.pointerId===joy.id){joy.on=false;joy.x=joy.y=0;showJoy()}if(drag&&e.pointerId===drag.id)drag=null};
canvas.addEventListener('pointerup',endP);canvas.addEventListener('pointercancel',endP);
canvas.addEventListener('wheel',e=>{e.preventDefault();cam.dist=clamp(cam.dist*(1+Math.sign(e.deltaY)*.1),2.4,8)},{passive:false});
function showJoy(){const j=$('joy');j.hidden=!joy.on;if(joy.on){j.style.left=joy.sx+'px';j.style.top=joy.sy+'px';j.firstElementChild.style.transform=`translate(${joy.x*40}px,${joy.y*40}px)`}}

/* ═══ 8. 소리 — 오르골 같은 잔잔한 곡 · 발소리 · 배달 종소리 ═══ */
const AU={ctx:null,m:null,on:store('asset-postman-sound')!=='off',beat:0,bt:0};
function au(){try{if(!AU.ctx){AU.ctx=new (window.AudioContext||window.webkitAudioContext)();AU.m=AU.ctx.createGain();AU.m.gain.value=AU.on?.55:0;AU.m.connect(AU.ctx.destination)}if(AU.ctx.state==='suspended')AU.ctx.resume()}catch(e){}return AU.ctx}
function tone(f,d=0,l=.3,type='triangle',v=.05){const c=AU.ctx;if(!c||!AU.on)return;const t=c.currentTime+d,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+l);o.connect(g);g.connect(AU.m);o.start(t);o.stop(t+l+.05)}
function stepSnd(){const c=AU.ctx;if(!c||!AU.on)return;const t=c.currentTime,len=.05,b=c.createBuffer(1,c.sampleRate*len|0,c.sampleRate),d=b.getChannelData(0);for(let k=0;k<d.length;k++)d[k]=(Math.random()*2-1)*Math.pow(1-k/d.length,3);const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=b;f.type='lowpass';f.frequency.value=900+Math.random()*300;g.gain.value=.12;s.connect(f);f.connect(g);g.connect(AU.m);s.start(t)}
const SCALE=[523.25,587.33,659.25,783.99,880,1046.5,1174.7],CHORDS=[[261.63,329.63,392],[220,261.63,329.63],[174.61,220,261.63],[196,246.94,293.66]];
function music(dt){if(!AU.ctx||!AU.on)return;AU.bt-=dt;if(AU.bt>0)return;AU.bt=.46;const b=AU.beat++,ch=CHORDS[Math.floor(b/8)%4];
 if(b%8===0)ch.forEach((f,k)=>tone(f/2,k*.02,3.6,'sine',.018));const night=ENV.night;if(Math.random()<(night>.6?.3:.45))tone(SCALE[Math.floor(Math.random()*SCALE.length)]*(night>.6?.5:1),0,1.1,'triangle',.028);
 if(b%2===0&&Math.random()<.35)tone(ch[Math.floor(Math.random()*3)]*2,.23,.8,'sine',.02)}
const jingle=()=>{[784,988,1175,1568].forEach((f,k)=>tone(f,k*.09,.5,'triangle',.06))},blip=()=>{tone(880,0,.12,'square',.02);tone(1320,.06,.14,'square',.018)},meow=()=>{const c=AU.ctx;if(!c||!AU.on)return;const t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(620,t);o.frequency.linearRampToValueAtTime(900,t+.12);o.frequency.linearRampToValueAtTime(520,t+.35);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.03,t+.04);g.gain.exponentialRampToValueAtTime(.0001,t+.4);const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=1600;o.connect(f);f.connect(g);g.connect(AU.m);o.start(t);o.stop(t+.45)};
function setSound(on){AU.on=on;store('asset-postman-sound',on?'on':'off');au();if(AU.m)AU.m.gain.value=on?.55:0;$('snd').textContent=on?'🔊':'🔈';$('snd').setAttribute('aria-pressed',on)}

/* ═══ 9. 주인공 움직임 · 카메라 ═══ */
function blocked(i,j){if(i<0||j<0||i>=town.N||j>=town.N)return false;return town.blockedCell(i,j)}
function resolve(px,pz,r){let x=px,z=pz;for(let it=0;it<3;it++){const i0=ci(x),j0=ci(z);for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const i=i0+di,j=j0+dj;if(!blocked(i,j))continue;const x0=cx(i)-CS/2,x1=x0+CS,z0=cx(j)-CS/2,z1=z0+CS,qx=clamp(x,x0,x1),qz=clamp(z,z0,z1);let dx=x-qx,dz=z-qz,d=Math.hypot(dx,dz);
   if(d<r){if(d<1e-6){const opts=[[x-x0,-1,0],[x1-x,1,0],[z-z0,0,-1],[z1-z,0,1]].sort((a,b)=>a[0]-b[0])[0];x+=opts[1]*(opts[0]+r);z+=opts[2]*(opts[0]+r)}else{x+=dx/d*(r-d);z+=dz/d*(r-d)}}}
  for(const c of town.colliders){if(c.box){const [x0,z0,x1,z1]=c.box;if(x<x0-r||x>x1+r||z<z0-r||z>z1+r)continue;const qx=clamp(x,x0,x1),qz=clamp(z,z0,z1);let dx=x-qx,dz=z-qz,d=Math.hypot(dx,dz);if(d<r){if(d<1e-6){const o=[[x-x0,-1,0],[x1-x,1,0],[z-z0,0,-1],[z1-z,0,1]].sort((p,q)=>p[0]-q[0])[0];x+=o[1]*(o[0]+r);z+=o[2]*(o[0]+r)}else{x+=dx/d*(r-d);z+=dz/d*(r-d)}}continue}if(!c.r)continue;const dx=x-c.x,dz=z-c.z,d=Math.hypot(dx,dz),rr=c.r+r;if(d<rr&&d>1e-6){x+=dx/d*(rr-d);z+=dz/d*(rr-d)}}
  for(const n of NPCS){const dx=x-n.x,dz=z-n.z,d=Math.hypot(dx,dz),rr=.36+r;if(d<rr&&d>1e-6){x+=dx/d*(rr-d);z+=dz/d*(rr-d)}}
  [x,z]=town.walkFix(x,z,r)}return [x,z]}
const PR=.42;   // 주인공 몸 반지름(팔 · 가방까지) — 벽에 겹쳐 보이지 않게
function jump(){if(P.onGround&&!talkLock()){P.vy=4.6;P.onGround=false;HERO.jump();tone(520,0,.12,'sine',.03);tone(780,.05,.12,'sine',.025)}}
let lastStep=0;
function movePlayer(dt){let ix=0,iz=0;if(keys.KeyW||keys.ArrowUp)iz+=1;if(keys.KeyS||keys.ArrowDown)iz-=1;if(keys.KeyA||keys.ArrowLeft)ix-=1;if(keys.KeyD||keys.ArrowRight)ix+=1;
 if(joy.on){ix+=joy.x;iz-=joy.y}let m=Math.hypot(ix,iz);if(m>1){ix/=m;iz/=m;m=1}if(talkLock()){ix=iz=0;m=0}
 const fx=-Math.sin(cam.yaw),fz=-Math.cos(cam.yaw),rx=Math.cos(cam.yaw),rz=-Math.sin(cam.yaw);
 const run=keys.ShiftLeft||keys.ShiftRight||(joy.on&&m>.92),sp=run?5.6:3.1;const tvx=(fx*iz+rx*ix)*sp,tvz=(fz*iz+rz*ix)*sp;const acc=m>.05?9:12;
 P.vx+=(tvx-P.vx)*Math.min(1,dt*acc);P.vz+=(tvz-P.vz)*Math.min(1,dt*acc);const v=Math.hypot(P.vx,P.vz);
 const n=Math.max(1,Math.ceil(v*dt/.12));let ox=P.x,oz=P.z;for(let k=0;k<n;k++){const [x,z]=resolve(P.x+P.vx*dt/n,P.z+P.vz*dt/n,PR);P.x=x;P.z=z}
 const moved=Math.hypot(P.x-ox,P.z-oz);S.dist+=moved;
 if(v>.25){const th=Math.atan2(P.vx,P.vz);P.h+=wrapA(th-P.h)*Math.min(1,dt*10)}
 {const gy=town.footY(P.x,P.z,.2);P.gy=P.gy===null?gy:Math.max(gy-.04,P.gy+(gy-P.gy)*Math.min(1,dt*18));P.vy-=13*dt;P.air+=P.vy*dt;if(P.air<=0){P.air=0;P.vy=0;P.onGround=true}P.y=P.gy+P.air}
 const amt=clamp(moved/dt/3.1,0,1.4);P.walk+=(Math.min(1,amt)-P.walk)*Math.min(1,dt*8);P.phase+=dt*(5+amt*4.2)*P.walk;
 if(P.onGround&&P.walk>.3){const s=Math.floor(P.phase/Math.PI);if(s!==lastStep){lastStep=s;stepSnd()}}
 HERO.root.position.set(P.x,P.y+.02,P.z);HERO.root.rotation.y=P.h;HERO.walk(P.phase,P.walk,clock.t,dt);HERO.shadow.position.set(P.x,P.gy+.04,P.z);HERO.shadow.scale.setScalar(1-Math.min(.5,P.air*.3));
 return {v:moved/dt,m}}
const _t=new T.Vector3(),_d=new T.Vector3(),_d2=new T.Vector3(),_p=new T.Vector3();
function reach(yaw,pitch,want){const cp=Math.cos(pitch);_d2.set(Math.sin(yaw)*cp,Math.sin(pitch),Math.cos(yaw)*cp);for(let s=.35;s<=want+.3;s+=.1){_p.copy(_t).addScaledVector(_d2,s);if(town.camBlock(_p.x,_p.y,_p.z))return Math.max(.7,s-.32)}return want}
// 뒤가 막히면(막다른 골목 · 내리막 · 벽 앞) 먼저 위로 들어 올리고 조금 멀리, 그래도 안 되면 살짝만 돌린다.
// 한 번 고른 보정은 0.45초 동안 지켜서 카메라가 이리저리 튀지 않게 한다.
const camFix={off:0,lift:0,toff:0,tlift:0,t:-9,k:0};
function pickFix(yaw,pitch,want,allowYaw,ahead=0){let best=[0,0],bs=-1e9;
 for(const lift of [0,.15,.3,.45,.6,.8,1,1.2]){if(pitch+lift>1.35)break;const w=want*(1+lift*.25);for(const off of allowYaw?[0,-.3,.3,-.6,.6]:[0]){
  const r=Math.min(reach(yaw+off,pitch+lift,w),ahead?reach(yaw+ahead+off,pitch+lift,w)*.5+w*.5:w),sc=Math.min(1,r/w)*2-lift*.3-Math.abs(off)*.7+(Math.abs(off-camFix.toff)<.01&&Math.abs(lift-camFix.tlift)<.01?.06:0);if(sc>bs){bs=sc;best=[off,lift]}}}
 return best}
function updateCam(dt,mv){const t=clock.t,drag=t-cam.user<.8;if(mv.m>.1&&t-cam.user>1.4&&!talkLock()){const want=P.h+Math.PI,rate=1.1+Math.min(2,mv.v*.35);cam.yaw+=wrapA(want-cam.yaw)*Math.min(1,dt*rate*.9)}
 _t.set(P.x,P.gy+P.air*.6+1.15,P.z);
 // 말 걸 때: 주인공과 상대가 함께 보이는 방향 중 벽에 안 막히는 쪽을 한 번만 골라 천천히 돈다
 if(talk.npc){if(talk.camFor!==talk.npc){talk.camFor=talk.npc;const n=talk.npc,a=Math.atan2(P.x-n.x,P.z-n.z);let bs=-1e9;talk.camYaw=cam.yaw;
   for(const y of [a+.9,a-.9,a+.5,a-.5,a+1.4,a-1.4,cam.yaw]){const sc=reach(y,cam.pitch+.15,3.4)-Math.abs(wrapA(y-cam.yaw))*.15;if(sc>bs+.01){bs=sc;talk.camYaw=y}}}
  cam.yaw+=wrapA(talk.camYaw-cam.yaw)*Math.min(1,dt*2)}else talk.camFor=null;
 camFix.k+=((talk.npc?1:0)-camFix.k)*Math.min(1,dt*2.5);const want=cam.dist+(Math.min(cam.dist,3.4)-cam.dist)*camFix.k,pitch=cam.pitch+.12*camFix.k;
 {const w=want*(1+camFix.tlift*.25),blocked=reach(cam.yaw+camFix.toff,pitch+camFix.tlift,w)<w*.7;if(t-camFix.t>.45||(blocked&&t-camFix.t>.06)){camFix.t=t;[camFix.toff,camFix.tlift]=pickFix(cam.yaw,pitch,want,!drag,mv.m>.1&&!drag?Math.max(-.8,Math.min(.8,wrapA(P.h+Math.PI-cam.yaw))):0)}}
 camFix.off+=(camFix.toff-camFix.off)*Math.min(1,dt*2.2);camFix.lift+=(camFix.tlift-camFix.lift)*Math.min(1,dt*(camFix.tlift>camFix.lift?6:1.3));
 const yawF=cam.yaw+camFix.off,pF=Math.min(1.38,pitch+camFix.lift),wantF=want*(1+camFix.lift*.25),cp=Math.cos(pF);_d.set(Math.sin(yawF)*cp,Math.sin(pF),Math.cos(yawF)*cp);
 const d=reach(yawF,pF,wantF);cam.cur=d<cam.cur-.01&&d<wantF-.05?Math.max(d,cam.cur-dt*(d<cam.cur*.75?16:10)):cam.cur+(d-cam.cur)*Math.min(1,dt*2.2);
 camera.position.copy(_t).addScaledVector(_d,cam.cur);camera.lookAt(_t.x,_t.y+.45-camFix.lift*.25,_t.z);
 HERO.root.visible=cam.cur>.8}

/* ═══ 10. 이야기 · 배달 ═══ */
const talk={npc:null,t:0,text:''};const talkLock=()=>!!talk.npc&&talk.lock;
function nearestNpc(r=2.3){let best=null,bd=r;for(const n of NPCS){const d=Math.hypot(n.x-P.x,n.z-P.z);if(d<bd){bd=d;best=n}}return best}
function pending(n){if(n.isPost)return !S.fest&&!eve&&(canIssue()||S.done.length>=TOTAL);return S.bag.some(id=>job(id).to===n.name)}
function say(n,text,sec=4.6,lock=false){talk.npc=n;talk.text=text;talk.t=sec;talk.lock=lock;const b=$('bubble');b.querySelector('.bb-who').textContent=(FACE[n.face]||'')+' '+n.name;b.querySelector('.bb-txt').textContent=text;b.hidden=false;b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop');blip()}
function act(){au();if(!started||!$('finale').hidden)return;const n=nearestNpc();if(!n){if(talk.npc)closeTalk();return}
 n.wave=1.4;
 if(n.isPost)return postTalk(n);
 const mine=S.bag.filter(id=>job(id).to===n.name);
 if(mine.length){const j=job(mine[0]);S.bag=S.bag.filter(id=>id!==j.id);S.done.push(j.id);n.hop=.6;HERO.wave();say(n,j.thx,6);stampFx(j);jingle();burst(n.x,1.6,n.z);
  if(j.give){S.bag.push(j.give);const g=job(j.give);setTimeout(()=>{toast(`<b>${ICON[g.k]} ${g.item}</b>${g.to}에게 전해 주세요`,4.5);tone(660,0,.2);tone(990,.12,.3)},1600)}
  ENV.want=Math.min(.84,S.done.length/TOTAL*.84);save();renderBag();
  if(S.done.length>=TOTAL)setTimeout(()=>toast('<b>📮 오늘 배달 끝!</b>골목 우체국 까미유데물랭님에게 돌아가요',6),3200);
  else if(S.bag.length===0&&canIssue())setTimeout(()=>toast('<b>📮 가방이 비었어요</b>골목 우체국에 가서 다음 배달을 받아요',5),3200);return}
 // 할 일이 없으면 수다 — 가방 속 받는 사람이 사는 골목을 귀띔해 준다
 const others=S.bag.map(job).filter(j=>j.to!==n.name);
 if(others.length&&Math.random()<.65){const j=others[Math.floor(Math.random()*others.length)];const o=npcBy(j.to);say(n,o.spot?`${j.to}? 마을 밖이에요. ${o.spot.label}!`:`${j.to}? ${town.district(o.home.door.x,o.home.door.z)} 쪽에 살아요. ${o.home.door.col[1]} 문에 '${o.shop}' 간판이 걸린 집이요!`,6);return}
 say(n,n.lines[Math.floor(Math.random()*n.lines.length)],4.5)}
function postTalk(n){if(S.done.length>=TOTAL&&!S.fest){say(n,'오늘 배달 끝! 정말 수고 많았어요. 해가 지면 종탑 광장에서 등불 축제가 열려요. 광장 분수로 와요! 🏮',7);startEve();return}
 if(S.fest){say(n,'오늘 같은 날이 또 오면 좋겠어요. 내일도 골목을 부탁해요!',5);return}
 if(canIssue()){S.round++;const list=JOBS.filter(j=>j.r===S.round&&!j.from&&!S.done.includes(j.id)&&!S.bag.includes(j.id));S.bag.push(...list.map(j=>j.id));save();renderBag();
  const msg={1:'좋은 아침이에요, 배달부님! 첫 가방이에요. 받는 사람 집은 편지에 적힌 골목 · 벽 색 · 간판을 보고 찾아요. 지도(M)도 있어요!',2:'벌써 다 했어요? 점심 가방이에요. 받은 사람이 다른 사람에게 물건을 맡길지도 몰라요.',3:'오후 가방이에요. 차가운 상자는 빨리 갖다 주는 게 좋겠죠?',4:'마지막 가방! 노을 지기 전에 끝내 봐요.'}[S.round];
  say(n,msg,7);HERO.wave();tone(523,0,.2);tone(659,.1,.2);tone(784,.2,.3);return}
 const left=S.bag.length;say(n,left?`가방에 아직 ${left}개 남았어요. ${hintFor(job(S.bag[0]).to)} — 거기부터 가 볼까요?`:'잠깐만요, 다음 우편을 정리하고 있어요.',6)}
function closeTalk(){talk.npc=null;$('bubble').hidden=true}

/* ═══ 11. 이모지 인사 ═══ */
const EMO=['👋','😊','❤️','❓','🎵'],REPLY={0:['👋','🙌','😄'],1:['😊','☺️','😆'],2:['💕','🥰','💗'],3:['❗'],4:['🎶','💃','🕺']};
function emote(k){au();const e=EMO[k];heroEmo(e);if(k===0)HERO.wave();if(k===4)HERO.jump();tone([660,740,880,600,990][k],0,.18,'sine',.04);
 let best=null,bd=7;for(const n of NPCS){const d=Math.hypot(n.x-P.x,n.z-P.z);if(d<bd){bd=d;best=n}}
 for(const c of CATS){if(Math.hypot(c.x-P.x,c.z-P.z)<4){c.t=1.5;setTimeout(meow,300)}}
 if(!best)return;setTimeout(()=>{if(k===3){const j=S.bag.map(job).find(j=>j.to!==best.name);if(j){const o=npcBy(j.to);say(best,o.spot?`${j.to}요? ${o.spot.label}.`:`${j.to}네 집이요? ${town.district(o.home.door.x,o.home.door.z)}, ${o.home.wallName} 벽에 ${o.home.door.col[1]} 문이에요.`,5.5);return}}
  const r=REPLY[k];npcEmo(best,r[Math.floor(Math.random()*r.length)]);best.wave=k===0?1.4:0;if(k===4||k===2)best.hop=.5},550)}
const emoEls=[];function heroEmo(e){const el=document.createElement('div');el.className='emo';el.textContent=e;document.body.appendChild(el);emoEls.push({el,t:1.8,who:null});}
function npcEmo(n,e){const el=document.createElement('div');el.className='emo';el.textContent=e;document.body.appendChild(el);emoEls.push({el,t:1.8,who:n})}

/* ═══ 12. 화면 표시 ═══ */
function toast(html,sec=3.5){const t=$('toast');t.innerHTML=html;t.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove('on'),sec*1000)}
function stampFx(j){const s=$('stamp');s.querySelector('.st-ic').textContent=ICON[j.k];s.querySelector('.st-to').textContent=j.to;s.querySelector('.st-n').textContent=`${S.done.length} / ${TOTAL}`;s.classList.remove('go');void s.offsetWidth;s.classList.add('go')}
let selJob=null;
function renderBag(){$('count').textContent=`${S.done.length} / ${TOTAL}`;$('count-bar').style.width=(S.done.length/TOTAL*100)+'%';
 const el=$('bag-list');el.innerHTML='';
 if(!S.bag.length){const li=document.createElement('li');li.className='empty';li.innerHTML=S.fest?'🏮 오늘 하루 끝 · 골목을 마음껏 걸어요':S.done.length>=TOTAL?'📮 우체국에 들러 인사해요':canIssue()?'📮 골목 우체국에서 가방을 받아요':'…';el.appendChild(li)}
 S.bag.forEach(id=>{const j=job(id),li=document.createElement('li');li.className='card'+(selJob===id?' sel':'');li.innerHTML=`<span class="cd-ic">${ICON[j.k]}</span><span class="cd-b"><b>${j.to}</b><small>${j.item}${j.from?` · ${j.from}이 맡김`:''}</small><em>${hintFor(j.to)}</em></span>`;li.onclick=()=>{selJob=selJob===id?null:id;renderBag();blip()};el.appendChild(li)});
 $('bag').classList.toggle('has',S.bag.length>0);$('bag-n').textContent=S.bag.length?S.bag.length+'개':''}
const _sv=new T.Vector3();
function project(x,y,z){const dx=x-P.x,dz=z-P.z;_sv.set(x,y-(dx*dx+dz*dz)*CURVE.uCurve.value,z).project(camera);return {x:(_sv.x+1)/2*innerWidth,y:(1-_sv.y)/2*innerHeight,ok:_sv.z<1&&_sv.z>-1}}
function updateHud(dt){const near=nearestNpc();const a=$('act');
 if(near&&$('finale').hidden){let txt='💬 말 걸기';if(near.isPost)txt=pending(near)?(S.done.length>=TOTAL?'📮 배달 끝 알리기':'📮 우편 가방 받기'):'📮 우체국장과 이야기';else{const j=S.bag.map(job).find(j=>j.to===near.name);if(j)txt=`${ICON[j.k]} ${j.item} 건네기`}
  a.innerHTML=`<kbd>${TOUCH?'탭':'E'}</kbd>${txt}`;a.hidden=false;a.classList.toggle('hot',pending(near))}else a.hidden=true;
 const tg=$('tag');if(near&&!talk.npc){const p=project(near.x,near.y+2.3,near.z);if(p.ok){tg.hidden=false;tg.textContent=near.name+(near.role?' · '+near.role:'');tg.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-100%)`}else tg.hidden=true}else tg.hidden=true;
 if(talk.npc){talk.t-=dt;const n=talk.npc,d=Math.hypot(n.x-P.x,n.z-P.z);if(talk.t<=0||d>5)closeTalk();else{const p=project(n.x,n.y+2.25,n.z),b=$('bubble');if(p.ok){b.style.transform=`translate(${clamp(p.x,150,innerWidth-150)}px,${Math.max(90,p.y)}px) translate(-50%,-100%)`}}}
 for(let k=emoEls.length-1;k>=0;k--){const e=emoEls[k];e.t-=dt;if(e.t<=0){e.el.remove();emoEls.splice(k,1);continue}const w=e.who||{x:P.x,z:P.z},hy=(e.who?2.2:1.85)+(1.8-e.t)*.35,p=project(w.x,(e.who?e.who.y:P.y)+hy,w.z);e.el.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-100%) scale(${Math.min(1,(1.8-e.t)*6)})`;e.el.style.opacity=Math.min(1,e.t*2)}}

/* ═══ 13. 지도 ═══ */
const mapC=$('map-c'),mctx=mapC.getContext('2d');
function toggleMap(on){const m=$('map');on=on===undefined?!m.classList.contains('on'):on;m.classList.toggle('on',on);if(on)drawMap();blip()}
const MAPD=OUT?OUT.mapData():null;
function drawMap(){const W=mapC.width,N=town.N,G=town.G;mctx.fillStyle='#a9d58f';mctx.fillRect(0,0,W,W);
 // 마을 + 바깥 세 곳이 다 들어가게(정사각)
 let [bx0,bz0,bx1,bz1]=MAPD?MAPD.bounds:[-town.HW,-town.HW,town.HW,town.HW];const span=Math.max(bx1-bx0,bz1-bz0),mx=(bx0+bx1)/2,mz=(bz0+bz1)/2,k=W/span;
 const tp=(x,z)=>[(x-mx)*k+W/2,(z-mz)*k+W/2],s=CS*k;
 if(MAPD){const line=(pts,w,col)=>{mctx.strokeStyle=col;mctx.lineWidth=Math.max(2,w*k);mctx.lineCap='round';mctx.lineJoin='round';mctx.beginPath();pts.forEach((p,i)=>{const [a,b]=tp(p[0],p[1]);i?mctx.lineTo(a,b):mctx.moveTo(a,b)});mctx.stroke()};
  for(const w of MAPD.water)line(w.pts,w.w,'#79c3d6');for(const r of MAPD.roads)line(r.pts,r.w,r.col);for(const p of MAPD.pads){const [a,b]=tp(p.x,p.z);mctx.fillStyle=p.col;mctx.beginPath();mctx.arc(a,b,p.r*k,0,7);mctx.fill()}
  for(const b of MAPD.boxes){const [a,c]=tp(b.x0,b.z0),[d,e]=tp(b.x1,b.z1);mctx.fillStyle='#e3cdb0';mctx.fillRect(a,c,d-a,e-c);mctx.strokeStyle='rgba(90,70,54,.5)';mctx.lineWidth=1;mctx.strokeRect(a,c,d-a,e-c)}}
 {const [ox,oz]=tp(-town.HW,-town.HW);for(let j=0;j<N;j++)for(let i=0;i<N;i++){const v=G[j*N+i];mctx.fillStyle=v===1?'#fffaf0':v===2?'#f3e6c9':v===7?'#b5d69c':v===4?'#4f6f8f':'#d9c7a8';mctx.fillRect(ox+i*s,oz+j*s,s+.5,s+.5)}
  for(const h of town.houses){mctx.fillStyle=h.wall;mctx.fillRect(ox+h.i0*s+.8,oz+h.j0*s+.8,h.w*s-1.6,h.h*s-1.6)}}
 mctx.fillStyle='#79c3d6';{const [x,y]=tp(0,0);mctx.beginPath();mctx.arc(x,y,Math.max(3,s*.9),0,7);mctx.fill()}
 mctx.textAlign='center';mctx.textBaseline='middle';mctx.font='700 13px Jua,"Apple SD Gothic Neo",sans-serif';
 for(const [t,x,z] of [['빨래줄 골목',0,-30],['등불 골목',30,0],['고양이 골목',0,30],['화분 골목',-30,0],...(MAPD?MAPD.labels:[])]){const [a,b]=tp(x,z);mctx.lineWidth=4;mctx.strokeStyle='rgba(255,250,240,.9)';mctx.strokeText(t,a,b);mctx.fillStyle='#5a4636';mctx.fillText(t,a,b)}
 const pin=(x,z,ic,sel)=>{const [a,b]=tp(x,z);mctx.font=(sel?'26px':'19px')+' sans-serif';mctx.fillText(ic,a,b-6)};
 {const d=post.door;pin(d.x,d.z,'📮')}
 S.bag.forEach(id=>{const j=job(id),n=npcBy(j.to);if(n&&n.home)pin(n.home.door.x,n.home.door.z,ICON[j.k],selJob===id);else if(n&&n.spot)pin(n.spot.x,n.spot.z,ICON[j.k],selJob===id)});
 const [hx,hy]=tp(P.x,P.z);mctx.save();mctx.translate(hx,hy);mctx.rotate(-P.h+Math.PI);mctx.fillStyle='#e0483e';mctx.strokeStyle='#fff';mctx.lineWidth=2;mctx.beginPath();mctx.moveTo(0,-9);mctx.lineTo(7,7);mctx.lineTo(0,3);mctx.lineTo(-7,7);mctx.closePath();mctx.fill();mctx.stroke();mctx.restore()}

/* ═══ 14. 축제 — 밤 · 동네 사람들이 광장 분수에 모인다 · 등불이 하늘로 · 불꽃 ═══ */
let eve=false,fest=null;
function startEve(){if(eve)return;eve=true;ENV.want=1;toast('<b>🏮 등불 축제</b>해가 졌어요. 종탑 광장 분수로 가요!',6);
 const ring=NPCS.filter(n=>!n.bench);ring.forEach((n,k)=>{const a=4.5+k/ring.length*(Math.PI*2-1.3),r=3.1+(k%2)*.75;n.goto={x:Math.cos(a)*r,z:Math.sin(a)*r}})}
const LANT=(()=>{const n=46,m=new T.InstancedMesh(new T.CylinderGeometry(.22,.17,.42,8),curve(new T.MeshBasicMaterial({color:'#ffb766'})),n);m.frustumCulled=false;m.visible=false;scene.add(m);const L=[];const r=PM_TOWN.rng(8);for(let k=0;k<n;k++)L.push({a:r()*6.28,r:1+r()*7,y:-r()*14,v:.7+r()*.6,ph:r()*6});return {m,L}})();
const FW=(()=>{const n=1400,pos=new Float32Array(n*3),col=new Float32Array(n*3),g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('color',new T.BufferAttribute(col,3));
 const m=new T.Points(g,curve(new T.PointsMaterial({size:.32,vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending,fog:false})));m.frustumCulled=false;scene.add(m);const pts=[...Array(n)].map(()=>({x:0,y:-99,z:0,vx:0,vy:0,vz:0,l:0,c:[1,1,1]}));return {m,pts,pos,col,i:0,t:0}})();
function burst(x,y,z,big){const cols=[[1,.55,.6],[1,.85,.4],[.55,.85,1],[.7,1,.6],[1,.6,1]],c=cols[Math.floor(Math.random()*cols.length)],n=big?140:36;for(let k=0;k<n;k++){const p=FW.pts[FW.i=(FW.i+1)%FW.pts.length];const u=Math.random()*2-1,a=Math.random()*6.28,q=Math.sqrt(1-u*u),s=(big?7:2.6)*(.7+Math.random()*.3);
 p.x=x;p.y=y;p.z=z;p.vx=Math.cos(a)*q*s;p.vy=u*s+(big?0:1.8);p.vz=Math.sin(a)*q*s;p.l=big?1.8+Math.random()*.6:.9+Math.random()*.4;p.c=c}}
function updateFx(dt,t){let any=false;for(let k=0;k<FW.pts.length;k++){const p=FW.pts[k];if(p.l>0){any=true;p.l-=dt;p.vy-=3.2*dt;p.vx*=.985;p.vz*=.985;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt}const a=Math.max(0,Math.min(1,p.l*1.4));FW.pos[k*3]=p.x;FW.pos[k*3+1]=p.l>0?p.y:-99;FW.pos[k*3+2]=p.z;FW.col[k*3]=p.c[0]*a;FW.col[k*3+1]=p.c[1]*a;FW.col[k*3+2]=p.c[2]*a}
 if(any||FW.t>0){FW.m.geometry.attributes.position.needsUpdate=true;FW.m.geometry.attributes.color.needsUpdate=true}
 if(fest){fest.t+=dt;LANT.m.visible=true;const o=new T.Object3D();LANT.L.forEach((l,k)=>{l.y+=l.v*dt*(fest.t>2?1:0);if(l.y>34)l.y=0;const sp=1+Math.max(0,l.y)*.05;o.position.set(Math.cos(l.a+t*.05)*l.r*sp,l.y+1.6+town.plaza.y,Math.sin(l.a+t*.05)*l.r*sp);o.rotation.z=Math.sin(t+l.ph)*.15;o.scale.setScalar(l.y<0?0:Math.min(1,l.y*2));o.updateMatrix();LANT.m.setMatrixAt(k,o.matrix)});LANT.m.instanceMatrix.needsUpdate=true;
  FW.t-=dt;if(FW.t<=0){FW.t=.9+Math.random()*.9;const a=Math.random()*6.28,r=4+Math.random()*10;burst(Math.cos(a)*r,town.plaza.y+16+Math.random()*10,Math.sin(a)*r,true);tone(140+Math.random()*60,0,.6,'sine',.05);tone(1200+Math.random()*600,.05,.5,'triangle',.012)}}}
function startFest(){if(fest)return;fest={t:0};S.fest=true;save();renderBag();jingle();toast('<b>🏮 골목 등불 축제</b>동네 사람들이 모두 모였어요!',6);NPCS.forEach(n=>{n.hop=.7;n.wave=2});
 setTimeout(()=>{$('fin-n').textContent=`${S.done.length} / ${TOTAL}`;$('fin-d').textContent=(S.dist/1000).toFixed(2)+' km';$('fin-t').textContent=Math.max(1,Math.round(S.time/60))+'분';$('finale').hidden=false;try{store('asset-village-3d-postman',JSON.stringify({done:TOTAL,total:TOTAL,cleared:true,at:Date.now()}))}catch(e){}},5200)}

/* ═══ 15. 매 프레임 ═══ */
const clock={t:0,last:performance.now()};let started=false;
function updateNpcs(dt,t){for(const n of NPCS){
 if(n.goto){const dg=Math.hypot(n.goto.x-P.x,n.goto.z-P.z),dn=Math.hypot(n.x-P.x,n.z-P.z);if(fest||(dg>11&&dn>11)){n.x=n.goto.x;n.z=n.goto.z;n.goto=null;n.hry=Math.atan2(-n.x,-n.z);n.hx=n.x;n.hz=n.z}}
 const dp=Math.hypot(n.x-P.x,n.z-P.z);let face=n.goto?n.ry:n.hry;if(dp<5.5&&!n.goto)face=Math.atan2(P.x-n.x,P.z-n.z);if(!n.bench)n.ry+=wrapA(face-n.ry)*Math.min(1,dt*5);
 n.y=town.footY(n.x,n.z,.15);n.g.position.set(n.x,n.y,n.z);n.g.rotation.y=n.ry;const br=Math.sin(t*2.2+n.x);n.body.position.y=(n.bench?-.15:0)+br*.012;n.head.rotation.z=Math.sin(t*.8+n.z)*.06;n.head.rotation.x=dp<5?-.08:0;
 if(n.hop>0){n.hop-=dt;n.body.position.y+=Math.sin(Math.PI*Math.max(0,n.hop)/.6)*.3}
 const sw=0;if(!n.bench){n.legs[0].rotation.x=sw;n.legs[1].rotation.x=-sw}
 if(n.wave>0){n.wave-=dt;n.arms[1].rotation.set(0,0,2.6+Math.sin(t*14)*.3)}else{n.arms[1].rotation.set(-sw*.7,0,.2+br*.03);}n.arms[0].rotation.set(sw*.7,0,-.2-br*.03);
 const pend=pending(n);n.marker.visible=pend&&!fest;if(n.marker.visible){n.marker.position.y=2.05+Math.sin(t*3+n.x)*.08;n.marker.rotation.y=t*2}}
 markerMat.color.setHSL(.1,1,.6+Math.sin(t*4)*.08)}
function updateLife(dt,t){for(const c of CATS){c.tail.rotation.z=Math.sin(t*(c.t>0?8:2)+c.ph)*.5;c.g.children[1].rotation.y=Math.sin(t*.6+c.ph)*.4;if(c.t>0)c.t-=dt;}
 for(const p of PIGEONS){const d=Math.hypot(p.x-P.x,p.z-P.z),run=Math.hypot(P.vx,P.vz)>4;if(p.fly<=0&&d<(run?3.2:1.6)){p.fly=6;p.vy=3.5;p.dir=Math.atan2(p.x-P.x,p.z-P.z)+(Math.random()-.5);tone(300+Math.random()*80,0,.25,'sine',.015)}
  if(p.fly>0){p.fly-=dt;p.vy-=dt*.6;p.y+=Math.max(.6,p.vy)*dt;p.x+=Math.sin(p.dir)*5*dt;p.z+=Math.cos(p.dir)*5*dt;p.g.rotation.y=p.dir;p.g.children[0].scale.x=1+Math.abs(Math.sin(t*30))*.8;if(p.fly<=0){p.x=p.hx;p.z=p.hz;p.y=0}}
  else{p.g.children[1].position.y=.25-Math.max(0,Math.sin(t*3+p.ph*2))*.07;p.g.children[0].scale.x=1;if(Math.random()<dt*.3)p.g.rotation.y+=(Math.random()-.5)*2}
  p.g.position.set(p.x,p.y+town.plaza.y,p.z)}
 const night=ENV.night;PET.m.material.color.setRGB(1,lerp(.82,.95,night),lerp(.87,.55,night));PET.m.material.size=lerp(.09,.13,night);
 for(let k=0;k<PET.sd.length;k++){const s=PET.sd[k];s.y-=dt*s.s*.35;s.x+=Math.sin(t*.7+s.ph)*dt*.5+dt*.4;s.z+=Math.cos(t*.5+s.ph)*dt*.3;let dx=s.x-P.x,dz=s.z-P.z;if(dx>15)s.x-=30;if(dx<-15)s.x+=30;if(dz>15)s.z-=30;if(dz<-15)s.z+=30;if(s.y<0)s.y=6+Math.random()*3;PET.pos[k*3]=s.x;PET.pos[k*3+1]=(P.gy||0)+s.y+(night>.6?Math.sin(t*2+s.ph)*.3:0);PET.pos[k*3+2]=s.z}PET.m.geometry.attributes.position.needsUpdate=true}
let paused=Q.has('pause');
function frame(now){const dt=Math.min(.05,(now-clock.last)/1000||0);clock.last=now;if(!paused)step(dt);requestAnimationFrame(frame)}
function step(dt,noRender){clock.t+=dt;const t=clock.t;if(started&&$('finale').hidden)S.time+=dt;
 const mv=started?movePlayer(dt):{v:0,m:0};if(!started){P.gy=P.y=town.footY(P.x,P.z,.2);HERO.root.position.set(P.x,P.y,P.z);HERO.shadow.position.set(P.x,P.y+.04,P.z);HERO.root.rotation.y=P.h;HERO.walk(P.phase,0,t,dt);cam.yaw+=dt*.08}
 ENV.tod+=(ENV.want-ENV.tod)*Math.min(1,dt*.35);applySky();
 CURVE.uCC.value.set(P.x,P.z);updateCam(dt,mv);updateNpcs(dt,t);updateLife(dt,t);town.update(t,dt,P.x,P.z,ENV.night);updateFx(dt,t);music(dt);
 if(eve&&!fest&&Math.hypot(P.x,P.z)<6.5)startFest();
 MT.g.position.set(camera.position.x,0,camera.position.z);sun.target.position.set(P.x,P.y,P.z);sun.position.set(P.x+skyU.sunD.value.x*70,P.y+Math.max(18,skyU.sunD.value.y*70),P.z+skyU.sunD.value.z*70);sky.position.copy(camera.position);stars.position.copy(camera.position);clouds.position.set(camera.position.x,0,camera.position.z);clouds.rotation.y=t*.004;
 if(started)updateHud(dt);if(started&&$('map').classList.contains('on')&&(step.mt=(step.mt||0)+dt)>.25){step.mt=0;drawMap()}
 if((step.st=(step.st||0)+dt)>5){step.st=0;save()}
 if(!noRender)renderer.render(scene,camera)}

/* ═══ 16. 시작 · 이어하기 · 마을로 ═══ */
function spawn(){const d=post.door;P.x=d.x+d.nx*3.4;P.z=d.z+d.nz*3.4;P.gy=null;P.air=0;P.h=Math.atan2(-d.nx,-d.nz);cam.yaw=P.h+Math.PI+.25;cam.cur=cam.dist}
function begin(fresh){au();if(fresh)S={done:[],bag:[],round:0,fest:false,dist:0,time:0};
 // 이어하기: 맡은 물건(주는 사람 배달은 끝났는데 아직 못 준 것)과 받은 가방을 되살린다
 S.bag=S.bag.filter(id=>job(id)&&!S.done.includes(id));JOBS.forEach(j=>{if(j.from){const g=JOBS.find(o=>o.give===j.id);if(g&&S.done.includes(g.id)&&!S.done.includes(j.id)&&!S.bag.includes(j.id))S.bag.push(j.id)}});
 if(S.fest){eve=true;startEve();NPCS.forEach(n=>{if(n.goto){n.x=n.goto.x;n.z=n.goto.z}})}
 ENV.want=S.fest?1:Math.min(.84,S.done.length/TOTAL*.84);ENV.tod=ENV.want;save();renderBag();spawn();started=true;$('intro').hidden=true;document.body.classList.add('play');
 setTimeout(()=>{if(!S.round)say(npcBy(POSTMASTER),'어서 와요, 새 배달부님! 저한테 와서 E(휴대폰은 아래 단추)를 누르면 첫 우편 가방을 줄게요.',6.5);else toast(`<b>✉ 이어서 배달</b>${S.done.length} / ${TOTAL}건 배달했어요`,4)},600)}
function goHome(){save();try{window.parent.postMessage({dpPostman:'close'},'*')}catch(e){}}
$('start').onclick=()=>begin(!S.done.length&&!S.round);$('restart').onclick=()=>{if(confirm('처음부터 다시 배달할까요? 오늘 배달 기록이 지워져요.'))begin(true)};
if(S.done.length||S.round){$('start').textContent=`이어서 배달하기 (${S.done.length}/${TOTAL})`;$('restart').hidden=false}
$('home').hidden=$('home2').hidden=!EMBED;$('home').onclick=goHome;$('home2').onclick=goHome;
$('snd').onclick=()=>setSound(!AU.on);setSound(AU.on);$('mapbtn').onclick=()=>toggleMap();$('map-x').onclick=()=>toggleMap(false);
$('bag-h').onclick=()=>{$('bag').classList.toggle('open');blip()};$('act').onclick=e=>{e.stopPropagation();act()};$('jumpbtn').onclick=()=>jump();
document.querySelectorAll('#emo button').forEach((b,k)=>b.onclick=()=>emote(k));
$('fin-walk').onclick=()=>{$('finale').hidden=true};$('fin-again').onclick=()=>{store(SAVE,JSON.stringify({done:[],bag:[],round:0,fest:false,dist:0,time:0}));location.reload()};
$('fin-home').hidden=!EMBED;$('fin-home').onclick=goHome;
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.fov=TOUCH&&innerWidth<innerHeight?66:58;camera.updateProjectionMatrix()});
if(TOUCH)document.body.classList.add('touch');
spawn();applySky();renderBag();
$('start').disabled=false;
requestAnimationFrame(frame);
window.pmDebug={T,scene,camera,renderer,town,HERO,NPCS,P,cam,keys,get S(){return S},JOBS,ENV,get started(){return started},begin,act,emote,jump,step:(n=1,dt=1/30)=>{for(let k=0;k<n;k++)step(dt,k<n-1)},get camFix(){return camFix},closeTalk,tick:(n=1)=>{for(let k=0;k<n;k++)step(1/30,true)},pause:v=>{paused=v},
 tp(name){const n=npcBy(name);if(!n)return;P.x=n.x+Math.sin(n.ry)*1.1;P.z=n.z+Math.cos(n.ry)*1.1;P.h=n.ry+Math.PI;cam.yaw=P.h+Math.PI+.4;cam.cur=cam.dist},
 deliverAll(){S.done=JOBS.map(j=>j.id);S.bag=[];S.round=4;ENV.want=.84;save();renderBag()},startEve,startFest,setTod(v){ENV.tod=ENV.want=v},toggleMap};
})();
