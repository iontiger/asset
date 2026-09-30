/* ═══════ 주민 — 섬 전체로 고루, 새 주민 료멘스쿠나 · 포롱이 · 스피또꿈나무 · 티바이러스 · 윈터드림 · 원조익평 · 산타우찬이, 만나면 게임 도움말 또는 주식 격언 ═══════
   원래 주민 10명 중 셋이 금고 마을(예금)에 서 있고 한 명은 예금 길을 오갔다. 여기서는 모든 구역 길의 안쪽 · 바깥쪽 절반과
   북쪽 길(목표봉 가는 길)에 한 명씩, 12명이 모두 나눠 걷게 한다.
   ANIMALS · NPC_LANES · npcGroups 는 const 라 내용만 바꾼다(다시 대입하면 안 된다). */
'use strict';
(function(){
/* ── 새 주민 ── */
Object.assign(ANIMALS,{
  sukuna:{e:'👹',n:'사람',fur:'#f6d3b5',lt:'#f6d3b5',ear:null,tail:null,nose:'#e8b49a',foot:'#26262c',leg:'#26262c'},
  porong:{e:'🐾',n:'포롱이',fur:'#fffafc',lt:'#ffe6ef',face:'#fffafc',ear:'round',in:'#ffc4d8',tail:'pom',nose:'#f28fb1',foot:'#ffe6ef',wool:1,hop:1,eye:.085}});
const _ba=buildAnimal;buildAnimal=function(spec){const h=_ba(spec);try{spec.deco&&spec.deco(h)}catch(e){console.error(e)}return h};
// 료멘스쿠나 — 분홍 삐죽머리, 눈 밑 검은 무늬 두 줄, 이마 무늬, 붉은 눈, 검은 허리띠
function decoSukuna(h){const H=h.head,ink='#1c1c22',pink='#f39ab0';
  for(let k=0;k<10;k++){const a=k/10*Math.PI*2,m=mesh(new THREE.ConeGeometry(.1,.34,6),pink,H);m.position.set(Math.sin(a)*.3,.74,Math.cos(a)*.28-.03);m.rotation.set(Math.cos(a)*.75,0,-Math.sin(a)*.75)}
  for(const [x,z] of [[0,0],[.12,.1],[-.12,.1],[0,-.14]]){const m=mesh(new THREE.ConeGeometry(.1,.36,6),pink,H);m.position.set(x,.9,z);m.rotation.set(z*2,0,-x*2)}
  for(const sx of [-1,1])for(const y of [.355,.325]){const b=box(H,sx*.17,y,.425,.12,.018,.012,ink);b.rotation.y=sx*.35}
  const f=box(H,0,.66,.39,.03,.11,.012,ink);f.rotation.x=-.5;
  if(h.eyes&&h.eyes[0])h.eyes[0].material=mat('#c0142f');if(h.eyes&&h.eyes[2])h.eyes[2].material=mat('#c0142f');
  if(h.spine)cyl(h.spine,0,.13,0,.335,.335,.1,ink,18)}
// 포롱이 — 작고 복슬복슬, 머리 위에 더듬이 방울
function decoPorong(h){h.root.scale.setScalar(.78);beam(h.head,[0,.84,0],[.05,1.08,.02],.02,'#8fd1b5');sphere(h.head,.06,1.12,.02,.07,'#f28fb1',1)}
const extra=[{name:'료멘스쿠나',kind:'산책',animal:'sukuna',role:'장난꾸러기 방랑자',look:{shirt:'#f3eee4',scarf:'#26262c'},deco:decoSukuna,greet:['크크큭','어이!','심심해','흥~']},
  {name:'포롱이',kind:'산책',animal:'porong',role:'마을 마스코트',look:{},deco:decoPorong,greet:['포롱!','뽀잉~','헤헤','안뇽!']}];
extra.forEach((s,k)=>{Object.assign(s,{baseX:0,baseZ:6,shirt:s.look.shirt||'#ffffff',phase:(10+k)*1.71,speed:.2});try{const n=makeNpc(s);n.greet=s.greet;n.root.visible=!prefs.light;if(n.shadow&&n.shadow.material)n.shadow.material.opacity=FX.level>=1?.32:.15}catch(e){console.error(e)}});

/* ── 새 주민 다섯 (2026-09-30) — 여성: 스피또꿈나무 · 티바이러스 · 윈터드림 / 남성: 원조익평 · 산타우찬이 ──
   여성은 머리 리본 · 속눈썹 · 치마, 남성은 넥타이 · 모자로 구분한다. */
Object.assign(ANIMALS,{
  hamster:{e:'🐹',n:'햄스터',fur:'#f2c38a',lt:'#fff4e3',ear:'round',tail:'stub',in:'#f8c4a8',nose:'#e8837f',foot:'#f2c38a'},
  blackcat:{e:'🐈',n:'검은 고양이',fur:'#3b3b46',lt:'#ecebf2',ear:'tri',tail:'long',in:'#f3a7c0',nose:'#f28fb1',foot:'#3b3b46',whisk:1},
  polar:{e:'🐻',n:'북극곰',fur:'#f7f9fb',lt:'#ffffff',ear:'round',tail:'stub',in:'#cfe3f3',nose:'#4f5f6e',foot:'#e3ecf3'},
  tiger:{e:'🐯',n:'호랑이',fur:'#f0a04b',lt:'#fff4e3',ear:'round',tail:'long',in:'#fff0e2',nose:'#3b2a22',foot:'#fff4e3',stripe:'#3b2a22',whisk:1},
  deer:{e:'🦌',n:'순록',fur:'#b0764a',lt:'#f2dcbd',ear:'tri',tail:'stub',in:'#f2dcbd',nose:'#d8322f',foot:'#6b4a33',leg:'#8a5b39'}});
function girl(h,c){const H=h.head,J=h.J;
  const b=new THREE.Group();b.position.set(.2,.86,.06);b.rotation.z=-.35;H.add(b);sphere(b,0,0,0,.06,c.ribbon,1);for(const sx of [-1,1]){const w=mesh(new THREE.ConeGeometry(.1,.2,8),c.ribbon,b);w.position.x=sx*.11;w.rotation.z=sx*Math.PI/2}
  for(const sx of [-1,1])for(const k of [0,1]){const l=box(H,sx*(.22+k*.035),.545+k*.012,.43,.05,.014,.012,'#2e2a2a');l.rotation.z=sx*(.35+k*.35)}
  const sk=mesh(new THREE.CylinderGeometry(.24,.4,.3,18,1,true),new THREE.MeshStandardMaterial({color:c.skirt,roughness:.7,side:THREE.DoubleSide}),J.hips);sk.position.y=-.03;
  const hem=mesh(new THREE.TorusGeometry(.4,.025,6,24),c.hem||'#ffffff',J.hips);hem.position.y=-.18;hem.rotation.x=Math.PI/2}
function boy(h,c){const S=h.spine;box(S,0,.44,.3,.08,.2,.03,c.tie);box(S,0,.56,.29,.1,.06,.035,c.tie)}
function decoSpeetto(h){girl(h,{ribbon:'#f06c8f',skirt:'#ffd76a'});const H=h.head;beam(H,[0,.86,0],[0,1.02,0],.02,'#5d9b4f');for(const sx of [-1,1]){const l=sphere(H,sx*.09,1.04,0,.07,'#7cc36a',1);l.scale.set(1.3,.5,.8);l.rotation.z=sx*.4}}
function decoTvirus(h){girl(h,{ribbon:'#c0142f',skirt:'#5b4a8a',hem:'#c0142f'});sphere(h.spine,-.18,.42,.28,.05,'#c0142f',1)}
function decoWinter(h){girl(h,{ribbon:'#7fb2d9',skirt:'#3f5f8f',hem:'#e8f3fb'});const H=h.head;for(let k=0;k<6;k++){const a=k/6*Math.PI,m=box(H,-.24,.8,.1,.16,.02,.02,'#dff1ff');m.rotation.set(0,.3,a)}}
function decoWonjo(h){boy(h,{tie:'#b8473b'})}
function decoSanta(h){boy(h,{tie:'#2f7a4a'});const H=h.head,g=new THREE.Group();g.position.set(0,.8,0);g.rotation.set(-.15,0,-.25);H.add(g);
  const c=mesh(new THREE.ConeGeometry(.36,.62,16),'#d8322f',g);c.position.y=.26;const r=mesh(new THREE.TorusGeometry(.36,.07,8,20),'#ffffff',g);r.rotation.x=Math.PI/2;sphere(g,0,.6,0,.08,'#ffffff',1);
  for(const sx of [-1,1]){const a=new THREE.Group();a.position.set(sx*.3,.72,-.05);a.rotation.z=-sx*.5;H.add(a);beam(a,[0,0,0],[0,.36,0],.025,'#7a5534');beam(a,[0,.18,0],[sx*.12,.3,0],.02,'#7a5534');beam(a,[0,.3,0],[sx*.1,.42,0],.02,'#7a5534')}}
const extra2=[
  {name:'스피또꿈나무',kind:'엽서',animal:'hamster',role:'행운의 복권 꿈나무',look:{shirt:'#fff1d6',bag:'#f06c8f',cards:1},deco:decoSpeetto,greet:['긁어 볼까?','꿈은 크게!','행운 가득~','대박 기원!']},
  {name:'티바이러스',kind:'책',animal:'blackcat',role:'바이오 연구원',look:{shirt:'#f4f6f8',glasses:1,propC:'#3c8d8a'},deco:decoTvirus,greet:['실험 중!','손 씻어요~','흐흥','연구 완료!']},
  {name:'윈터드림',kind:'꽃',animal:'polar',role:'겨울 동화 작가',look:{shirt:'#dcecf8',scarf:'#7fb2d9'},deco:decoWinter,greet:['눈 올까?','포근포근','꿈꾸는 중','겨울 좋아!']},
  {name:'원조익평',kind:'신문',animal:'tiger',role:'원조 투자 고수',look:{shirt:'#3f4a5c',hat:'fedora',hatC:'#5a4636'},deco:decoWonjo,greet:['어흥!','원조는 나','길게 보자','수익 내자!']},
  {name:'산타우찬이',kind:'산책',animal:'deer',role:'산타 선물 배달부',look:{shirt:'#d8322f',bag:'#8a5b39'},deco:decoSanta,greet:['호호호!','선물이요~','메리 크리스마스!','착한 어린이?']}];
extra2.forEach((s,k)=>{Object.assign(s,{baseX:0,baseZ:6,shirt:s.look.shirt||'#ffffff',phase:(12+k)*1.71,speed:.19+(k%3)*.03});try{const n=makeNpc(s);n.greet=s.greet;n.root.visible=!prefs.light;if(n.shadow&&n.shadow.material)n.shadow.material.opacity=FX.level>=1?.32:.15}catch(e){console.error(e)}});

/* ── 섬 전체로 고루 — 길마다 안쪽 절반 · 바깥쪽 절반 ── */
Object.assign(NPC_LANES,{'포롱이':['부동산',.08,.42],'조만간은퇴님':['부동산',.6,.97],'오키오키님':['예금',.08,.42],'아울러님':['예금',.6,.97],
  '료멘스쿠나':['증권',.08,.42],'롱베이케이션님':['증권',.6,.97],'해의호흡님':['장기',.08,.42],'우울라프님':['장기',.6,.97],
  '편안하게님':['부채',.08,.42],'까미유데물랭님':['부채',.6,.97],'굿플렉티스님':['north',.12,.42],'겸손히님':['north',.55,.85],
  '스피또꿈나무':['부동산',.44,.58],'티바이러스':['예금',.44,.58],'윈터드림':['증권',.44,.58],'원조익평':['장기',.44,.58],'산타우찬이':['부채',.44,.58]});
function spread(){refreshNpcLanes();npcGroups.forEach(n=>{if(n.run){const m=n.run.pts[Math.floor(n.run.pts.length*((n.phase||0)%1))]||n.run.pts[n.run.pts.length>>1];n.baseX=m.x;n.baseZ=m.z}else{const w=nearestWalkable(n.baseX,n.baseZ);if(w){n.baseX=w.x;n.baseZ=w.z}}})}
spread();

/* ── 만나면: 게임 도움말 또는 주식 격언 (네이버 뉴스 없음) ── */
const josa=w=>{const c=w.charCodeAt(w.length-1)-0xAC00;return c>=0&&c<11172&&c%28?'이':'가'};
let talkN=0;
openNewsForNpc=function(npc){if(!npc)return;newsOpenNpc=npc;talkN++;const L=window.dpTalkLine?dpTalkLine():{kind:'🎮 게임 도움말',text:'F 로 낚시하고, 💎 를 모아 보세요!',who:''},proverb=L.kind.includes('격언'),e=(ANIMALS[npc.animal]||{}).e||'';try{sfx('news')}catch{}
  $('#newsEyebrow').textContent=proverb?'STOCK PROVERB · 주식 격언':'VILLAGE TIP · 게임 도움말';
  $('#newsTitle').textContent=`${e} ${npc.name}${josa(npc.name)} ${proverb?'들려주는 주식 격언':'알려 주는 놀이 팁'}`;
  $('#newsStatus').textContent=npc.role||'';
  $('#newsList').innerHTML=`<div class="news-card mine"><b>${esc(proverb?L.text:L.kind.replace(/^🎮 게임 도움말 · /,''))}</b><p>${esc(proverb?'':L.text)}</p>${L.who?`<span class="tk-by">${esc(L.who)}</span>`:''}</div>`;
  if(!proverb)$('#newsList').querySelector('p').textContent=L.text;else $('#newsList').querySelector('p').remove();
  const r=$('#newsRefresh');if(r){r.hidden=false;r.textContent='고마워요 👋'}
  const d=$('#newsDialog');if(d&&!d.open)d.showModal();if(npc.greet)emote(npc,npc.greet[talkN%npc.greet.length])};
renderNewsList=function(){};renderAllNews=function(){};renderNpcNews=function(){};setNewsKind=function(){};fetchNewsLatest=async function(){};fetchNews=async function(){};
{const r=$('#newsRefresh');if(r){r.onclick=()=>closeNewsDialog();r.textContent='고마워요 👋'}}
// 같은 주민은 1분에 한 번만 말을 건다 (길을 걷는 주민이 많아져서). 러시 · 낚시 · 요트 · 주인공 고르기 중에는 조용히
const _meet=checkNpcMeet;checkNpcMeet=function(){if(window.dpYachtOn||document.getElementById('heroPick')?.classList.contains('on'))return;const now=performance.now(),far=[];npcGroups.forEach(n=>{if(n.metAt>now){far.push([n,n.root.position.x]);n.root.position.x+=1e5}});
  const before=newsCooldown;try{_meet()}finally{far.forEach(([n,x])=>n.root.position.x=x)}if(newsCooldown!==before&&newsOpenNpc){newsOpenNpc.metAt=now+60000;newsCooldown=now+15000}};
// 손 흔들기(H)와 인사에 주민마다 자기 말투
npcGroups.forEach(n=>{if(!n.greet)n.greet={'겸손히님':['커피?','어서 와!','따뜻해~'],'굿플렉티스님':['멍멍!','산책 중!'],'우울라프님':['찰칵!','김치~'],'조만간은퇴님':['신문이요','좋은 아침']}[n.name]||null});
const _gn=greetNpcs,pre=[];greetNpcs=function(){npcGroups.forEach((n,i)=>pre[i]=n.greetAt);_gn();npcGroups.forEach((n,i)=>{if(n.greetAt!==pre[i]&&n.greet)setTimeout(()=>emote(n,n.greet[((n.newsIndex||0)+(talkN|0)+i)%n.greet.length]),450)})};
window.dpNpcDebug=()=>npcGroups.map(n=>({name:n.name,x:Math.round(n.root.position.x),z:Math.round(n.root.position.z),lane:NPC_LANES[n.name]?NPC_LANES[n.name][0]:null,run:!!n.run}));
})();
