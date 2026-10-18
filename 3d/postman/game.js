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
 const hh=7+t*14;$('clock').textContent=`${S.day}일째 ${WXI[WX].split(' ')[0]} · ${String(Math.floor(hh)).padStart(2,'0')}:${String(Math.floor(hh%1*60/10)*10).padStart(2,'0')} · ${t<.18?'아침':t<.45?'한낮':t<.7?'오후':t<.9?'노을':'밤'}`}

/* ═══ 3. 주인공 — 마을 주인공 그대로(툰 재질로만 갈아입힘) ═══ */
const HERO=NYC_HERO.make({T,scene,owner:heroOwner,K:.55});
HERO.dress({season:'spring',wet:false,riding:false,gems,wear:VP});HERO.dog.g.visible=false;HERO.bike.g.visible=false;   // 마을 자전거 대신 킥보드(14-1)
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
const ICON={letter:'✉️',parcel:'📦',flower:'💐',poem:'📜',photo:'🖼️',cold:'🧊',fan:'💌',reply:'📨'};
// 하루마다 배달 목록이 바뀐다 — 1일째(맑음) · 2일째(비 · 답장의 날) · 3일째부터는 날마다 새로 뽑는다
// 표시: rush = 빨간 우표 급배달(초) · dry = 젖으면 안 되는 물건 · sender = 답장을 쓴 사람 · from/give = 받은 사람이 다른 사람에게 맡기는 물건
const DAY1=[
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
 {id:11,r:3,to:'티바이러스',k:'cold',item:'차가운 시약 상자',rush:95,thx:'아직 차갑네요, 완벽해요! 손 씻는 거 잊지 마세요~ 🧪'},
 {id:12,r:3,to:'원조익평',k:'letter',item:'주주총회 안내문',thx:'길게 보면 오늘 같은 하루가 쌓여 큰 수익이 되죠. 📈'},
 {id:13,r:4,to:'포롱이',k:'fan',item:'팬레터 한 묶음',thx:'포롱! 이렇게 많이?! 포롱포롱 🎀'},
 {id:14,r:4,to:'클라라',k:'letter',item:'무대 의상 도착 안내',thx:'사뿐~ 이 초대장, 산타우찬이님께도 꼭 전해 줘요! 오늘 밤 광장 등불 축제 초대장이에요.',give:15},
 {id:15,r:4,from:'클라라',to:'산타우찬이',k:'fan',item:'클라라의 축제 초대장',thx:'호호호! 나도 선물 잔뜩 들고 광장으로 갈게요! 🎁'},
 {id:16,r:2,to:'료멘스쿠나',k:'parcel',item:'캠핑용 등불',thx:'크크큭, 숲까지 들고 왔다고? 오늘 밤엔 개울가에서 등불 켜고 별을 봐야겠군.'},
 {id:17,r:3,to:'정원사 할머니',k:'parcel',item:'꽃모종 흙 한 포대',thx:'아이고 무거웠지? 이 흙이면 큰길 화분이 봄까지 활짝 피겠구나. 🌱'},
 {id:18,r:4,to:'언덕집 할아버지',k:'letter',item:'바다 건너 온 손자의 편지',thx:'손자 편지구먼… 고맙네. 계단 오르느라 힘들었지? 여기서 보면 마을이 둥근 땅 너머로 숨는다네. ✉'}];
const DAY2=[
 {id:1,r:1,to:'아울러님',k:'reply',sender:'편안하게님',item:'편안하게님의 답장',dry:1,thx:'어제 꽃다발 답장이네요! "꽃향기 덕분에 도서관이 봄이 됐어요"래요. 🌷 비 오는데 고마워요.'},
 {id:2,r:1,to:'겸손히님',k:'parcel',item:'손님용 우산 열 개',thx:'비 오는 날엔 우산 빌려 가는 손님이 많거든요. ☔ 따뜻한 라테 한 잔 하고 가요!'},
 {id:3,r:1,to:'롱베이케이션님',k:'letter',item:'빗속 특집 원고',dry:1,rush:110,thx:'마감 직전이에요! 이 원고가 젖었으면 큰일 날 뻔했어요. 📰'},
 {id:4,r:1,to:'해의호흡님',k:'reply',sender:'윈터드림',item:'윈터드림의 답장 · 동화 첫 장',dry:1,give:5,thx:'제 시가 동화 첫 줄이 됐대요! 답시를 써 뒀어요. 윈터드림님께 갖다 줄래요?'},
 {id:5,r:1,from:'해의호흡님',to:'윈터드림',k:'reply',sender:'해의호흡님',item:'해의호흡님의 답시',dry:1,thx:'"빗방울도 골목을 따라 편지를 쓴다"… 오늘 밤 동화가 완성될 것 같아요. ❄'},
 {id:6,r:2,to:'굿플렉티스님',k:'parcel',item:'강아지 비옷 한 벌',give:7,thx:'멍멍! 비 오는 날 산책 준비 끝! 어제 사진 고마웠다고 우울라프님께 감사 편지를 써 뒀어요. 🐾'},
 {id:7,r:2,from:'굿플렉티스님',to:'우울라프님',k:'reply',sender:'굿플렉티스님',item:'산책 클럽의 감사 편지',dry:1,thx:'단체 사진 고맙다는 편지네요! 비 그치면 무지개 사진을 찍으러 가야겠어요. 📷'},
 {id:8,r:2,to:'오키오키님',k:'parcel',item:'오래된 고서 한 권',dry:1,thx:'오키오키~ 이 책은 종이가 약해서 젖으면 안 되거든요. 📚'},
 {id:9,r:2,to:'료멘스쿠나',k:'parcel',item:'방수 텐트',thx:'크크큭, 빗소리를 들으며 텐트에서 자는 게 진짜 캠핑이지.'},
 {id:10,r:3,to:'티바이러스',k:'cold',item:'차가운 백신 상자',rush:90,thx:'아직 차가워요, 완벽! 비 오는 날일수록 손을 잘 씻어요~ 🧪'},
 {id:11,r:3,to:'원조익평',k:'letter',item:'해외 배당 통지서',dry:1,thx:'배당은 비가 와도 들어오죠. 길게 보면 우산도 자산이에요. 📈'},
 {id:12,r:3,to:'정원사 할머니',k:'parcel',item:'비 맞고 크는 모종 상자',give:13,thx:'비 오는 날 심어야 뿌리가 잘 내린단다. 이 네잎클로버 화분, 복권방 스피또꿈나무에게 갖다 주렴. 🍀'},
 {id:13,r:3,from:'정원사 할머니',to:'스피또꿈나무',k:'flower',item:'네잎클로버 화분',thx:'네잎클로버!! 이번 주는 진짜 당첨될 것 같아요! 🍀'},
 {id:14,r:4,to:'언덕집 할아버지',k:'letter',item:'항공 우편 봉투와 우표',give:15,thx:'손자에게 답장을 써 뒀다네. 우체국장에게 부쳐 주겠나? 비에 젖지 않게 부탁하네.'},
 {id:15,r:4,from:'언덕집 할아버지',to:'까미유데물랭님',k:'reply',sender:'언덕집 할아버지',item:'바다 건너 손자에게 보낼 답장',dry:1,thx:'할아버지 답장이군요. 오늘 저녁 배에 실어 바다 건너로 보낼게요. ✉'},
 {id:16,r:4,to:'포롱이',k:'reply',sender:'산타우찬이',item:'산타우찬이의 답장 카드',dry:1,thx:'포롱! 우찬이가 답장을 줬어요! 포롱포롱 🎀'},
 {id:17,r:4,to:'클라라',k:'parcel',item:'새 토슈즈',dry:1,rush:100,thx:'사뿐~ 공연 전에 딱 맞춰 왔어요! 젖지 않아서 다행이에요. 🩰'}];
function genJobs(day,wx){const r=PM_TOWN.rng(day*131+7),pick=a=>a[Math.floor(r()*a.length)];
 const who=NPCS.filter(n=>(n.home||n.spot)&&!n.isPost&&!n.bench).map(n=>n.name);const bag=[...who];const take=()=>{if(!bag.length)bag.push(...who);return bag.splice(Math.floor(r()*bag.length),1)[0]};
 const IT={letter:['안부 엽서','동네 소식지','여행 엽서','초대장','도서관 연체 안내'],parcel:['과일 상자','털실 한 꾸러미','새 머그잔','찻잎 한 통','손뜨개 목도리','작은 액자','화분 흙'],flower:['튤립 다발','장미 한 송이'],cold:['아이스크림 상자','차가운 우유 한 병'],photo:['가족사진'],poem:['짧은 시 한 편'],fan:['응원 편지']};
 const TH=['고마워요, 배달부님!','딱 기다리던 거예요!','와, 벌써 왔어요?','오늘도 수고 많아요!','덕분에 하루가 반짝여요!'],wet=wx==='rain';
 const out=[];let id=1;const per=[4,3,4,3];let rush=2,chain=2;
 per.forEach((n,ri)=>{for(let k=0;k<n;k++){const to=take(),kind=pick(['letter','letter','parcel','parcel','parcel','flower','cold','photo','poem','fan']),item=pick(IT[kind]),o=npcBy(to);
  const j={id:id++,r:ri+1,to,k:kind,item,thx:`${item}! ${pick(TH)} ${o&&o.lines?pick(o.lines):''}`};
  if(wet&&['letter','photo','poem','fan'].includes(kind))j.dry=1;if(rush>0&&(kind==='cold'||(ri>0&&r()<.25))){j.rush=kind==='cold'?85:100;rush--}
  if(chain>0&&ri<3&&r()<.4){const to2=who.filter(n=>n!==to)[Math.floor(r()*(who.length-1))];j.give=id;j.thx+=` 아, ${to2}에게 답장 좀 전해 줄래요?`;out.push(j);
   out.push({id:id++,r:ri+1,from:to,to:to2,k:'reply',sender:to,item:`${to}의 답장`,dry:wet?1:0,thx:`${to}에게서 답장이 왔네요! 잘 받았어요. 고마워요 배달부님.`});chain--;continue}
  out.push(j)}});return out}
const valid=j=>!!npcBy(j.to)&&(!j.from||!!npcBy(j.from));
function jobsFor(day){const list=day===1?DAY1:day===2?DAY2:genJobs(day,wxFor(day));const ok=list.filter(valid);return ok.filter(j=>!j.from||ok.some(o=>o.give===j.id))}
function wxFor(day){const q=Q.get('wx');if(q==='rain'||q==='snow'||q==='clear')return q;return day===1?'clear':day===2?'rain':day===3?'snow':['clear','rain','clear','snow','clear','clear','rain'][day%7]}
const WXI={clear:'☀️ 맑음',rain:'☔ 비',snow:'❄️ 눈'};
const SAVE='asset-postman-v1';
const blank=(day=1,keep={})=>Object.assign({day,done:[],bag:[],round:0,fest:false,dist:0,time:0,stars:[],wet:{},rush:{},bike:false,starsAll:0},keep);
let S=(()=>{try{return Object.assign(blank(),JSON.parse(store(SAVE)||'{}'))}catch(e){return blank()}})();
let JOBS=jobsFor(S.day),TOTAL=JOBS.length,WX=wxFor(S.day);const job=id=>JOBS.find(j=>j.id===id);
function save(){store(SAVE,JSON.stringify(S));store('asset-village-3d-postman',JSON.stringify({done:S.done.length,total:TOTAL,cleared:!!S.fest||S.day>1,day:S.day,at:Date.now()}))}
// 예전 저장(바깥 배달이 없던 때)으로 이미 지난 차례의 새 배달은 가방에 넣어 준다
JOBS.forEach(j=>{if(j.r<=S.round&&!j.from&&!S.done.includes(j.id)&&!S.bag.includes(j.id))S.bag.push(j.id)});
const whereOf=o=>o.spot?o.spot.label:`${town.district(o.home.door.x,o.home.door.z)} 쪽, ${o.home.wallName} 벽에 ${o.home.door.col[1]} 문 '${o.shop}' 간판 집`;
function hintFor(name){const n=npcBy(name);if(n&&n.isPost)return '📮 골목 우체국';if(n&&n.spot)return n.spot.label;if(!n||!n.home)return '';const h=n.home;return `${town.district(h.door.x,h.door.z)} · ${h.wallName} 벽 ${h.door.col[1]} 문 · '${n.shop}' 간판`}
const roundDone=r=>JOBS.filter(j=>j.r<=r).every(j=>S.done.includes(j.id));
function canIssue(){return S.round<4&&roundDone(S.round)}

/* ═══ 6. 고양이 · 비둘기 · 꽃잎 ═══ */
// 골목 고양이 12마리 — 간식을 주면 도감에 남는다(날이 바뀌어도 그대로). 다 모으면 축제 때 광장 분수에 모인다
const CATDEF=[['치즈','#f1c48f','#f1c48f',null],['까망이','#2f2b34','#2f2b34',null],['구름이','#f6f1e6','#f6f1e6',null],['먹구름','#a8a8b0','#a8a8b0',null],['호박이','#e3a25a','#e3a25a',null],['삼색이','#f6f1e6','#e3a25a','#2f2b34'],
 ['턱시도','#2f2b34','#2f2b34','#f6f1e6'],['고등어','#9a9488','#9a9488','#5d574f'],['보리','#d9b88f','#d9b88f',null],['콩떡이','#f6f1e6','#f6f1e6','#3b3346'],['모카','#8a6448','#8a6448',null],['별이','#f4ecd8','#5d4a3c','#5d4a3c']];
const CATKEY='asset-postman-cats';let catFed=(()=>{try{return JSON.parse(store(CATKEY)||'[]')}catch(e){return []}})();
const catSpots=(()=>{const by={};town.cats.forEach(c=>{const k=town.districtKey(c.x,c.z);(by[k]=by[k]||[]).push(c)});const keys=Object.keys(by),out=[];for(let r=0;out.length<10&&r<20;r++)for(const k of keys){const c=by[k][r];if(c&&out.length<10)out.push({x:c.x,z:c.z,ry:c.ry})}
 if(OUT){const sh=OUT.spots.shop,fo=OUT.spots.forest;if(sh)out.push({x:sh.x+2.6,z:sh.z-.4,ry:sh.ry+.6,label:'큰길 상가 꽃삽 화원 옆'});if(fo)out.push({x:fo.x+3.6*Math.cos(fo.ry)+1.2*Math.sin(fo.ry),z:fo.z-3.6*Math.sin(fo.ry)+1.2*Math.cos(fo.ry),ry:fo.ry-1,label:'숲속 개울 다리 건너편'})}return out.slice(0,12)})();
const CATS=catSpots.map((c,k)=>{const [name,body,head,patch]=CATDEF[k],g=new T.Group(),root=new T.Group();g.add(root);const mk=(geo,x,y,z,sx=1,sy=1,sz=1,cc=body)=>{const m=new T.Mesh(geo,toon(cc));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;root.add(m);return m};
 mk(new T.SphereGeometry(.2,14,10),0,.2,0,1,1.05,1.25);const hd=mk(new T.SphereGeometry(.16,14,10),0,.45,.12,1,1,1,head);for(const s2 of [-1,1]){const e=mk(new T.ConeGeometry(.06,.12,4),s2*.08,.6,.12,1,1,1,head==='#5d4a3c'||!patch?head:head);e.rotation.z=-s2*.3}
 if(patch){mk(new T.SphereGeometry(.12,10,8),.09,.27,-.08,1,.8,1.2,patch);if(k===6||k===9)mk(new T.SphereGeometry(.1,10,8),0,.3,.2,1,1,.7,patch)}
 for(const s2 of [-1,1]){const e=mk(new T.SphereGeometry(.025,6,5),s2*.06,.47,.27,1,1,1,'#2e2a2a');e.userData.noOutline=true}
 const tail=new T.Group();tail.position.set(0,.12,-.22);root.add(tail);const tm=new T.Mesh(new T.CapsuleGeometry(.035,.32,4,6),toon(patch&&k===7?patch:body));tm.position.y=.17;tm.rotation.x=-.4;tail.add(tm);outline(g,60);
 const y=town.footY(c.x,c.z,.1);g.position.set(c.x,y,c.z);g.rotation.y=c.ry;scene.add(g);const col={x:c.x,z:c.z,r:.3};town.colliders.push(col);
 return {g,root,tail,hd,ph:k*1.7,x:c.x,z:c.z,y,hx:c.x,hz:c.z,hry:c.ry,t:0,hop:0,name,body,head,patch,label:c.label||null,col,k}});
const catWhere=c=>c.label||town.district(c.hx,c.hz);
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
 if(/^Digit[1-5]$/.test(e.code))emote(+e.code.slice(5)-1);if(e.code==='KeyB')toggleBike();if(e.code==='KeyC')toggleCats();if(e.code==='Escape'){if($('catbook').classList.contains('on'))toggleCats(false);else if($('map').classList.contains('on'))toggleMap(false);else if(!$('finale').hidden)$('fin-walk').click();else if(EMBED)goHome()}});
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
function resolve(px,pz,r,y=-1e9){let x=px,z=pz;for(let it=0;it<3;it++){const i0=ci(x),j0=ci(z);for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const i=i0+di,j=j0+dj;if(!blocked(i,j))continue;const x0=cx(i)-CS/2,x1=x0+CS,z0=cx(j)-CS/2,z1=z0+CS,qx=clamp(x,x0,x1),qz=clamp(z,z0,z1);let dx=x-qx,dz=z-qz,d=Math.hypot(dx,dz);
   if(d<r){if(d<1e-6){const opts=[[x-x0,-1,0],[x1-x,1,0],[z-z0,0,-1],[z1-z,0,1]].sort((a,b)=>a[0]-b[0])[0];x+=opts[1]*(opts[0]+r);z+=opts[2]*(opts[0]+r)}else{x+=dx/d*(r-d);z+=dz/d*(r-d)}}}
  for(const c of town.colliders){if(c.deck||c.top!==undefined&&y>=c.top-(c.step?.3:.06)||c.bot!==undefined&&y<c.bot)continue;
   // 육교 계단 디딤판: 오르는 방향으로는 발끝만큼(0.12)만 막아 한 칸씩 올라서고, 옆으로는 몸 반지름만큼 막는다
   if(c.step){const [x0,z0,x1,z1]=c.box,ex=c.ax==='x'?.12:r,ez=c.ax==='z'?.12:r;if(x>x0-ex&&x<x1+ex&&z>z0-ez&&z<z1+ez){const a=x-(x0-ex),b=x1+ex-x,cc=z-(z0-ez),d=z1+ez-z,m=Math.min(a,b,cc,d);if(m===a)x-=a;else if(m===b)x+=b;else if(m===cc)z-=cc;else z+=d}continue}
   if(c.box){const [x0,z0,x1,z1]=c.box;if(x<x0-r||x>x1+r||z<z0-r||z>z1+r)continue;const qx=clamp(x,x0,x1),qz=clamp(z,z0,z1);let dx=x-qx,dz=z-qz,d=Math.hypot(dx,dz);if(d<r){if(d<1e-6){const o=[[x-x0,-1,0],[x1-x,1,0],[z-z0,0,-1],[z1-z,0,1]].sort((p,q)=>p[0]-q[0])[0];x+=o[1]*(o[0]+r);z+=o[2]*(o[0]+r)}else{x+=dx/d*(r-d);z+=dz/d*(r-d)}}continue}if(!c.r)continue;const dx=x-c.x,dz=z-c.z,d=Math.hypot(dx,dz),rr=c.r+r;if(d<rr&&d>1e-6){x+=dx/d*(rr-d);z+=dz/d*(rr-d)}}
  for(const n of NPCS){if(n.inside)continue;const dx=x-n.x,dz=z-n.z,d=Math.hypot(dx,dz),rr=.36+r;if(d<rr&&d>1e-6){x+=dx/d*(rr-d);z+=dz/d*(rr-d)}}
  [x,z]=town.walkFix(x,z,r)}return [x,z]}
const PR=.42;   // 주인공 몸 반지름(팔 · 가방까지) — 벽에 겹쳐 보이지 않게
// 담 · 나무 상자 위에 설 수 있다(높이 top). 지금 높이에서 한 뼘 안쪽이면 올라선다
function platTop(x,z,y){let top=-1e9;for(const c of town.colliders){if(c.top===undefined||c.bot!==undefined&&!c.deck)continue;const [x0,z0,x1,z1]=c.box;if(x<x0-.08||x>x1+.08||z<z0-.08||z>z1+.08)continue;if(c.top<=y+(c.step||c.deck?.3:.14)&&c.top>top)top=c.top}return top}
// 골목 육교의 계단 디딤판 · 다리 바닥 높이(지금 높이에서 한 칸 안쪽이면 그 면을 밟는다)
const OVC=town.colliders.filter(c=>c.ov&&(c.step||c.deck));
function ovTop(x,z,y){let top=-1e9;for(const c of OVC){const [x0,z0,x1,z1]=c.box;if(x<x0||x>x1||z<z0||z>z1)continue;if(c.top<=y+.3&&c.top>top)top=c.top}return top}
function jump(){if(P.onGround&&!talkLock()){P.vy=riding?3.4:4.6;P.onGround=false;if(!riding)HERO.jump();tone(520,0,.12,'sine',.03);tone(780,.05,.12,'sine',.025)}}
let lastStep=0;
function movePlayer(dt){let ix=0,iz=0;if(keys.KeyW||keys.ArrowUp)iz+=1;if(keys.KeyS||keys.ArrowDown)iz-=1;if(keys.KeyA||keys.ArrowLeft)ix-=1;if(keys.KeyD||keys.ArrowRight)ix+=1;
 if(joy.on){ix+=joy.x;iz-=joy.y}let m=Math.hypot(ix,iz);if(m>1){ix/=m;iz/=m;m=1}if(talkLock()){ix=iz=0;m=0}
 const fx=-Math.sin(cam.yaw),fz=-Math.cos(cam.yaw),rx=Math.cos(cam.yaw),rz=-Math.sin(cam.yaw);
 const run=keys.ShiftLeft||keys.ShiftRight||(joy.on&&m>.92);let sp=run?5.6:3.1,acc=m>.05?9:12;
 let dx=fx*iz+rx*ix,dz=fz*iz+rz*ix;
 if(riding){// 앞쪽 비탈: 가파르면(계단) 내려서 끌고, 내리막이면 빨라지고 오르막이면 느려진다
  const L=Math.hypot(dx,dz)||1,ux=m>.05?dx/L:Math.sin(P.h),uz=m>.05?dz/L:Math.cos(P.h),GY=(x,z)=>Math.max(town.groundY(x,z),ovTop(x,z,P.y+.35)),g0=GY(P.x,P.z),grade=(GY(P.x+ux*1.2,P.z+uz*1.2)-g0)/1.2,back=(g0-GY(P.x-ux,P.z-uz));
  pushing=Math.abs(grade)>.34||Math.abs(back)>.34;if(pushing){sp=2.5;acc=8}else{sp=(run?8.8:6.6)*clamp(1-grade*2.6,.5,1.8);kickSp=sp;acc=m>.05?(WX==='snow'?1.8:3.2):(WX==='snow'?1.2:2.6)}}
 const tvx=dx*sp,tvz=dz*sp;
 P.vx+=(tvx-P.vx)*Math.min(1,dt*acc);P.vz+=(tvz-P.vz)*Math.min(1,dt*acc);const v=Math.hypot(P.vx,P.vz);
 const n=Math.max(1,Math.ceil(v*dt/.12));let ox=P.x,oz=P.z;for(let k=0;k<n;k++){const [x,z]=resolve(P.x+P.vx*dt/n,P.z+P.vz*dt/n,PR,P.y);P.x=x;P.z=z}
 const moved=Math.hypot(P.x-ox,P.z-oz);S.dist+=moved;
 let turn=0;if(v>.25){const th=Math.atan2(P.vx,P.vz);turn=wrapA(th-P.h);P.h+=turn*Math.min(1,dt*(riding&&!pushing?5:10))}
 {const fy=town.footY(P.x,P.z,.2),gy=Math.max(fy,platTop(P.x,P.z,P.y));
  if(P.gy===null)P.gy=gy;else if(gy<P.gy-.3){P.air+=P.gy-gy;P.gy=gy;if(P.air>.05)P.onGround=false}else if(gy>P.gy+.25&&P.air>0){P.air=Math.max(0,P.air-(gy-P.gy));P.gy=gy}else P.gy=Math.max(gy-.04,P.gy+(gy-P.gy)*Math.min(1,dt*18));
  P.vy-=13*dt;P.air+=P.vy*dt;if(P.air<=0){P.air=0;P.vy=0;P.onGround=true}P.y=P.gy+P.air}
 const amt=clamp(moved/dt/3.1,0,1.4);P.walk+=(Math.min(1,amt)-P.walk)*Math.min(1,dt*8);P.phase+=dt*(5+amt*4.2)*P.walk;
 if(!riding||pushing){if(P.onGround&&P.walk>.3){const s2=Math.floor(P.phase/Math.PI);if(s2!==lastStep){lastStep=s2;stepSnd()}}}
 // 비: 달리면 우산이 기울어 젖고, 킥보드는 두 손으로 잡느라 우산이 없어 더 젖는다
 if(WX==='rain'&&moved/dt>.5)wetten(dt*(riding?6:run?4.5:0));
 if(riding){const b=KICK,sa=Math.sin(P.h),ca=Math.cos(P.h),dd=moved;b.wheels.forEach(w=>{w.rotation.x+=dd/.065});
  if(pushing){lean+=(0-lean)*Math.min(1,dt*6);b.g.position.set(P.x+ca*.38,P.y,P.z-sa*.38);b.g.rotation.set(0,P.h,0);HERO.root.position.set(P.x,P.y+.02,P.z);HERO.root.rotation.set(0,P.h,0);HERO.walk(P.phase,P.walk,clock.t,dt)}
  else{lean+=(clamp(-turn*Math.min(1,v/5)*.9,-.28,.28)-lean)*Math.min(1,dt*5);
   // 발로 차기: 입력이 있고 아직 목표 속도보다 느리면(오르막 포함) 뒷발이 땅을 찬다. 빠르면 두 발 모두 발판 위
   const kicking=m>.05&&v<kickSp*.9&&P.onGround;if(kicking||Math.sin(b.kick)>.05){const was=Math.sin(b.kick);b.kick+=dt*7.5;if(was<.9&&Math.sin(b.kick)>=.9)stepSnd()}else b.kick=0;
   b.g.position.set(P.x,P.y,P.z);b.g.rotation.set(0,P.h,lean);HERO.root.position.set(P.x-sa*.06,P.y+.13,P.z-ca*.06);HERO.root.rotation.set(0,P.h,lean);scootPose(b.kick,clock.t,dt)}}
 else{HERO.root.position.set(P.x,P.y+.02,P.z);HERO.root.rotation.set(0,P.h,0);HERO.walk(P.phase,P.walk,clock.t,dt)}
 if(!riding||pushing)stepFeet(dt);fitUmbrella(dt);
 HERO.shadow.position.set(P.x,P.gy+.04,P.z);HERO.shadow.scale.setScalar((riding&&!pushing?1.5:1)-Math.min(.5,P.air*.3));
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
 camFix.k+=((talk.npc?1:0)-camFix.k)*Math.min(1,dt*2.5);const bd=cam.dist*(riding&&!pushing?1.18:1),want=bd+(Math.min(bd,3.4)-bd)*camFix.k,pitch=cam.pitch+.12*camFix.k;
 {const w=want*(1+camFix.tlift*.25),blocked=reach(cam.yaw+camFix.toff,pitch+camFix.tlift,w)<w*.7;if(t-camFix.t>.45||(blocked&&t-camFix.t>.06)){camFix.t=t;[camFix.toff,camFix.tlift]=pickFix(cam.yaw,pitch,want,!drag,mv.m>.1&&!drag?Math.max(-.8,Math.min(.8,wrapA(P.h+Math.PI-cam.yaw))):0)}}
 camFix.off+=(camFix.toff-camFix.off)*Math.min(1,dt*2.2);camFix.lift+=(camFix.tlift-camFix.lift)*Math.min(1,dt*(camFix.tlift>camFix.lift?6:1.3));
 const yawF=cam.yaw+camFix.off,pF=Math.min(1.38,pitch+camFix.lift),wantF=want*(1+camFix.lift*.25),cp=Math.cos(pF);_d.set(Math.sin(yawF)*cp,Math.sin(pF),Math.cos(yawF)*cp);
 const d=reach(yawF,pF,wantF);cam.cur=d<cam.cur-.01&&d<wantF-.05?Math.max(d,cam.cur-dt*(d<cam.cur*.75?16:10)):cam.cur+(d-cam.cur)*Math.min(1,dt*2.2);
 camera.position.copy(_t).addScaledVector(_d,cam.cur);camera.lookAt(_t.x,_t.y+.45-camFix.lift*.25,_t.z);
 HERO.root.visible=cam.cur>.8}

/* ═══ 10. 이야기 · 배달 ═══ */
const talk={npc:null,t:0,text:''};const talkLock=()=>!!talk.npc&&talk.lock;
function nearestNpc(r=2.3){let best=null,bd=r;for(const n of NPCS){const d=Math.hypot(n.x-P.x,n.z-P.z);if(d<bd){bd=d;best=n}}return best}
function pending(n){if(S.bag.some(id=>job(id).to===n.name))return true;if(n.isPost)return !S.fest&&!eve&&(canIssue()||S.done.length>=TOTAL);return false}
function say(n,text,sec=4.6,lock=false){talk.npc=n;talk.text=text;talk.t=sec;talk.lock=lock;const b=$('bubble');b.querySelector('.bb-who').textContent=(FACE[n.face]||'')+' '+n.name;b.querySelector('.bb-txt').textContent=text;b.hidden=false;b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop');blip()}
function nearestCat(r=1.8){let best=null,bd=r;for(const c of CATS){const d=Math.hypot(c.x-P.x,c.z-P.z);if(d<bd){bd=d;best=c}}return best}
function act(){au();if(!started||!$('finale').hidden||SC)return;const n=nearestNpc();if(!n){const c=nearestCat();if(c)return feedCat(c);if(talk.npc)closeTalk();return}
 if(!n.inside)n.wave=1.4;
 const mine=S.bag.filter(id=>job(id).to===n.name);
 if(mine.length)return deliver(n,job(mine[0]));
 if(n.isPost)return postTalk(n);
 // 할 일이 없으면 수다 — 가방 속 받는 사람이 사는 골목을 귀띔해 준다
 const others=S.bag.map(job).filter(j=>j.to!==n.name);
 if(others.length&&Math.random()<.65){const j=others[Math.floor(Math.random()*others.length)];const o=npcBy(j.to);say(n,o.isPost?`${j.to}은 골목 우체국에 계세요!`:o.spot?`${j.to}? 마을 밖이에요. ${o.spot.label}!`:`${j.to}? ${town.district(o.home.door.x,o.home.door.z)} 쪽에 살아요. ${o.home.door.col[1]} 문에 '${o.shop}' 간판이 걸린 집이요!`,6);return}
 say(n,(n.inside?(WX==='rain'?'(문틈으로) 비가 와서 집에 있어요. ':WX==='snow'?'(문틈으로) 추워서 집에 있어요. ':'(문틈으로) '):'')+n.lines[Math.floor(Math.random()*n.lines.length)],4.5)}
// 건네기: 급배달은 시간 안 · 젖으면 안 되는 물건은 뽀송하게 → ⭐ 칭찬 도장
function deliver(n,j){S.bag=S.bag.filter(id=>id!==j.id);S.done.push(j.id);
 const late=j.rush&&!((S.rush[j.id]||0)>0),soaked=j.dry&&WX==='rain'&&(S.wet[j.id]||0)>=100,star=!late&&!soaked;if(star)S.stars.push(j.id);
 const pre=late?'조금 늦었지만 괜찮아요. ':j.rush?'딱 맞춰 왔네요! ⏱ ':soaked?'앗, 조금 젖었네요… 그래도 고마워요. ':j.dry&&WX==='rain'?'비 오는데 하나도 안 젖었어요! ':'';
 if(!n.inside)n.hop=.6;HERO.wave();say(n,pre+j.thx,6);handOver(n,j);setTimeout(()=>{stampFx(j,star);jingle();burst(n.x,1.6+n.y,n.z)},n.inside?1250:850);
 if(j.give){S.bag.push(j.give);const g=job(j.give);if(g.rush)S.rush[g.id]=g.rush;setTimeout(()=>{toast(`<b>${ICON[g.k]} ${g.item}</b>${g.to}에게 전해 주세요`,4.5);tone(660,0,.2);tone(990,.12,.3)},1600)}
 ENV.want=Math.min(.84,S.done.length/TOTAL*.84);save();renderBag();
 if(S.done.length>=TOTAL)setTimeout(()=>toast(`<b>📮 오늘 배달 끝!</b>골목 우체국 ${POSTMASTER}에게 돌아가요`,6),3200);
 else if(S.bag.length===0&&canIssue())setTimeout(()=>toast('<b>📮 가방이 비었어요</b>골목 우체국에 가서 다음 배달을 받아요',5),3200)}
function feedCat(c){const first=!catFed.includes(c.k);c.hop=.7;c.t=2;setTimeout(meow,150);heroEmo('🐟');setTimeout(()=>npcEmo(c,first?'💕':'😺'),500);
 if(first){catFed.push(c.k);store(CATKEY,JSON.stringify(catFed));renderCats();tone(880,0,.15,'sine',.04);tone(1320,.12,.25,'sine',.04);
  toast(`<b>🐱 ${c.name}</b>간식을 맛있게 먹었어요! 고양이 도감 ${catFed.length} / ${CATS.length}`+(catFed.length>=CATS.length?'<br>다 모았어요! 축제 날 고양이들도 광장에 와요':''),4);if(fest&&catFed.length>=CATS.length)catsToPlaza()}
 else toast(`<b>🐱 ${c.name}</b>골골골… 기분이 좋대요`,2.2)}
const POSTMSG={1:{1:'좋은 아침이에요, 배달부님! 첫 가방이에요. 받는 사람 집은 편지에 적힌 골목 · 벽 색 · 간판을 보고 찾아요. 지도(M)도 있어요! 아, 우체국 앞 빨간 킥보드도 빌려 가요!',2:'벌써 다 했어요? 점심 가방이에요. 받은 사람이 다른 사람에게 물건을 맡길지도 몰라요.',3:'오후 가방이에요. 빨간 우표가 붙은 건 급배달! 블록담 앞 나무 상자를 밟고 뛰면 담을 넘는 지름길이 있어요.',4:'마지막 가방! 노을 지기 전에 끝내 봐요.'},
 2:{1:'비 오는 아침이에요! 오늘은 어제 받은 사람들이 쓴 답장이 많아요. 📨 젖으면 안 되는 건 우산 쓰고 천천히, 웅덩이는 피해서! 킥보드는 빠르지만 두 손으로 잡느라 우산을 못 써요.',2:'오늘은 동네 사람들이 비를 피해 집 안에 있어요. 문 앞에서 E를 누르면 문을 열고 받아 갈 거예요.',3:'오후 가방이에요. 빨간 우표는 급배달, 시간 안에!',4:'마지막 가방이에요. 언덕집 할아버지 답장은 저한테 다시 가져와 줘요!'}};
function postMsg(r){const m=POSTMSG[S.day];if(m)return m[r];const w=WX==='rain'?'비가 오니 젖으면 안 되는 물건 조심! ':WX==='snow'?'눈길이 미끄러워요, 킥보드는 천천히! ':'날씨가 좋아요! ';return {1:`${S.day}일째 아침이에요. ${w}오늘 첫 가방이에요.`,2:'점심 가방이에요. 답장을 맡기는 사람도 있을 거예요. 📨',3:'오후 가방! 빨간 우표가 붙은 급배달이 있는지 봐요.',4:'마지막 가방이에요. 오늘 밤도 광장에서 등불 축제!'}[r]}
function postTalk(n){if(S.done.length>=TOTAL&&!S.fest){say(n,'오늘 배달 끝! 정말 수고 많았어요. 해가 지면 종탑 광장에서 등불 축제가 열려요. 광장 분수로 와요! 🏮',7);startEve();return}
 if(S.fest){say(n,'오늘 같은 날이 또 오면 좋겠어요. 내일도 골목을 부탁해요!',5);return}
 if(canIssue()){S.round++;const list=JOBS.filter(j=>j.r===S.round&&!j.from&&!S.done.includes(j.id)&&!S.bag.includes(j.id));S.bag.push(...list.map(j=>j.id));list.forEach(j=>{if(j.rush)S.rush[j.id]=j.rush});
  const newBike=!S.bike;S.bike=true;parkBike();save();renderBag();say(n,postMsg(S.round),7);HERO.wave();tone(523,0,.2);tone(659,.1,.2);tone(784,.2,.3);
  if(newBike)setTimeout(()=>toast(`<b>🛴 빨간 킥보드를 빌렸어요</b>${TOUCH?'🛴 단추':'B 키'}로 타고 내려요 · 발로 차서 달리고, 계단에선 끌고 가요`,5),2400);
  else if(list.some(j=>j.rush))setTimeout(()=>toast('<b>🟥 급배달</b>빨간 우표 물건은 시간 안에! 나무 상자 밟고 담 넘기 지름길',4.5),2400);return}
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
function stampFx(j,star){const s=$('stamp');s.querySelector('.st-ic').textContent=ICON[j.k];s.querySelector('.st-to').textContent=j.to;s.querySelector('.st-n').textContent=`${S.done.length} / ${TOTAL}`+(star?' · ⭐ 칭찬 도장':'');s.classList.remove('go');void s.offsetWidth;s.classList.add('go')}
let selJob=null;
const fmtT=t=>`${Math.floor(Math.max(0,t)/60)}:${String(Math.floor(Math.max(0,t)%60)).padStart(2,'0')}`;
function renderBag(){$('count').textContent=`${S.done.length} / ${TOTAL}`;$('tally-h').textContent=`${S.day}일째 배달`;$('count-bar').style.width=(S.done.length/TOTAL*100)+'%';
 const el=$('bag-list');el.innerHTML='';
 if(!S.bag.length){const li=document.createElement('li');li.className='empty';li.innerHTML=S.fest?'🏮 오늘 하루 끝 · 골목을 마음껏 걸어요':S.done.length>=TOTAL?'📮 우체국에 들러 인사해요':canIssue()?'📮 골목 우체국에서 가방을 받아요':'…';el.appendChild(li)}
 S.bag.forEach(id=>{const j=job(id),li=document.createElement('li');li.className='card'+(selJob===id?' sel':'')+(j.rush?' rush':'');
  const tags=(j.rush?`<i class="tg r">🟥 ${(S.rush[id]||0)>0?fmtT(S.rush[id]):'늦었어요'}</i>`:'')+(j.dry&&WX==='rain'?`<i class="tg w">💧 ${Math.round(S.wet[id]||0)}%</i>`:j.dry?'<i class="tg w">젖으면 안 돼요</i>':'')+(j.k==='reply'?'<i class="tg p">답장</i>':'');
  li.innerHTML=`<span class="cd-ic">${ICON[j.k]}</span><span class="cd-b"><b>${j.to}${tags}</b><small>${j.item}${j.from?` · ${j.from}이 맡김`:''}</small><em>${hintFor(j.to)}</em></span>`;li.onclick=()=>{selJob=selJob===id?null:id;renderBag();blip()};el.appendChild(li)});
 $('bag').classList.toggle('has',S.bag.length>0);$('bag-n').textContent=S.bag.length?S.bag.length+'개':''}
const _sv=new T.Vector3();
function project(x,y,z){const dx=x-P.x,dz=z-P.z;_sv.set(x,y-(dx*dx+dz*dz)*CURVE.uCurve.value,z).project(camera);return {x:(_sv.x+1)/2*innerWidth,y:(1-_sv.y)/2*innerHeight,ok:_sv.z<1&&_sv.z>-1}}
function updateHud(dt){const near=nearestNpc();const a=$('act');
 const cat=near?null:nearestCat();
 if(near&&$('finale').hidden&&!SC){let txt=near.inside?'🚪 문 두드리기':'💬 말 걸기';const j=S.bag.map(job).find(j=>j.to===near.name);if(j)txt=`${ICON[j.k]} ${j.item} 건네기`;else if(near.isPost)txt=pending(near)?(S.done.length>=TOTAL?'📮 배달 끝 알리기':'📮 우편 가방 받기'):'📮 우체국장과 이야기';
  a.innerHTML=`<kbd>${TOUCH?'탭':'E'}</kbd>${txt}`;a.hidden=false;a.classList.toggle('hot',pending(near))}
 else if(cat&&$('finale').hidden&&!SC){a.innerHTML=`<kbd>${TOUCH?'탭':'E'}</kbd>🐟 ${cat.name}${catFed.includes(cat.k)?' 쓰다듬기':'에게 간식 주기'}`;a.hidden=false;a.classList.toggle('hot',!catFed.includes(cat.k))}else a.hidden=true;
 {const rj=S.bag.map(job).filter(j=>j.rush&&(S.rush[j.id]||0)>0).sort((x,y)=>S.rush[x.id]-S.rush[y.id])[0],el=$('rush');if(rj){el.hidden=false;el.innerHTML=`🟥 급배달 · ${rj.to} <b>${fmtT(S.rush[rj.id])}</b>`;el.classList.toggle('hurry',S.rush[rj.id]<20)}else el.hidden=true}
 const tg=$('tag');if(near&&!talk.npc){const p=project(near.x,near.y+2.3,near.z);if(p.ok){tg.hidden=false;tg.textContent=near.name+(near.inside?' · 집 안에 있어요':near.role?' · '+near.role:'');tg.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-100%)`}else tg.hidden=true}else tg.hidden=true;
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
 for(const c of town.crates){const [x,y]=tp(c.x,c.z);mctx.fillStyle='#b07a45';mctx.fillRect(x-3,y-3,6,6)}
 {const O=town.overpass;if(O){const [x0,z0]=tp(...O.W(O.u0-O.DL-O.SL,O.vc-O.HW2)),[x1,z1]=tp(...O.W(O.u0+O.DL+O.SL,O.vc+O.HW2)),[d0,e0]=tp(...O.W(O.u0-O.DL,O.vc-O.HW2-.3)),[d1,e1]=tp(...O.W(O.u0+O.DL,O.vc+O.HW2+.3));mctx.fillStyle='#86c4ae';mctx.fillRect(Math.min(x0,x1),Math.min(z0,z1),Math.abs(x1-x0),Math.abs(z1-z0));mctx.fillStyle='#5f9f8a';mctx.fillRect(Math.min(d0,d1),Math.min(e0,e1),Math.abs(d1-d0),Math.abs(e1-e0))}}
 mctx.fillStyle='#79c3d6';{const [x,y]=tp(0,0);mctx.beginPath();mctx.arc(x,y,Math.max(3,s*.9),0,7);mctx.fill()}
 mctx.textAlign='center';mctx.textBaseline='middle';mctx.font='700 13px Jua,"Apple SD Gothic Neo",sans-serif';
 for(const [t,x,z] of [['빨래줄 골목',0,-30],['등불 골목',30,0],['고양이 골목',0,30],['화분 골목',-30,0],...(MAPD?MAPD.labels:[])]){const [a,b]=tp(x,z);mctx.lineWidth=4;mctx.strokeStyle='rgba(255,250,240,.9)';mctx.strokeText(t,a,b);mctx.fillStyle='#5a4636';mctx.fillText(t,a,b)}
 const pin=(x,z,ic,sel)=>{const [a,b]=tp(x,z);mctx.font=(sel?'26px':'19px')+' sans-serif';mctx.fillText(ic,a,b-6)};
 {const d=post.door;pin(d.x,d.z,'📮')}
 S.bag.forEach(id=>{const j=job(id),n=npcBy(j.to);if(n&&n.isPost)pin(post.door.x+3,post.door.z,ICON[j.k],selJob===id);else if(n&&n.home)pin(n.home.door.x,n.home.door.z,ICON[j.k],selJob===id);else if(n&&n.spot)pin(n.spot.x,n.spot.z,ICON[j.k],selJob===id)});
 const [hx,hy]=tp(P.x,P.z);mctx.save();mctx.translate(hx,hy);mctx.rotate(-P.h+Math.PI);mctx.fillStyle='#e0483e';mctx.strokeStyle='#fff';mctx.lineWidth=2;mctx.beginPath();mctx.moveTo(0,-9);mctx.lineTo(7,7);mctx.lineTo(0,3);mctx.lineTo(-7,7);mctx.closePath();mctx.fill();mctx.stroke();mctx.restore()}

/* ═══ 14. 축제 — 밤 · 동네 사람들이 광장 분수에 모인다 · 등불이 하늘로 · 불꽃 ═══ */
let eve=false,fest=null;
function startEve(){if(eve)return;eve=true;ENV.want=1;NPCS.forEach(n=>{if(n.inside){n.inside=false;n.body.visible=true;n.marker.position.y=2.05}});toast('<b>🏮 등불 축제</b>해가 졌어요. 종탑 광장 분수로 가요!',6);
 const ring=NPCS.filter(n=>!n.bench);ring.forEach((n,k)=>{const a=4.5+k/ring.length*(Math.PI*2-1.3),r=3.1+(k%2)*.75;n.goto={x:Math.cos(a)*r,z:Math.sin(a)*r}})}
const LANT=(()=>{const n=46,m=new T.InstancedMesh(new T.CylinderGeometry(.22,.17,.42,8),curve(new T.MeshBasicMaterial({color:'#ffb766'})),n);m.frustumCulled=false;m.visible=false;scene.add(m);const L=[];const r=PM_TOWN.rng(8);for(let k=0;k<n;k++)L.push({a:r()*6.28,r:1+r()*7,y:-r()*14,v:.7+r()*.6,ph:r()*6});return {m,L}})();
const FW=(()=>{const n=1400,pos=new Float32Array(n*3),col=new Float32Array(n*3),g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('color',new T.BufferAttribute(col,3));
 const m=new T.Points(g,curve(new T.PointsMaterial({size:.32,vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending,fog:false})));m.frustumCulled=false;scene.add(m);const pts=[...Array(n)].map(()=>({x:0,y:-99,z:0,vx:0,vy:0,vz:0,l:0,c:[1,1,1]}));return {m,pts,pos,col,i:0,t:0}})();
function burst(x,y,z,big){const cols=[[1,.55,.6],[1,.85,.4],[.55,.85,1],[.7,1,.6],[1,.6,1]],c=cols[Math.floor(Math.random()*cols.length)],n=big?140:36;for(let k=0;k<n;k++){const p=FW.pts[FW.i=(FW.i+1)%FW.pts.length];const u=Math.random()*2-1,a=Math.random()*6.28,q=Math.sqrt(1-u*u),s=(big?7:2.6)*(.7+Math.random()*.3);
 p.x=x;p.y=y;p.z=z;p.vx=Math.cos(a)*q*s;p.vy=u*s+(big?0:1.8);p.vz=Math.sin(a)*q*s;p.l=big?1.8+Math.random()*.6:.9+Math.random()*.4;p.c=c}}
function catsToPlaza(){const py=town.plaza.y;CATS.forEach((c,k)=>{if(c.plaza)return;c.plaza=true;const a=k/CATS.length*Math.PI*2+.3,r=5.3;c.x=Math.cos(a)*r;c.z=Math.sin(a)*r;c.col.x=c.x;c.col.z=c.z;c.y=town.footY(c.x,c.z,.1);c.g.position.set(c.x,c.y,c.z);c.g.rotation.y=Math.atan2(-c.x,-c.z);c.hop=.7})}
function renderCats(){$('catn').textContent=`${catFed.length}/${CATS.length}`;const el=$('cat-grid');if(!el)return;el.innerHTML='';
 CATS.forEach(c=>{const f=catFed.includes(c.k),d=document.createElement('div');d.className='cc'+(f?' on':'');const bg=c.patch?`radial-gradient(circle at 70% 35%,${c.patch} 0 26%,transparent 27%),${c.body}`:c.body;
  d.innerHTML=`<span class="cf" style="background:${f?bg:'#d9cfbf'}"><i style="border-bottom-color:${f?c.head:'#d9cfbf'}"></i><i style="border-bottom-color:${f?c.head:'#d9cfbf'}"></i>${f?'':'?'}</span><b>${f?c.name:'???'}</b><small>${catWhere(c)}</small>`;el.appendChild(d)})}
function toggleCats(on){const m=$('catbook');on=on===undefined?!m.classList.contains('on'):on;m.classList.toggle('on',on);if(on)renderCats();blip()}
// 다음 날 — 배달 목록 · 날씨 · 집 안 사람이 바뀐다(고양이 도감 · 킥보드 · 걸은 거리는 그대로)
function nextDay(){S=blank(S.day+1,{dist:S.dist,bike:S.bike,crateHint:S.crateHint,starsAll:(S.starsAll||0)+S.stars.length});save();try{sessionStorage.setItem('pm-autostart','1')}catch(e){}location.reload()}
function setupDay(){WX=wxFor(S.day);makePuddles(S.day);setInside();dressHero();parkBike();setRainSound();applySky();renderCats()}
function crateHint(){const O=town.overpass;if(O&&!S.ovHint&&started&&O.inside(P.x,P.z,1.2)){S.ovHint=1;toast('<b>🌉 골목 육교</b>계단으로 올라가 네거리 위를 건너 보세요',4)}if(S.crateHint||!started)return;for(const c of town.crates)if(Math.hypot(c.x-P.x,c.z-P.z)<1.6){S.crateHint=1;toast('<b>📦 지름길 나무 상자</b>상자 위로 뛰어(Space) 한 번 더 뛰면 블록담을 넘어요',4.5);return}}
function updateRush(dt){if(!started||!$('finale').hidden||SC)return;for(const id of S.bag){if(!(id in S.rush))continue;const was=S.rush[id];S.rush[id]=was-dt;if(was>0&&S.rush[id]<=0){const j=job(id);toast(`<b>🟥 ${j.item}</b>급배달 시간이 지났어요. 그래도 갖다 줘요!`,3.5);renderBag()}
  else if(Math.floor(was)!==Math.floor(S.rush[id])&&$('bag').classList.contains('has'))renderBagSoon()}}
let rbT=0;function renderBagSoon(){if(clock.t-rbT>1){rbT=clock.t;renderBag()}}
function updateFx(dt,t){let any=false;for(let k=0;k<FW.pts.length;k++){const p=FW.pts[k];if(p.l>0){any=true;p.l-=dt;p.vy-=3.2*dt;p.vx*=.985;p.vz*=.985;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt}const a=Math.max(0,Math.min(1,p.l*1.4));FW.pos[k*3]=p.x;FW.pos[k*3+1]=p.l>0?p.y:-99;FW.pos[k*3+2]=p.z;FW.col[k*3]=p.c[0]*a;FW.col[k*3+1]=p.c[1]*a;FW.col[k*3+2]=p.c[2]*a}
 if(any||FW.t>0){FW.m.geometry.attributes.position.needsUpdate=true;FW.m.geometry.attributes.color.needsUpdate=true}
 if(fest){fest.t+=dt;LANT.m.visible=true;const o=new T.Object3D();LANT.L.forEach((l,k)=>{l.y+=l.v*dt*(fest.t>2?1:0);if(l.y>34)l.y=0;const sp=1+Math.max(0,l.y)*.05;o.position.set(Math.cos(l.a+t*.05)*l.r*sp,l.y+1.6+town.plaza.y,Math.sin(l.a+t*.05)*l.r*sp);o.rotation.z=Math.sin(t+l.ph)*.15;o.scale.setScalar(l.y<0?0:Math.min(1,l.y*2));o.updateMatrix();LANT.m.setMatrixAt(k,o.matrix)});LANT.m.instanceMatrix.needsUpdate=true;
  FW.t-=dt;if(FW.t<=0){FW.t=.9+Math.random()*.9;const a=Math.random()*6.28,r=4+Math.random()*10;burst(Math.cos(a)*r,town.plaza.y+16+Math.random()*10,Math.sin(a)*r,true);tone(140+Math.random()*60,0,.6,'sine',.05);tone(1200+Math.random()*600,.05,.5,'triangle',.012)}}}
function startFest(){if(fest)return;fest={t:0};S.fest=true;if(riding)toggleBike(false);save();renderBag();jingle();const allCats=catFed.length>=CATS.length;if(allCats)catsToPlaza();toast('<b>🏮 골목 등불 축제</b>동네 사람들이 모두 모였어요!'+(allCats?'<br>🐱 골목 고양이 12마리도 놀러 왔어요':''),6);NPCS.forEach(n=>{n.hop=.7;n.wave=2});
 setTimeout(()=>{$('fin-n').textContent=`${S.done.length} / ${TOTAL}`;$('fin-s').textContent=`${S.stars.length} / ${TOTAL}`;$('fin-h').textContent=`${S.day}일째 배달 끝!`;$("fin-next").textContent=`${S.day+1}일째 배달하러 가기 · ${WXI[wxFor(S.day+1)]}`;$('fin-d').textContent=(S.dist/1000).toFixed(2)+' km';$('fin-t').textContent=Math.max(1,Math.round(S.time/60))+'분';$('finale').hidden=false;try{store('asset-village-3d-postman',JSON.stringify({done:TOTAL,total:TOTAL,cleared:true,at:Date.now()}))}catch(e){}},5200)}


/* ═══ 14-1. 킥보드 — 우체국 빨간 킥보드. 발로 차서 달리고 내리막에선 저절로 빨라진다. 계단 · 가파른 비탈에선 내려서 끌고 간다 ═══ */
const KICK=(()=>{const g=new T.Group(),wheels=[],mk=(geo,c,x,y,z,par=g)=>{const m=new T.Mesh(geo,toon(c));m.position.set(x,y,z);m.castShadow=true;par.add(m);return m};
 mk(new T.BoxGeometry(.2,.045,.74),'#d8463d',0,.1,0);mk(new T.BoxGeometry(.17,.01,.6),'#3b3d42',0,.127,-.02);mk(new T.BoxGeometry(.2,.03,.16),'#d8463d',0,.105,.4).rotation.x=-.25;
 for(const z of [.36,-.34]){const w=new T.Group();w.position.set(0,.065,z);g.add(w);const t=mk(new T.CylinderGeometry(.065,.065,.045,16),'#33363b',0,0,0,w);t.rotation.z=Math.PI/2;const h=mk(new T.CylinderGeometry(.03,.03,.05,8),'#e8e2d6',0,0,0,w);h.rotation.z=Math.PI/2;wheels.push(w)}
 mk(new T.BoxGeometry(.08,.02,.16),'#d8463d',0,.14,-.36).rotation.x=.3;
 const st=mk(new T.CylinderGeometry(.024,.024,.74,10),'#c9cfd2',0,.48,.33);st.rotation.x=-.16;
 const bar=mk(new T.CylinderGeometry(.02,.02,.46,10),'#c9cfd2',0,.84,.27);bar.rotation.z=Math.PI/2;for(const s2 of [-1,1]){const gr=mk(new T.CylinderGeometry(.03,.03,.1,10),'#2f302c',s2*.21,.84,.27);gr.rotation.z=Math.PI/2}
 mk(new T.SphereGeometry(.035,10,8),'#ffd36a',0,.72,.37);outline(g,40);g.visible=false;scene.add(g);return {g,wheels,kick:0}})();
const BIKE=KICK;
const parkAt=(()=>{const d=post.door,sx=d.nz,sz=-d.nx;return {x:d.x+d.nx*1.5+sx*1.9,z:d.z+d.nz*1.5+sz*1.9,h:Math.atan2(sx,sz)}})();
let riding=false,pushing=false,lean=0,kickSp=0;
// 킥보드 위 자세: 앞발은 발판, 뒷발로 땅을 차고(달리는 중 · 오르막), 두 손은 손잡이
// 계단·턱에서 발 맞추기: 두 발 밑 땅 높이를 따로 재서, 낮은 발이 땅에 닿도록 몸을 내리고 높은 쪽 다리는 무릎을 굽혀 디딤판 위에 올린다
const _fv=new T.Vector3(),FT={shift:0,L:0,R:0};
function legIK(side,lift){const J=HERO.J,th=J['thigh'+side],kn=J['knee'+side],a=.24,b=.33,t0=th.rotation.x,ph0=kn.rotation.x;
 const ky=-a*Math.cos(t0),kz=-a*Math.sin(t0),g=t0+ph0,fy=ky-b*Math.cos(g)-.05*Math.sin(g),fz=kz-b*Math.sin(g)+.05*Math.cos(g);
 const gy=.02-J.hips.position.y+lift,ty=Math.min(-.24,Math.max(fy,gy)),tz=fz;if(ty<=fy+.002)return;const D=clamp(Math.hypot(ty,tz),b-a+.02,a+b-.003),ph=Math.PI-Math.acos(clamp((a*a+b*b-D*D)/(2*a*b),-1,1));
 th.rotation.x=Math.atan2(-tz,-ty)-Math.atan2(b*Math.sin(ph),a+b*Math.cos(ph));kn.rotation.x=ph}
function stepFeet(dt){const sc=HERO.root.scale.y,pg=P.gy,on=P.onGround&&P.air<.02&&!(platTop(P.x,P.z,P.y)>Math.max(town.footY(P.x,P.z,.2),ovTop(P.x,P.z,P.y))+.05);
 HERO.root.updateMatrixWorld(true);const gs={};
 // 발마다 뒤꿈치·발끝 두 곳의 땅 높이 중 높은 쪽 (발끝이 계단 턱에 박히지 않게). 벽처럼 너무 높거나 낭떠러지처럼 너무 낮으면 몸 높이로 본다
 for(const sd of ['L','R']){let g=-1e9;for(const oz of [-.1,.2]){HERO.J['knee'+sd].localToWorld(_fv.set(0,-.315,oz));g=Math.max(g,town.footY(_fv.x,_fv.z),ovTop(_fv.x,_fv.z,pg+.3))}gs[sd]=g>pg+.7||g<pg-.6?pg:g}
 // 몸은 낮은 발 쪽에 두되, 높은 발을 0.2 넘게 들어 올려야 하면 그만큼 몸을 올린다
 const hi=Math.max(gs.L,gs.R),lo=Math.min(gs.L,gs.R),base=Math.max(lo,hi-.2),want=on?clamp(pg-base,-.4,.4):0;
 FT.shift+=(want-FT.shift)*Math.min(1,dt*14);HERO.root.position.y-=FT.shift;
 for(const sd of ['L','R']){const need=on?clamp(gs[sd]-(pg-FT.shift),0,.24):0;FT[sd]=need>FT[sd]?need:FT[sd]+(need-FT[sd])*Math.min(1,dt*12);if(FT[sd]>.004)legIK(sd,FT[sd]/sc)}}
// 우산이 벽·기둥 속으로 들어가지 않게: 우산 둘레를 재서 막힌 쪽 반대로 기울이고, 그래도 좁으면 살짝 접는다
const UMB={tx:0,tz:0,s:1,can:null},_uc=new T.Vector3(),_ub=new T.Vector3(),_ua=new T.Vector3(),_uq=new T.Quaternion(),_uw=new T.Quaternion(),_near=[];
function umbSolid(x,y,z){if(y<town.groundY(x,z)+.05)return true;const i=town.ci(x),j=town.ci(z);
 if(i>=0&&j>=0&&i<town.N&&j<town.N){const v=town.G[j*town.N+i];if((v===0||v===4)&&y<town.CH[j*town.N+i]+.5)return true}else if(town.camBlock(x,y,z))return true;
 for(const c of _near){if(c.box){const [x0,z0,x1,z1]=c.box;if(x>x0&&x<x1&&z>z0&&z<z1&&(c.top===undefined||y<c.top)&&(c.bot===undefined||y>=c.bot))return true}else if((x-c.x)**2+(z-c.z)**2<c.r*c.r)return true}return false}
function umbClear(cx,cy,cz,R){let best=R,px=0,pz=0;for(let k=0;k<12;k++){const a=k/12*Math.PI*2,dx=Math.cos(a),dz=Math.sin(a);let c=R;
  for(let r=.12;r<=R+.001;r+=.11)if(umbSolid(cx+dx*r,cy,cz+dz*r)){c=Math.max(0,r-.11);break}
  if(c<R){px-=dx*(R-c);pz-=dz*(R-c)}best=Math.min(best,c)}return {best,px,pz}}
function fitUmbrella(dt){const U=HERO.props.umb;if(!U.visible){UMB.tx=UMB.tz=0;UMB.s=1;return}
 if(!UMB.can)UMB.can=U.children.find(m=>m.geometry&&m.geometry.type==='ConeGeometry');
 _near.length=0;for(const c of town.colliders){if(c.box){const [x0,z0,x1,z1]=c.box;if(P.x>x0-2&&P.x<x1+2&&P.z>z0-2&&P.z<z1+2)_near.push(c)}else if(c.r<=.6&&Math.abs(c.x-P.x)<2&&Math.abs(c.z-P.z)<2)_near.push(c)}
 // 기울이기 전 우산 둘레(손잡이 → 우산 테)에서 막힌 정도를 재고, 그 반대쪽으로 기울인다
 U.quaternion.identity();HERO.root.updateMatrixWorld(true);U.localToWorld(_ub.set(0,0,0));U.localToWorld(_uc.set(0,.75,0));
 const R=.66,q=umbClear(_uc.x,_uc.y,_uc.z,R),pl=Math.hypot(q.px,q.pz),ln=_uc.distanceTo(_ub);let wx=0,wz=0,m=0,ux=0,uz=0;
 if(pl>.001){ux=q.px/pl;uz=q.pz/pl;m=Math.min(.32,Math.asin(Math.min(.95,(R-q.best)/ln)));wx=ux*m;wz=uz*m}
 // 기울인 자리에서도 모자라는 만큼만 우산을 접는다
 const sh=Math.sin(m)*ln,q2=umbClear(_uc.x+ux*sh,_uc.y,_uc.z+uz*sh,R),s=clamp(q2.best/R+.06,.45,1);
 const k=Math.min(1,dt*14);UMB.tx+=(wx-UMB.tx)*k;UMB.tz+=(wz-UMB.tz)*k;UMB.s=s<UMB.s?s:UMB.s+(s-UMB.s)*Math.min(1,dt*6);
 // 세계 방향 기울기(수평축 둘레 회전)를 우산이 붙은 몸통 좌표로 바꿔 적용
 const ang=Math.hypot(UMB.tx,UMB.tz);if(ang>1e-4){U.parent.getWorldQuaternion(_uq);_ua.set(UMB.tz,0,-UMB.tx).normalize();_uw.setFromAxisAngle(_ua,ang);U.quaternion.copy(_uq).invert().multiply(_uw).multiply(_uq)}
 if(UMB.can)UMB.can.scale.set(UMB.s,1+(1-UMB.s)*.9,UMB.s)}
function scootPose(kick,t,dt){const J=HERO.J,k=Math.max(0,Math.sin(kick)),c=Math.cos(kick);HERO.walk(0,0,t,dt);
 J.hips.position.y=.56-k*.05;J.hips.rotation.set(0,.12,0);J.spine.rotation.set(.16+k*.06,-.12,0);J.head.rotation.set(-.12,-.05,0);
 J.thighL.rotation.set(-.18-k*.12,0,0);J.kneeL.rotation.set(.3+k*.25,0,0);
 J.thighR.rotation.set(.12+k*.95*(c<0?1:.7),0,0);J.kneeR.rotation.set(.2+k*.3,0,0);
 J.shoulderL.rotation.set(-1.05,0,-.08);J.shoulderR.rotation.set(-1.05,0,.08);J.elbowL.rotation.set(-.45,0,0);J.elbowR.rotation.set(-.45,0,0)}
function parkBike(){const show=!S.bike&&!riding;BIKE.g.visible=show||riding;if(show){const y=town.footY(parkAt.x,parkAt.z,.3);BIKE.g.position.set(parkAt.x,y,parkAt.z);BIKE.g.rotation.set(0,parkAt.h,0)}}
function dressHero(){HERO.dress({season:WX==='snow'?'winter':'spring',wet:WX==='rain'&&!riding,riding,gems,wear:VP})}
function toggleBike(on){au();if(!S.bike){toast('<b>🛴 빨간 킥보드</b>우체국장님께 첫 가방을 받으면 빌려줘요',3);return}if(talkLock())return;
 riding=on===undefined?!riding:on;pushing=false;BIKE.g.visible=riding;dressHero();HERO.root.rotation.set(0,P.h,0);$('bikebtn').classList.toggle('on',riding);
 if(riding){tone(900,0,.06,'square',.02);tone(1300,.07,.08,'square',.018)}else{tone(600,0,.1,'sine',.03);parkBike()}}

/* ═══ 14-2. 날씨 — 맑음 · 비(우산 · 웅덩이 · 젖으면 안 되는 물건) · 눈(하얗게 덮인 지붕과 길) ═══ */
const RAIN=(()=>{const n=TOUCH?500:900,p=new Float32Array(n*6),g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));const sd=[];for(let k=0;k<n;k++)sd.push({x:(Math.random()-.5)*26,y:Math.random()*14,z:(Math.random()-.5)*26,v:13+Math.random()*5});
 const m=new T.LineSegments(g,new T.LineBasicMaterial({color:'#d8e6f2',transparent:true,opacity:.5,depthWrite:false,fog:false}));m.frustumCulled=false;m.visible=false;scene.add(m);return {m,p,sd}})();
const SNOW=(()=>{const n=TOUCH?600:1100,p=new Float32Array(n*3),g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));const sd=[];for(let k=0;k<n;k++)sd.push({x:(Math.random()-.5)*30,y:Math.random()*14,z:(Math.random()-.5)*30,v:.7+Math.random()*.7,ph:Math.random()*6});
 const m=new T.Points(g,new T.PointsMaterial({color:'#ffffff',size:.09,transparent:true,opacity:.95,depthWrite:false}));m.frustumCulled=false;m.visible=false;scene.add(m);return {m,p,sd}})();
const PUD={list:[],mat:curve(new T.MeshBasicMaterial({color:'#a9bfcc',transparent:true,opacity:.72,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2})),g:new T.Group()};scene.add(PUD.g);
function makePuddles(day){PUD.g.clear();PUD.list=[];if(WX!=='rain')return;const r=PM_TOWN.rng(day*17+3),N=town.N;let tries=0;
 while(PUD.list.length<46&&tries++<2000){const i=Math.floor(r()*N),j=Math.floor(r()*N),v=town.at(i,j);if(v!==1&&v!==2)continue;if(town.stairs.has(j*N+i))continue;const x=cx(i)+(r()-.5)*1.6,z=cx(j)+(r()-.5)*1.6;if(Math.hypot(x,z)<5)continue;
  const rr=.45+r()*.55,m=new T.Mesh(new T.CircleGeometry(1,18).rotateX(-Math.PI/2),PUD.mat);m.scale.set(rr*(1+r()*.5),1,rr);m.rotation.y=r()*3;m.position.set(x,town.footY(x,z)+.035,z);m.renderOrder=1;PUD.g.add(m);PUD.list.push({x,z,r:rr*1.1,last:-9})}}
const WXK={clear:{k:0},rain:{k:.62,top:'#8796a6',bot:'#b5bfc6',fog:'#a9b4bc',sun:.42,hemi:.9},snow:{k:.5,top:'#a9bccb',bot:'#eef2f5',fog:'#e4eaee',sun:.62,hemi:1.05}};
function applyWeather(){const w=WXK[WX];if(!w.k)return;const k=w.k*(1-ENV.night*.55);skyU.top.value.lerp(_c1.set(w.top),k);skyU.bot.value.lerp(_c1.set(w.bot),k);scene.fog.color.lerp(_c1.set(w.fog),k);scene.fog.near=WX==='rain'?26:30;scene.fog.far=WX==='rain'?110:130;
 sun.intensity*=lerp(1,w.sun,w.k/.62);hemi.intensity*=w.hemi;skyU.sunC.value.multiplyScalar(.3);MT.a.color.lerp(_c1.set(w.fog),k*.6);MT.b.color.lerp(_c1.set(w.fog),k*.7)}
let rainSnd=null;
function setRainSound(){const c=AU.ctx;if(!c)return;const want=WX==='rain'&&AU.on;if(want&&!rainSnd){const len=2,b=c.createBuffer(1,c.sampleRate*len,c.sampleRate),d=b.getChannelData(0);for(let k=0;k<d.length;k++)d[k]=Math.random()*2-1;
  const s2=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s2.buffer=b;s2.loop=true;f.type='bandpass';f.frequency.value=2600;f.Q.value=.5;g.gain.value=.05;s2.connect(f);f.connect(g);g.connect(AU.m);s2.start();rainSnd={s2,g}}
 else if(!want&&rainSnd){try{rainSnd.s2.stop()}catch(e){}rainSnd=null}}
function updateWeather(dt,t){CURVE.uSnow.value+=((WX==='snow'?1:0)-CURVE.uSnow.value)*Math.min(1,dt*2);
 const wrap=d=>{if(d.x-P.x>15)d.x-=30;else if(d.x-P.x<-15)d.x+=30;if(d.z-P.z>15)d.z-=30;else if(d.z-P.z<-15)d.z+=30};
 if(WX==='rain'){RAIN.m.visible=true;const p=RAIN.p;for(let k=0;k<RAIN.sd.length;k++){const d=RAIN.sd[k];d.y-=d.v*dt;if(d.y<P.y-1.5)d.y+=15;else if(d.y>P.y+14)d.y-=15;wrap(d);
   p[k*6]=d.x;p[k*6+1]=d.y;p[k*6+2]=d.z;p[k*6+3]=d.x+.03;p[k*6+4]=d.y+.55;p[k*6+5]=d.z+.02}RAIN.m.geometry.attributes.position.needsUpdate=true}else RAIN.m.visible=false;
 if(WX==='snow'){SNOW.m.visible=true;const p=SNOW.p;for(let k=0;k<SNOW.sd.length;k++){const d=SNOW.sd[k];d.y-=d.v*dt;d.x+=Math.sin(t*.8+d.ph)*dt*.4;if(d.y<P.y-1.5)d.y+=15;else if(d.y>P.y+14)d.y-=15;wrap(d);
   p[k*3]=d.x;p[k*3+1]=d.y;p[k*3+2]=d.z}SNOW.m.geometry.attributes.position.needsUpdate=true}else SNOW.m.visible=false}
function splash(x,y,z){for(let k=0;k<14;k++){const p=FW.pts[FW.i=(FW.i+1)%FW.pts.length],a=Math.random()*6.28,s2=.8+Math.random()*1.2;p.x=x+Math.cos(a)*.15;p.y=y+.05;p.z=z+Math.sin(a)*.15;p.vx=Math.cos(a)*s2;p.vz=Math.sin(a)*s2;p.vy=1.6+Math.random()*1.4;p.l=.45+Math.random()*.2;p.c=[.55,.7,.85]}
 const c=AU.ctx;if(c&&AU.on){const b=c.createBuffer(1,c.sampleRate*.12|0,c.sampleRate),d=b.getChannelData(0);for(let k=0;k<d.length;k++)d[k]=(Math.random()*2-1)*Math.pow(1-k/d.length,2);const s3=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s3.buffer=b;f.type='highpass';f.frequency.value=1800;g.gain.value=.12;s3.connect(f);f.connect(g);g.connect(AU.m);s3.start()}}
// 젖으면 안 되는 물건: 비 오는 날 달리거나(우산이 기울어져요) 킥보드(우산 없음)를 타거나 웅덩이를 밟으면 젖는다
function wetten(amt,why){if(WX!=='rain'||amt<=0)return;let warn=null;for(const id of S.bag){const j=job(id);if(!j.dry)continue;const w0=S.wet[id]||0,w=Math.min(100,w0+amt);S.wet[id]=w;if(w0<50&&w>=50)warn=[j,'젖어 가요'];if(w0<100&&w>=100)warn=[j,'흠뻑 젖었어요']}
 if(warn){toast(`<b>💧 ${warn[0].item} ${warn[1]}!</b>${warn[1]==='흠뻑 젖었어요'?'받는 사람이 조금 아쉬워할 거예요':'우산 쓰고 천천히 걸어요 · 웅덩이 조심'}`,3.6);renderBag()}else if(why&&Math.random()<.02)renderBag()}
function updatePuddles(t){if(WX!=='rain'||!PUD.list.length||!P.onGround||P.air>.05)return;for(const q of PUD.list){if(Math.abs(q.x-P.x)>q.r+.3||Math.abs(q.z-P.z)>q.r+.3)continue;if(Math.hypot(q.x-P.x,q.z-P.z)<q.r&&Math.hypot(P.vx,P.vz)>1&&t-q.last>.5){q.last=t;splash(P.x,P.gy,P.z);wetten(riding?12:20,1);renderBag()}}}

/* ═══ 14-3. 집 안 사람 · 문 장면 · 건네는 물건 ═══ */
// 비 · 눈 오는 날엔 동네 사람들이 집 안에 있다. 문 앞에서 E → 문이 열리고 손이 나와 받아 간다. 맑은 날에도 몇 집은 집 안에 있다
function itemMesh(k){const g=new T.Group(),mk=(geo,c,x,y,z,sx=1,sy=1,sz=1)=>{const m=new T.Mesh(geo,toon(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);g.add(m);return m},B=new T.BoxGeometry(1,1,1);
 if(k==='parcel'||k==='cold'){mk(B,k==='cold'?'#8fc8e8':'#c99a63',0,0,0,.34,.26,.28);mk(B,k==='cold'?'#ffffff':'#e8d9a8',0,0,0,.08,.27,.29);mk(B,k==='cold'?'#ffffff':'#e8d9a8',0,.131,0,.35,.005,.08)}
 else if(k==='flower'){const c=mk(new T.ConeGeometry(.12,.36,10),'#f3e6c9',0,-.05,0);c.rotation.x=Math.PI;['#e98a9c','#f0cf68','#fbf6ea','#d8664f'].forEach((cc,i)=>mk(new T.SphereGeometry(.07,8,6),cc,Math.cos(i*1.6)*.07,.17,Math.sin(i*1.6)*.07))}
 else if(k==='poem'){const c=mk(new T.CylinderGeometry(.05,.05,.36,10),'#f3e6c9',0,0,0);c.rotation.z=Math.PI/2;mk(B,'#d6453d',0,0,0,.04,.11,.11)}
 else if(k==='photo'){mk(B,'#7d6249',0,0,0,.3,.24,.03);mk(B,'#cfe6ef',0,0,.012,.24,.18,.02)}
 else{mk(B,k==='reply'?'#ffe9b8':k==='fan'?'#f7c6d6':'#fffaf0',0,0,0,.32,.22,.02);mk(B,'#d6453d',.1,.06,.012,.06,.07,.01);if(k==='fan'||k==='reply')mk(new T.SphereGeometry(.035,8,6),'#e0483e',0,-.02,.014,1,1,.3)}
 g.traverse(m=>{if(m.isMesh)m.castShadow=true});scene.add(g);return g}
const INSIDE1=['편안하게님','해의호흡님','윈터드림','티바이러스'];
function setInside(){const wet=WX!=='clear',r=PM_TOWN.rng(S.day*29+1);for(const n of NPCS){if(!n.home){n.inside=false;continue}
  n.inside=!eve&&(wet||(S.day===1?INSIDE1.includes(n.name):r()<.3));n.body.visible=!n.inside;const d=n.home.door,o=n.inside?.55:.95;n.x=n.hx=d.x+d.nx*o;n.z=n.hz=d.z+d.nz*o;n.marker.position.y=n.inside?2.45:2.05}}
let SC=null;   // 진행 중인 건네기 장면
const _hv=new T.Vector3();
function handPos(out){const h=HERO.hand();if(h){h.getWorldPosition(out);return out}return out.set(P.x+Math.sin(P.h)*.3,P.y+.6,P.z+Math.cos(P.h)*.3)}
function handOver(n,j){const it=itemMesh(j.k);handPos(_hv);it.position.copy(_hv);HERO.st.hold=true;if(HERO.props.umb)HERO.props.umb.visible=false;
 if(n.inside&&n.home&&n.home.doorPivot){const h=n.home,d=h.door,a=h.doorAt,shirt=byName(n.name)[3],[hc]=ANIMAL[n.animal]||['#e0b48f'];
  const arm=new T.Group();arm.position.set(a.px+d.nx*.05+Math.cos(a.ry)*.18,a.gf+1.0,a.pz+d.nz*.05-Math.sin(a.ry)*.18);arm.rotation.y=a.ry;scene.add(arm);
  const sl=new T.Mesh(new T.CapsuleGeometry(.075,.42,4,10),toon(shirt));sl.rotation.x=Math.PI/2;sl.position.z=.2;arm.add(sl);const hd=new T.Mesh(new T.SphereGeometry(.095,10,8),toon(hc));hd.position.z=.46;arm.add(hd);outline(arm,30);arm.scale.z=.01;
  SC={n,j,it,arm,hd,t:0,door:true,from:_hv.clone()}}
 else{n.give=1.3;SC={n,j,it,t:0,door:false,from:_hv.clone()}}
 talk.lock=true}
const _tv=new T.Vector3();
function updateScene(dt){for(const n of NPCS)if(n.home&&n.home.doorPivot){const h=n.home,want=SC&&SC.door&&SC.n===n?(SC.t<1.45?1.25:0):(talk.npc===n&&n.inside?.75:0);h.doorOpen+=(want-h.doorOpen)*Math.min(1,dt*(want>h.doorOpen?7:5));h.doorPivot.rotation.y=h.doorAt.ry-h.doorOpen}
 if(!SC)return;const c=SC;c.t+=dt;const e=x=>x<0?0:x>1?1:x*x*(3-2*x);
 if(c.door){const ext=c.t<.3?0:c.t<.75?e((c.t-.3)/.45):c.t<1.0?1:c.t<1.4?1-e((c.t-1.0)/.4):0;c.arm.scale.z=Math.max(.01,ext);c.hd.getWorldPosition(_tv)}
 else{const n=c.n;_tv.set(n.x+Math.sin(n.ry)*.32,n.y+.82,n.z+Math.cos(n.ry)*.32)}
 const f=e((c.t-.15)/.55);if(c.t<1.0||!c.door){c.it.position.lerpVectors(c.from,_tv,f);c.it.position.y+=Math.sin(Math.PI*f)*.45;c.it.rotation.y+=dt*4*(1-f)}else c.it.position.copy(_tv);
 if(c.t>.55)HERO.st.hold=false;if(!c.door&&c.t>1.15)c.it.scale.setScalar(Math.max(.001,1-(c.t-1.15)/.3));if(c.door&&c.t>1.4)c.it.visible=false;
 if(c.t>(c.door?1.9:1.5)){scene.remove(c.it);if(c.arm)scene.remove(c.arm);SC=null;talk.lock=false;dressHero()}}

/* ═══ 15. 매 프레임 ═══ */
const clock={t:0,last:performance.now()};let started=false;
function updateNpcs(dt,t){for(const n of NPCS){
 if(n.goto){const dg=Math.hypot(n.goto.x-P.x,n.goto.z-P.z),dn=Math.hypot(n.x-P.x,n.z-P.z);if(fest||(dg>11&&dn>11)){n.x=n.goto.x;n.z=n.goto.z;n.goto=null;n.hry=Math.atan2(-n.x,-n.z);n.hx=n.x;n.hz=n.z}}
 const dp=Math.hypot(n.x-P.x,n.z-P.z);let face=n.goto?n.ry:n.hry;if(dp<5.5&&!n.goto)face=Math.atan2(P.x-n.x,P.z-n.z);if(!n.bench)n.ry+=wrapA(face-n.ry)*Math.min(1,dt*5);
 n.y=town.footY(n.x,n.z,.15);n.g.position.set(n.x,n.y,n.z);n.g.rotation.y=n.ry;const br=Math.sin(t*2.2+n.x);n.body.position.y=(n.bench?-.15:0)+br*.012;n.head.rotation.z=Math.sin(t*.8+n.z)*.06;n.head.rotation.x=dp<5?-.08:0;
 if(n.hop>0){n.hop-=dt;n.body.position.y+=Math.sin(Math.PI*Math.max(0,n.hop)/.6)*.3}
 const sw=0;if(!n.bench){n.legs[0].rotation.x=sw;n.legs[1].rotation.x=-sw}
 if(n.give>0){n.give-=dt;n.arms[0].rotation.set(-1.25,0,.25);n.arms[1].rotation.set(-1.25,0,-.25)}else{if(n.wave>0){n.wave-=dt;n.arms[1].rotation.set(0,0,2.6+Math.sin(t*14)*.3)}else{n.arms[1].rotation.set(-sw*.7,0,.2+br*.03);}n.arms[0].rotation.set(sw*.7,0,-.2-br*.03)}
 const pend=pending(n);n.marker.visible=pend&&!fest;if(n.marker.visible){n.marker.position.y=2.05+Math.sin(t*3+n.x)*.08;n.marker.rotation.y=t*2}}
 markerMat.color.setHSL(.1,1,.6+Math.sin(t*4)*.08)}
function updateLife(dt,t){for(const c of CATS){c.tail.rotation.z=Math.sin(t*(c.t>0?8:2)+c.ph)*.5;c.hd.rotation.y=Math.sin(t*.6+c.ph)*.4;if(c.t>0)c.t-=dt;c.root.position.y=c.hop>0?Math.sin(Math.PI*c.hop/.7)*.35:0;if(c.hop>0)c.hop-=dt;
  if(Math.hypot(c.x-P.x,c.z-P.z)<3&&!c.plaza)c.g.rotation.y+=wrapA(Math.atan2(P.x-c.x,P.z-c.z)-c.g.rotation.y)*Math.min(1,dt*2)}
 for(const p of PIGEONS){const d=Math.hypot(p.x-P.x,p.z-P.z),run=Math.hypot(P.vx,P.vz)>4;if(p.fly<=0&&d<(run?3.2:1.6)){p.fly=6;p.vy=3.5;p.dir=Math.atan2(p.x-P.x,p.z-P.z)+(Math.random()-.5);tone(300+Math.random()*80,0,.25,'sine',.015)}
  if(p.fly>0){p.fly-=dt;p.vy-=dt*.6;p.y+=Math.max(.6,p.vy)*dt;p.x+=Math.sin(p.dir)*5*dt;p.z+=Math.cos(p.dir)*5*dt;p.g.rotation.y=p.dir;p.g.children[0].scale.x=1+Math.abs(Math.sin(t*30))*.8;if(p.fly<=0){p.x=p.hx;p.z=p.hz;p.y=0}}
  else{p.g.children[1].position.y=.25-Math.max(0,Math.sin(t*3+p.ph*2))*.07;p.g.children[0].scale.x=1;if(Math.random()<dt*.3)p.g.rotation.y+=(Math.random()-.5)*2}
  p.g.position.set(p.x,p.y+town.plaza.y,p.z)}
 const night=ENV.night;PET.m.material.color.setRGB(1,lerp(.82,.95,night),lerp(.87,.55,night));PET.m.material.size=lerp(.09,.13,night);
 for(let k=0;k<PET.sd.length;k++){const s=PET.sd[k];s.y-=dt*s.s*.35;s.x+=Math.sin(t*.7+s.ph)*dt*.5+dt*.4;s.z+=Math.cos(t*.5+s.ph)*dt*.3;let dx=s.x-P.x,dz=s.z-P.z;if(dx>15)s.x-=30;if(dx<-15)s.x+=30;if(dz>15)s.z-=30;if(dz<-15)s.z+=30;if(s.y<0)s.y=6+Math.random()*3;PET.pos[k*3]=s.x;PET.pos[k*3+1]=(P.gy||0)+s.y+(night>.6?Math.sin(t*2+s.ph)*.3:0);PET.pos[k*3+2]=s.z}PET.m.geometry.attributes.position.needsUpdate=true}
let paused=Q.has('pause');
function frame(now){const dt=Math.min(.05,(now-clock.last)/1000||0);clock.last=now;if(!paused)step(dt);requestAnimationFrame(frame)}
function step(dt,noRender){clock.t+=dt;const t=clock.t;if(started&&$('finale').hidden)S.time+=dt;
 const mv=started?movePlayer(dt):{v:0,m:0};if(!started){P.gy=P.y=town.footY(P.x,P.z,.2);HERO.root.position.set(P.x,P.y,P.z);HERO.root.rotation.set(0,P.h,0);HERO.shadow.position.set(P.x,P.y+.04,P.z);HERO.root.rotation.y=P.h;HERO.walk(P.phase,0,t,dt);cam.yaw+=dt*.08}
 ENV.tod+=(ENV.want-ENV.tod)*Math.min(1,dt*.35);applySky();applyWeather();
 CURVE.uCC.value.set(P.x,P.z);updateCam(dt,mv);updateNpcs(dt,t);updateLife(dt,t);updateScene(dt);updateWeather(dt,t);updatePuddles(t);updateRush(dt);if((step.ch=(step.ch||0)+dt)>.5){step.ch=0;crateHint()}if(!started)parkBike();town.update(t,dt,P.x,P.z,ENV.night);updateFx(dt,t);music(dt);
 if(eve&&!fest&&Math.hypot(P.x,P.z)<6.5)startFest();
 MT.g.position.set(camera.position.x,0,camera.position.z);sun.target.position.set(P.x,P.y,P.z);sun.position.set(P.x+skyU.sunD.value.x*70,P.y+Math.max(18,skyU.sunD.value.y*70),P.z+skyU.sunD.value.z*70);sky.position.copy(camera.position);stars.position.copy(camera.position);clouds.position.set(camera.position.x,0,camera.position.z);clouds.rotation.y=t*.004;
 if(started)updateHud(dt);if(started&&$('map').classList.contains('on')&&(step.mt=(step.mt||0)+dt)>.25){step.mt=0;drawMap()}
 if((step.st=(step.st||0)+dt)>5){step.st=0;save()}
 if(!noRender)renderer.render(scene,camera)}

/* ═══ 16. 시작 · 이어하기 · 마을로 ═══ */
function spawn(){const d=post.door;P.x=d.x+d.nx*3.4;P.z=d.z+d.nz*3.4;P.gy=null;P.air=0;P.h=Math.atan2(-d.nx,-d.nz);cam.yaw=P.h+Math.PI+.25;cam.cur=cam.dist}
function begin(fresh){au();if(fresh){S=blank(1);JOBS=jobsFor(1);TOTAL=JOBS.length}riding=false;BIKE.g.visible=false;
 // 이어하기: 맡은 물건(주는 사람 배달은 끝났는데 아직 못 준 것)과 받은 가방을 되살린다
 S.bag=S.bag.filter(id=>job(id)&&!S.done.includes(id));JOBS.forEach(j=>{if(j.from){const g=JOBS.find(o=>o.give===j.id);if(g&&S.done.includes(g.id)&&!S.done.includes(j.id)&&!S.bag.includes(j.id))S.bag.push(j.id)}});
 if(S.fest){eve=true;startEve();NPCS.forEach(n=>{if(n.goto){n.x=n.goto.x;n.z=n.goto.z}})}
 ENV.want=S.fest?1:Math.min(.84,S.done.length/TOTAL*.84);ENV.tod=ENV.want;setupDay();save();renderBag();spawn();started=true;$('intro').hidden=true;document.body.classList.add('play');
 setTimeout(()=>{if(!S.round)say(npcBy(POSTMASTER),S.day===1?'어서 와요, 새 배달부님! 저한테 와서 E(휴대폰은 아래 단추)를 누르면 첫 우편 가방을 줄게요.':`${S.day}일째 아침이에요! ${WX==='rain'?'비가 오네요. ☔':WX==='snow'?'밤새 눈이 왔어요. ❄':'날이 맑아요. ☀'} 가방 받으러 와요.`,6.5);else toast(`<b>✉ ${S.day}일째 이어서 배달</b>${S.done.length} / ${TOTAL}건 배달했어요`,4)},600)}
function goHome(){save();try{window.parent.postMessage({dpPostman:'close'},'*')}catch(e){}}
$('start').onclick=()=>begin(S.day===1&&!S.done.length&&!S.round);$('restart').onclick=()=>{if(confirm('1일째부터 다시 배달할까요? 배달 기록이 지워져요(고양이 도감은 남아요).')){store(SAVE,JSON.stringify(blank(1)));try{sessionStorage.setItem('pm-autostart','1')}catch(e){}location.reload()}};
if(S.done.length||S.round||S.day>1){$('start').textContent=`${S.day>1?S.day+'일째 ':''}이어서 배달하기 (${S.done.length}/${TOTAL})`;$('restart').hidden=false}
$('home').hidden=$('home2').hidden=!EMBED;$('home').onclick=goHome;$('home2').onclick=goHome;
$('snd').onclick=()=>setSound(!AU.on);setSound(AU.on);$('mapbtn').onclick=()=>toggleMap();$('map-x').onclick=()=>toggleMap(false);
$('bag-h').onclick=()=>{$('bag').classList.toggle('open');blip()};$('act').onclick=e=>{e.stopPropagation();act()};$('jumpbtn').onclick=()=>jump();
document.querySelectorAll('#emo button').forEach((b,k)=>b.onclick=()=>emote(k));
$('fin-walk').onclick=()=>{$('finale').hidden=true};$('fin-next').onclick=nextDay;$('fin-again').onclick=()=>{store(SAVE,JSON.stringify(blank(1)));location.reload()};
$('bikebtn').onclick=()=>{if(started)toggleBike()};$('catbtn').onclick=()=>toggleCats();$('cat-x').onclick=()=>toggleCats(false);
$('fin-home').hidden=!EMBED;$('fin-home').onclick=goHome;
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.fov=TOUCH&&innerWidth<innerHeight?66:58;camera.updateProjectionMatrix()});
if(TOUCH)document.body.classList.add('touch');
WX=wxFor(S.day);dressHero();parkBike();spawn();applySky();renderBag();renderCats();
$('start').disabled=false;try{if(sessionStorage.getItem('pm-autostart')){sessionStorage.removeItem('pm-autostart');setTimeout(()=>begin(false),300)}}catch(e){}
requestAnimationFrame(frame);
window.pmDebug={T,scene,camera,renderer,town,HERO,NPCS,P,cam,keys,platTop,ovTop,resolve,get S(){return S},get JOBS(){return JOBS},get WX(){return WX},get riding(){return riding},get pushing(){return pushing},get SC(){return SC},CATS,get catFed(){return catFed},feedCat,toggleBike,toggleCats,nextDay,setupDay,setWx(w){WX=w;makePuddles(S.day);setInside();dressHero()},ENV,get started(){return started},begin,act,emote,jump,step:(n=1,dt=1/30)=>{for(let k=0;k<n;k++)step(dt,k<n-1)},get camFix(){return camFix},closeTalk,tick:(n=1)=>{for(let k=0;k<n;k++)step(1/30,true)},pause:v=>{paused=v},
 tp(name){const n=npcBy(name);if(!n)return;P.x=n.x+Math.sin(n.ry)*1.1;P.z=n.z+Math.cos(n.ry)*1.1;P.h=n.ry+Math.PI;cam.yaw=P.h+Math.PI+.4;cam.cur=cam.dist},
 deliverAll(){S.done=JOBS.map(j=>j.id);S.bag=[];S.round=4;ENV.want=.84;save();renderBag()},tpCat(k){const c=CATS[k];P.x=c.x+Math.sin(c.g.rotation.y)*1.1;P.z=c.z+Math.cos(c.g.rotation.y)*1.1;P.h=c.g.rotation.y+Math.PI;cam.yaw=P.h+Math.PI+.4},startEve,startFest,setTod(v){ENV.tod=ENV.want=v},toggleMap};
})();
