/* ═══════ 주민 — 섬 전체로 고루, 새 주민 료멘스쿠나 · 포롱이, 만나면 게임 도움말 또는 주식 격언 ═══════
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

/* ── 섬 전체로 고루 — 길마다 안쪽 절반 · 바깥쪽 절반 ── */
Object.assign(NPC_LANES,{'포롱이':['부동산',.08,.42],'조만간은퇴님':['부동산',.6,.97],'오키오키님':['예금',.08,.42],'아울러님':['예금',.6,.97],
  '료멘스쿠나':['증권',.08,.42],'롱베이케이션님':['증권',.6,.97],'해의호흡님':['장기',.08,.42],'우울라프님':['장기',.6,.97],
  '편안하게님':['부채',.08,.42],'까미유데물랭님':['부채',.6,.97],'굿플렉티스님':['north',.12,.42],'겸손히님':['north',.55,.85]});
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
