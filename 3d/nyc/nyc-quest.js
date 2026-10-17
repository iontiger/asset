/* 뉴욕 거리 산책(3d/nyc)의 여권 · 심부름 · 마을 보상.
   - 뉴욕 여권: 명소 10곳(타임스스퀘어 포함)에 가면 도장이 쾅 찍히고 그때의 계절 · 시각을 적는다. 다 모으면 마을 집 앞에 자유의 여신상 미니어처(3d/src/nyc.js).
   - 마을 친구 심부름: 맨해튼 보도를 걷는 마을 친구 9명이 부탁을 한다(머리 위 ❗). 간식은 사서 갖다 주고, 사진 · 동전 · 페리는 하면 바로 끝난다.
     모두 끝내면 NY 모자(뉴욕에서도 마을에서도 쓴다, 여권에서 켜고 끈다).
   - 기록: localStorage asset-nyc-passport-v1 (도장 · 심부름 · 모자 켜기), 마을이 읽는 보상 asset-village-3d-nyc {liberty, cap, capOn, stamps, errands, stampTotal, errandTotal}
   make({T,scene,pois,npcs,toast,sound,onTeleport,onFind,onCap,heldKind,takeHeld}) → {stamp, bought, photo, coin, liberty, talk, nearNpc, update, ...} */
(function(root){
const KEY='asset-nyc-passport-v1',VKEY='asset-village-3d-nyc',OLD='asset-nyc-walk-v1';
const FRIENDS={'겸손히님':['🐱','카페 바리스타'],'아울러님':['🐑','꽃집 주인'],'롱베이케이션님':['🐧','경제 신문 기자'],'편안하게님':['🦉','도서관 사서'],'굿플렉티스님':['🐶','산책 대장'],'우울라프님':['🦝','사진사'],
 '까미유데물랭님':['🦊','엽서 배달부'],'해의호흡님':['🐿️','동네 시인'],'조만간은퇴님':['🐻','신문 배달부'],'오키오키님':['🐰','책방 주인'],'료멘스쿠나':['👹','장난꾸러기 방랑자'],'포롱이':['🎀','마을 마스코트'],
 '스피또꿈나무':['🐹','행운의 복권 꿈나무'],'티바이러스':['🐈‍⬛','바이오 연구원'],'윈터드림':['🐻‍❄️','겨울 동화 작가'],'원조익평':['🐯','원조 투자 고수'],'산타우찬이':['🦌','산타 선물 배달부'],'클라라':['🩰','호두까기 인형 발레리나']};
const ERRANDS=[
 {id:'pretzel',who:'겸손히님',ic:'🥨',todo:'소금 프레첼 사다 주기',ask:'커피랑 먹을 소금 프레첼 하나만 사다 줄래요? 볼링 그린 옆 파란 카트에 있어요.',thanks:'고소해요! 커피랑 딱이에요.',buy:['pretzel']},
 {id:'hotdog',who:'굿플렉티스님',ic:'🌭',todo:'핫도그 사다 주기',ask:'산책하다 배고파요! 배터리 파크 빨간 카트에서 핫도그 하나 부탁해요.',thanks:'멍멍! 머스터드 듬뿍, 최고예요!',buy:['hotdog']},
 {id:'treat',who:'오키오키님',ic:'🍦',todo:'브루클린 공원 카트 간식 사다 주기',ask:'브루클린 브릿지 파크 카트 간식이 그렇게 맛있대요. 하나 사다 줄래요?',thanks:'책 읽으면서 아껴 먹을게요!',buy:['icecream','nuts']},
 {id:'bridge',who:'롱베이케이션님',ic:'📸',todo:'브루클린 브릿지 위에서 사진 찍기',ask:'신문 1면에 브루클린 브릿지 사진을 싣고 싶어요. 다리 위에서 📷 한 장 찍어 줘요!',thanks:'1면 사진 확정! 내일 신문에 나와요.',photo:'bridge'},
 {id:'dumbo',who:'우울라프님',ic:'🌉',todo:'덤보에서 맨해튼 브릿지 사진 찍기',ask:'덤보 워싱턴 스트리트에서 맨해튼 브릿지가 보이는 그 사진, 📷 찍어 와 줄래요?',thanks:'찰칵! 이 구도 정말 좋아요.',photo:'dumbo'},
 {id:'busker',who:'해의호흡님',ic:'🎷',todo:'덤보 색소폰 버스커에게 동전 넣기',ask:'덤보 색소폰 아저씨 연주를 들으면 시가 떠오를 것 같아요. 제 대신 동전 하나 넣어 줄래요?',thanks:'재즈 한 소절에 시 한 줄. 고마워요.',coin:true},
 {id:'liberty',who:'윈터드림',ic:'⛴',todo:'페리 타고 자유의 여신상 보기',ask:'겨울 동화에 자유의 여신상을 넣고 싶어요. 배터리 파크 선착장에서 페리 타고 가까이 보고 와 줄래요?',thanks:'횃불이 반짝이는 장면, 동화에 꼭 넣을게요!',liberty:true},
 {id:'halal',who:'원조익평',ic:'🍗',todo:'타임스스퀘어 할랄 카트 치킨 오버 라이스 사다 주기',ask:'뉴욕 길거리 음식의 원조는 할랄 카트래요! 타임스스퀘어 7번가 노란 카트에서 치킨 오버 라이스 하나 사다 줄래요? 🚇 지하철 타고 가요.',thanks:'이 맛이 바로 원조! 하얀 소스가 신의 한 수예요.',buy:['halal']},
 {id:'ts',who:'포롱이',ic:'🎭',todo:'타임스스퀘어에서 사진 찍기',ask:'포롱! 타임스스퀘어 전광판 보고 싶어! 🚇 지하철 타고 가서 📷 사진 찍어 와 줘!',thanks:'포롱포롱! 반짝반짝 전광판이다!',photo:'ts'}];
const CHAT=['뉴욕 정말 넓죠? 천천히 구경해요!','저도 마을에서 놀러 왔어요. 다리 건너 덤보 가 봤어요?','여기 핫도그 진짜 맛있어요.','밤이 되면 브루클린 브릿지에 불이 켜져요!','지하철 입구 초록 등 보이죠? 타임스스퀘어까지 금방이에요.','여름밤엔 강 위로 불꽃놀이가 터진대요.'];
const SNACK={hotdog:'🌭 핫도그',pretzel:'🥨 프레첼',icecream:'🍦 아이스크림',nuts:'🥜 꿀땅콩',halal:'🍗 치킨 오버 라이스'};
function make({T,scene,pois,npcs,toast,sound,onTeleport,onFind,onCap,heldKind,takeHeld}){
 const $=id=>document.getElementById(id);
 let S={stamps:{},errands:{},capOn:true,cap:false,liberty:false};
 try{Object.assign(S,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){}
 try{for(const id of JSON.parse(localStorage.getItem(OLD)||'[]'))if(!S.stamps[id])S.stamps[id]={old:true}}catch(e){}
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}try{localStorage.setItem(VKEY,JSON.stringify({liberty:S.liberty,cap:S.cap,capOn:S.capOn,stamps:nStamp(),errands:nDone(),stampTotal:pois.length,errandTotal:ERRANDS.length,t:Date.now()}))}catch(e){}};
 const nStamp=()=>pois.filter(p=>S.stamps[p.id]).length,nDone=()=>ERRANDS.filter(e=>S.errands[e.id]==='done').length;
 const chime=f=>{try{sound&&sound.chime&&sound.chime(f)}catch(e){}};
 function thump(){if(!sound||!sound.ctx||sound.muted)return;try{const a=sound.ctx,t=a.currentTime,o=a.createOscillator(),gn=a.createGain();o.type='sine';o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(48,t+.18);gn.gain.setValueAtTime(.5,t);gn.gain.exponentialRampToValueAtTime(.001,t+.25);o.connect(gn);gn.connect(sound.master);o.start(t);o.stop(t+.26)}catch(e){}}
 const when=s=>s&&!s.old?`${s.icon||''} ${s.season} · ${s.clock}`:'예전에 다녀감';

 /* ── 여권 (왼쪽 패널) ── */
 const grid=$('spot-list'),elist=$('errand-list');
 function drawStamps(){grid.innerHTML='';for(const p of pois){const s=S.stamps[p.id],li=document.createElement('li');li.className='stamp'+(s?' done':'');li.dataset.id=p.id;
   li.innerHTML=`<button type="button" title="${p.name} · 가기"><span class="ring"><span class="ic">${p.icon}</span></span><span class="nm">${p.name}</span><small>${s?when(s):'아직 안 찍었어요'}</small></button>`;li.querySelector('button').onclick=()=>onTeleport(p.id);grid.appendChild(li)}
  $('spots-count').textContent=`도장 ${nStamp()} / ${pois.length} · 심부름 ${nDone()} / ${ERRANDS.length}`;drawReward()}
 function drawErrands(){elist.innerHTML='';for(const e of ERRANDS){const st=S.errands[e.id]||'new',[fe]=FRIENDS[e.who]||['🙂'],li=document.createElement('li');li.className='er '+st;
   const tag=st==='done'?'<i>끝!</i>':st==='taken'?'<i class="go">하는 중</i>':'<i class="ask">부탁 ❗</i>';
   li.innerHTML=`<span class="fc">${fe}</span><span class="tx"><b>${e.who}</b><small>${e.ic} ${st==='new'?'말을 걸면 부탁해요':e.todo}</small></span>${tag}`;
   if(st!=='done'){li.title=e.who+' 찾아가기';li.onclick=()=>onFind(e.who)}elist.appendChild(li)}
  $('er-count').textContent=`${nDone()}/${ERRANDS.length}`;drawReward()}
 function drawReward(){const r=$('pp-reward');if(!r)return;const a=nStamp()>=pois.length,b=nDone()>=ERRANDS.length;
  r.innerHTML=`<span class="${a?'got':''}">🗽 ${a?'마을 집 앞에 여신상 미니어처가 생겼어요':`도장 ${pois.length}개 → 마을 집에 자유의 여신상`}</span><span class="${b?'got':''}">🧢 ${b?`NY 모자 <button type="button" id="cap-tg">${S.capOn?'쓰는 중':'벗음'}</button>`:`심부름 ${ERRANDS.length}개 → NY 모자`}</span>`;
  const tg=$('cap-tg');if(tg)tg.onclick=()=>{S.capOn=!S.capOn;save();drawReward();onCap(S.cap&&S.capOn)}}
 for(const b of document.querySelectorAll('.pp-tabs button'))b.onclick=()=>{for(const o of document.querySelectorAll('.pp-tabs button'))o.classList.toggle('on',o===b);const er=b.dataset.tab==='errands';grid.hidden=er;elist.hidden=!er};

 /* ── 도장 쾅 ── */
 const fx=$('stamp-fx');let fxT=null;
 function stamp(p,E){if(S.stamps[p.id]&&!S.stamps[p.id].old)return false;S.stamps[p.id]={season:E.seasonName,icon:E.dark>.5?'🌙':E.icon,clock:root.CITY_ENV?root.CITY_ENV.clock(E.hour):'',d:Date.now()};save();
  fx.querySelector('.sf-ic').textContent=p.icon;fx.querySelector('.sf-nm').textContent=p.name;fx.querySelector('.sf-when').textContent=when(S.stamps[p.id]);
  fx.classList.remove('go');void fx.offsetWidth;fx.classList.add('go');clearTimeout(fxT);fxT=setTimeout(()=>fx.classList.remove('go'),2600);setTimeout(thump,260);setTimeout(()=>chime(880),420);
  drawStamps();const li=grid.querySelector(`[data-id="${p.id}"]`);if(li){li.classList.add('new');setTimeout(()=>li.classList.remove('new'),2400)}
  if(nStamp()>=pois.length&&!S.liberty){S.liberty=true;save();drawReward();setTimeout(()=>{toast('<b>🗽 뉴욕 여권 완성!</b>마을 집 앞에 자유의 여신상 미니어처가 생겼어요',6.5);[784,988,1175,1568].forEach((f,i)=>setTimeout(()=>chime(f),i*120))},2700)}
  return true}

 /* ── 심부름 친구 머리 위 표시 ── */
 const markTex=(txt,bg)=>{const cv=document.createElement('canvas');cv.width=cv.height=96;const x=cv.getContext('2d');x.fillStyle=bg;x.beginPath();x.arc(48,44,36,0,7);x.fill();x.beginPath();x.moveTo(36,74);x.lineTo(60,74);x.lineTo(48,92);x.fill();x.font='800 46px "Noto Sans KR",sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fff';x.fillText(txt,48,46);const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;return t};
 const MT={ask:markTex('!','#e9a23b'),give:markTex('🎁','#22675e')};
 const marks=[];
 for(const e of ERRANDS){const n=npcs&&npcs.find(q=>q.name===e.who);if(!n)continue;const s=new T.Sprite(new T.SpriteMaterial({map:MT.ask,transparent:true,depthWrite:false,fog:false,toneMapped:false}));s.scale.setScalar(1.3);s.renderOrder=6;s.visible=false;scene.add(s);marks.push({e,n,s})}
 function want(e,kind){return e.buy&&e.buy.includes(kind)}
 function update(time,me,off){for(const m of marks){const st=S.errands[m.e.id];const show=!off&&st!=='done'&&m.n.o.visible&&m.e.who!==tkOpen&&(st!=='taken'||(m.e.buy&&want(m.e,heldKind())));m.s.visible=show;if(!show)continue;
   m.s.material.map=st==='taken'?MT.give:MT.ask;m.s.position.copy(m.n.o.position);m.s.position.y+=5.4+Math.sin(time*3+m.n.ph)*.15;const d=me?m.s.position.distanceTo(me):50;m.s.scale.setScalar(Math.max(1.1,Math.min(3.2,d/16)))}}

 /* ── 말 걸기 (아래 가운데 대화 카드) ── */
 const tk=$('talk');let tkOpen=null;
 function closeTalk(){tk.hidden=true;tkOpen=null;document.body.classList.remove('talking')}
 function show(name,text,btns){const [fe,role]=FRIENDS[name]||['🙂',''];$('tk-face').textContent=fe;$('tk-name').textContent=name;$('tk-role').textContent=role;$('tk-text').innerHTML=text;const b=$('tk-btns');b.innerHTML='';
  for(const [label,fn,cls] of btns){const x=document.createElement('button');x.type='button';x.textContent=label;if(cls)x.className=cls;x.onclick=()=>{fn&&fn();};b.appendChild(x)}tk.hidden=false;tkOpen=name;document.body.classList.add('talking');chime(660)}
 function finish(e,how){S.errands[e.id]='done';save();drawErrands();drawStamps();[659,880,1175].forEach((f,i)=>setTimeout(()=>chime(f),i*110));
  const left=ERRANDS.length-nDone();toast(`<b>${e.ic} ${e.who} 심부름 끝!</b>${how?how+' · ':''}“${e.thanks}”${left?` · 남은 심부름 ${left}개`:''}`,5);
  if(!left&&!S.cap){S.cap=true;S.capOn=true;save();drawReward();onCap(true);setTimeout(()=>toast('<b>🧢 NY 모자를 받았어요!</b>마을 친구 8명의 심부름을 모두 했어요 · 마을에서도 써요 (여권에서 켜고 끌 수 있어요)',7),2200)}}
 function talk(n){const name=n.name,e=ERRANDS.find(q=>q.who===name),st=e?S.errands[e.id]||'new':null;
  if(!e||st==='done'){show(name,e?`“${e.thanks}” 덕분에 뉴욕이 더 좋아졌어요!`:CHAT[(name.length+Math.floor(Date.now()/9e4))%CHAT.length],[['👋 또 봐요',closeTalk,'main']]);return}
  if(st==='new'){show(name,e.ask,[['좋아요!',()=>{S.errands[e.id]='taken';save();drawErrands();closeTalk();toast(`<b>📜 심부름 · ${e.ic} ${e.todo}</b>여권의 ‘심부름’ 칸에 적어 뒀어요`,4)},'main'],['다음에',closeTalk]]);return}
  if(e.buy){const k=heldKind();if(want(e,k)){show(name,`앗, ${SNACK[k]}! 정말 사 왔네요!`,[['🎁 건네주기',()=>{takeHeld();closeTalk();finish(e,`${SNACK[k]} 전달`)},'main']]);return}
   show(name,`${e.todo.replace(' 사다 주기','')} 기다리고 있을게요! ${e.buy.map(b=>SNACK[b]).join(' · ')} 를 사서 손에 들고 와 줘요.`,[['알았어요',closeTalk,'main']]);return}
  show(name,`부탁한 거 기억하죠? ${e.ic} ${e.todo}!`,[['알았어요',closeTalk,'main']])}
 // 사진 · 동전 · 페리 — 하는 중인 심부름이 있으면 바로 끝낸다
 function event(test,how){for(const e of ERRANDS)if(S.errands[e.id]==='taken'&&test(e)){finish(e,how);return true}return false}
 function bought(kind){return ERRANDS.some(e=>S.errands[e.id]==='taken'&&want(e,kind))}
 function photo(place){return place?event(e=>e.photo===place,'📸 사진을 보냈어요'):false}
 function coin(){return event(e=>e.coin,'🪙 동전을 넣었어요')}
 function liberty(){return event(e=>e.liberty,'⛴ 여신상을 보고 왔어요')}
 drawStamps();drawErrands();save();
 return {stamp,talk,closeTalk,get talking(){return tkOpen},bought,photo,coin,liberty,update,drawStamps,FRIENDS,ERRANDS,
  get capOn(){return S.cap&&S.capOn},get state(){return S},stamped:id=>!!S.stamps[id],errandOf:name=>ERRANDS.find(e=>e.who===name)}}
root.NYC_QUEST={make,ERRANDS,FRIENDS};
})(window);
