/* ═══════ 자산마을 3D · 미니게임 에디션 ═══════
   자산 금액 · 기록 · 목표 화면은 모두 숨기고, 마을을 걸으며 노는 것만 남긴다.
   - 숨은 다이아몬드 10개 (원래 9개 + 목표봉 정상 아래) + 다이아 러시 (60초 동안 주변에 나타나는 다이아 모으기)
   - 낚시: 찌가 흔들릴 때 F → 릴 감기 (누르고 있으면 초록 칸이 오른쪽으로, 떼면 왼쪽으로). 물고기를 칸 안에 잡아 두면 게이지가 찬다
   - 낚시 도감: 호수 · 개울 물고기별 마릿수와 최고 크기
   조작: PC 는 방향키/WASD · Shift 달리기 · F 놀기 · Space 점프 · B 자전거, 모바일은 화면 아래 버튼 */
'use strict';
(function(){
const G_KEY='asset-village-3d-game';
let G={rushBest:0,rushPlays:0,dex:{}};try{Object.assign(G,JSON.parse(localStorage.getItem(G_KEY)||'null')||{})}catch{}
function gSave(){try{localStorage.setItem(G_KEY,JSON.stringify(G))}catch{}}
const beep=(f,d=0,l=.1,w='triangle',v=.04)=>{try{if(playLoud())tone(f,d,l,w,v)}catch{}};

/* ── 자산 화면 대신: 구역에 가면 인사만, 자산 상세는 열지 않는다 ── */
enterSection=function(key){const c=categories.find(c=>c.key===key);autoSuppressed=key;toast('📍 '+(c?.name||key)+'에 왔어요'+(key==='장기'?' · 부두 끝에서 F 를 누르면 낚시해요':''));if(cameraMode!=='walking'&&cameraMode!=='entering')beginWalk()};
showAsset=function(){};showCategory=function(){};
villageFacts=function(){const tips=[['다이아 러시','💎 러시를 시작하면 60초 동안 주변에 다이아가 나타나요. 자전거(B)를 타면 더 빨리 모아요!'],['낚시 팁','찌가 흔들리면 F! 그다음엔 꾹 눌러 초록 칸으로 물고기를 따라가요.'],['숨은 보물','섬 구석 · 언덕 꼭대기 · 숲속에 다이아몬드 10개가 숨어 있대요.'],['황금 잉어','호수 부두에서 아주 가끔 황금 잉어가 잡힌대요.'],['개울 물고기','개울가와 다리 위에서는 호수와 다른 물고기가 잡혀요.']];return {due:null,list:[tips[Math.floor(Math.random()*tips.length)]]}};

/* ── 미니게임판 ── */
const hud=document.createElement('aside');hud.id='gameHud';hud.className='panel';
hud.innerHTML=`<div class="gh-head"><b>🎮 미니게임</b><button class="gh-fold" id="ghFold" aria-expanded="true">접기 ▴</button></div><div class="gh-date" id="ghDate" title="15초마다 한 달"></div><div class="gh-datebar"><i id="ghDateBar"></i></div><div class="gh-body">
<div class="gh-row"><span><b>⚡ 다이아 러시</b><small id="ghRush">60초 동안 다이아 모으기</small></span><button class="gh-btn" id="ghRushBtn">시작</button></div>
<div class="gh-row"><span><b>🎣 낚시</b><small id="ghFish">도감 0 / 0</small></span><span style="flex-direction:row;gap:6px"><button class="gh-btn soft" id="ghDexBtn">도감</button><button class="gh-btn" id="ghPierBtn">낚시터로</button></span></div>
<div class="gh-row"><span><b>💎 숨은 다이아몬드</b><small id="ghGems">0 / 10</small></span><button class="gh-btn soft" id="ghGemBtn">힌트</button></div>
<div class="gh-row"><span><b>👤 주인공</b><small id="ghHero">남 · 여 중 한 명</small></span><button class="gh-btn soft" id="ghHeroBtn">바꾸기</button></div>
<p class="gh-tip" id="ghTip"></p></div>`;
document.body.appendChild(hud);
const touch=matchMedia('(hover:none)').matches;
$('#ghTip').textContent=touch?'아래 버튼으로 걷고, 가운데 알림을 누르면 낚시 · 놀기를 해요.':'방향키/WASD 걷기 · Shift 달리기 · F 놀기 · Space 점프 · B 자전거';
function fold(v){hud.classList.toggle('folded',v);$('#ghFold').textContent=v?'펼치기 ▾':'접기 ▴';$('#ghFold').setAttribute('aria-expanded',String(!v))}
$('#ghFold').onclick=()=>fold(!hud.classList.contains('folded'));if(innerWidth<=760)fold(true);
$('#ghRushBtn').onclick=()=>RUSH.on?endRush(false):startRush();
$('#ghDexBtn').onclick=()=>openDex();
$('#ghHeroBtn').onclick=()=>window.dpPickHero&&dpPickHero();
$('#ghGemBtn').onclick=()=>toggleGemPanel($('#gemPanel').hidden);
$('#ghPierBtn').onclick=()=>{if(PLAY.mode)endPlay();const o=objects.find(o=>categoryOf(o.asset)==='장기'&&!o.alias);if(o){beginWalk(true);travelTo(o.approach,{type:'category',name:'장기'})}};
const _rg=renderGems;renderGems=function(){_rg();$('#ghGems').textContent=gemFound.size+' / '+gems.length+(gemFound.size>=gems.length?' · 모두 찾았어요!':'')};
function allFish(){const seen=new Set(),out=[];[['lake','호수'],['stream','개울']].forEach(([k,w])=>FISH[k].forEach(f=>{if(!f[1]||seen.has(f[0]))return;seen.add(f[0]);out.push({name:f[0],color:f[3],where:w,min:f[1],max:f[2],w:f[4]})}));return out}
function hudText(){const all=allFish(),got=all.filter(f=>G.dex[f.name]).length;$('#ghFish').textContent=`도감 ${got} / ${all.length} · 지금까지 ${fishLog.n||0}마리`;$('#ghRush').textContent=RUSH.on?'진행 중 — 다시 누르면 그만둬요':G.rushBest?`최고 기록 ${G.rushBest}개`:'60초 동안 다이아 모으기';$('#ghRushBtn').textContent=RUSH.on?'그만':'시작'}

/* ── 창 (결과 · 도감) ── */
const modal=document.createElement('div');modal.className='game-modal';modal.innerHTML='<div class="gm-card" role="dialog" aria-modal="true"></div>';document.body.appendChild(modal);
function showModal(html){modal.firstChild.innerHTML=html;modal.classList.add('on');modal.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>{const a=b.dataset.act;closeModal();if(a==='rush')startRush()})}
function closeModal(){modal.classList.remove('on')}
modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});
addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('on')){closeModal();e.preventDefault();e.stopImmediatePropagation()}},true);
function openDex(){const all=allFish(),got=all.filter(f=>G.dex[f.name]).length;showModal(`<div class="eyebrow">FISH BOOK</div><h2>🎣 낚시 도감 ${got} / ${all.length}</h2><p>호수 부두 · 개울가 · 다리 위에서 낚시해요. 지금까지 ${fishLog.n||0}마리${fishLog.best?` · 최고 ${esc(fishLog.best.name)} ${fishLog.best.cm}cm`:''}</p><div class="dex-grid">${all.map(f=>{const d=G.dex[f.name];return d?`<div><b><i style="background:${f.color}"></i>${esc(f.name)}</b>${f.where} · ${d.n}마리<br>최고 ${d.best}cm</div>`:`<div class="unknown"><b>???</b>${f.where}에 살아요</div>`}).join('')}</div><div class="gm-actions"><button class="primary" data-act="close">닫기</button></div>`)}

/* ── 다이아 러시 ── */
const RUSH={on:false,t:0,score:0,gems:[],dur:60,alive:10};
const bar=document.createElement('div');bar.id='rushBar';bar.innerHTML='<span class="rb-time" id="rbTime">60</span><span class="rb-score">💎 <b id="rbScore">0</b></span><span class="rb-arrow" id="rbArrow">↑</span><span class="rb-dist" id="rbDist"></span>';document.body.appendChild(bar);
const gemGeo=new THREE.OctahedronGeometry(.42,0),beamGeo=new THREE.CylinderGeometry(.07,.07,9,6,1,true);
const gemMats={blue:new THREE.MeshStandardMaterial({color:'#8fe8ff',emissive:'#2aa9d6',emissiveIntensity:.9,roughness:.15,metalness:.2}),gold:new THREE.MeshStandardMaterial({color:'#ffe07a',emissive:'#d99a00',emissiveIntensity:1,roughness:.15,metalness:.4})};
const beamMats={blue:new THREE.MeshBasicMaterial({color:'#8fe8ff',transparent:true,opacity:.28,depthWrite:false,blending:THREE.AdditiveBlending}),gold:new THREE.MeshBasicMaterial({color:'#ffd35a',transparent:true,opacity:.34,depthWrite:false,blending:THREE.AdditiveBlending})};
function spawnGem(){for(let i=0;i<40;i++){const a=Math.random()*Math.PI*2,r=7+Math.random()*26,x=player.x+Math.cos(a)*r,z=player.z+Math.sin(a)*r;if(!walkable(x,z))continue;if(RUSH.gems.some(g=>Math.hypot(g.x-x,g.z-z)<4))continue;const kind=Math.random()<.14?'gold':'blue',g=new THREE.Group(),m=new THREE.Mesh(gemGeo,gemMats[kind]);m.scale.set(1,1.45,1);m.castShadow=false;g.add(m);const b=new THREE.Mesh(beamGeo,beamMats[kind]);b.position.y=4.3;b.userData.noAO=true;g.add(b);const y=terrainHeight(x,z);g.position.set(x,y,z);g.userData.world=true;scene.add(g);RUSH.gems.push({g,m,x,z,y,kind,ph:Math.random()*6,t:-1});return true}return false}
function clearRush(){RUSH.gems.forEach(o=>scene.remove(o.g));RUSH.gems=[]}
function startRush(){closeModal();if(PLAY.mode)endPlay();toggleGemPanel(false);clearRush();beginWalk(true);route=[];target=null;drawRoute();RUSH.on=true;RUSH.t=RUSH.dur;RUSH.score=0;for(let i=0;i<RUSH.alive;i++)spawnGem();bar.classList.add('on');$('#rbScore').textContent='0';toast('⚡ 다이아 러시 시작! 빛기둥을 따라 다이아에 닿으면 모아요');[523,659,784].forEach((n,i)=>beep(n,i*.1,.12));hudText()}
function endRush(done){if(!RUSH.on)return;RUSH.on=false;bar.classList.remove('on');clearRush();hudText();if(!done){toast('다이아 러시를 그만뒀어요');return}
  G.rushPlays=(G.rushPlays||0)+1;const best=RUSH.score>(G.rushBest||0);if(best)G.rushBest=RUSH.score;gSave();hudText();if(best&&RUSH.score>0)celebrate();[784,659,988,1319].forEach((n,i)=>beep(n,i*.12,.18));
  showModal(`<div class="eyebrow">DIAMOND RUSH</div><h2>${best&&RUSH.score>0?'🏆 새 기록!':'⏱ 시간 끝!'}</h2><div class="gm-big">💎 ${RUSH.score}</div><p>모은 다이아 (황금 다이아는 3개로 쳐요)<br>최고 기록 ${G.rushBest}개 · ${G.rushPlays}번째 도전</p><div class="gm-actions"><button data-act="close">닫기</button><button class="primary" data-act="rush">한 번 더</button></div>`)}
const _dir=new THREE.Vector3();
function rushTick(dt,raw){if(!RUSH.on)return;if(!paused)RUSH.t-=raw;const left=Math.max(0,RUSH.t);$('#rbTime').textContent=Math.ceil(left);$('#rbTime').classList.toggle('low',left<10);
  let near=null,nd=1e9;for(const o of RUSH.gems){if(o.t>=0){o.t+=dt;const k=Math.min(1,o.t/.5);o.m.position.y=1.2+k*2.2;o.m.scale.set(1+k,1.45*(1+k),1+k);o.g.scale.setScalar(1-k*.6);if(k>=1){scene.remove(o.g);o.dead=true}continue}
    o.m.rotation.y+=dt*2.4;o.m.position.y=1.2+Math.sin(time*3+o.ph)*.18;const d=Math.hypot(o.x-player.x,o.z-player.z);if(d<1.8&&walkish()){o.t=0;const pts=o.kind==='gold'?3:1;RUSH.score+=pts;$('#rbScore').textContent=RUSH.score;beep(o.kind==='gold'?1319:1047,0,.1,'square',.03);beep(o.kind==='gold'?1760:1397,.07,.14,'square',.03);if(o.kind==='gold'){toast('✨ 황금 다이아! +3');const v=visChars();if(v[0])emote(v[0],'+3!')}continue}if(d<nd){nd=d;near=o}}
  RUSH.gems=RUSH.gems.filter(o=>!o.dead);while(RUSH.gems.filter(o=>o.t<0).length<RUSH.alive&&spawnGem());
  if(near){camera.getWorldDirection(_dir);const cam=Math.atan2(_dir.x,_dir.z),to=Math.atan2(near.x-player.x,near.z-player.z);let a=cam-to;$('#rbArrow').style.transform=`rotate(${a}rad)`;$('#rbDist').textContent=Math.round(nd)+'m'}
  if(RUSH.t<=0)endRush(true)}

/* ── 낚시: 릴 감기 ── */
const reel=document.createElement('div');reel.id='reelGame';reel.innerHTML=`<div class="rg-title"><span id="rgName">🎣 무언가 걸렸어요!</span><span id="rgPct">30%</span></div><div class="rg-track" id="rgTrack"><div class="rg-zone" id="rgZone"></div><div class="rg-fish" id="rgFish">🐟</div></div><div class="rg-prog"><i id="rgProg"></i></div><button class="rg-hold" id="rgHold">꾹 누르고 있기 · 떼면 왼쪽</button><div class="rg-help">${touch?'버튼을 누르고 있으면 초록 칸이 오른쪽으로 가요. 물고기를 칸 안에 두세요!':'F 나 Space 를 누르고 있으면 초록 칸이 오른쪽으로 가요 (마우스로 버튼을 눌러도 돼요). Esc 는 그만두기'}</div>`;document.body.appendChild(reel);
const R={on:false,hold:false,z:.35,v:0,fish:.5,fv:0,goal:.5,next:0,p:.3,w:.26,spd:1,F:null,f:null,cm:0};
function reelStart(F,f,cm){const rare=f[4]<=1?1:f[4]<=3?.85:f[4]<=10?.6:f[4]<=16?.45:.25;Object.assign(R,{on:true,hold:false,z:.25,v:0,fish:.5,fv:0,goal:.5,next:0,p:.4,w:.52-rare*.08,spd:.25+rare*.35,F,f,cm});F.phase='reel';F.t=0;
  $('#rgZone').style.width=R.w*100+'%';$('#rgName').textContent=f[4]<=1?'🎣 엄청 무거워요…!':cm>=40?'🎣 큰 녀석이 걸렸어요!':'🎣 무언가 걸렸어요!';$('#rgFish').textContent=f[0]==='황금 잉어'?'🐠':'🐟';reel.classList.add('on');document.body.classList.add('reeling');beep(1320,0,.06,'sine')}
function reelStop(){R.on=false;R.hold=false;reel.classList.remove('on');document.body.classList.remove('reeling');$('#rgHold').classList.remove('down')}
function reelTick(dt){if(!R.on)return;const F=PLAY.fish;if(PLAY.mode!=='fish'||!F||F!==R.F||F.phase!=='reel'){reelStop();return}if(paused)return;dt=Math.min(dt,.05);
  R.v+=(R.hold?1.8:-1.3)*dt;R.v*=Math.pow(.35,dt);R.z+=R.v*dt;if(R.z<0){R.z=0;R.v=Math.max(0,-R.v*.3)}if(R.z>1-R.w){R.z=1-R.w;R.v=Math.min(0,-R.v*.3)}
  R.next-=dt;if(R.next<=0){R.goal=.05+Math.random()*.9;R.next=.35+Math.random()*(1.6-R.spd*.5)}const acc=(R.goal-R.fish)*6*R.spd;R.fv+=acc*dt;R.fv*=Math.pow(.08,dt);R.fish=Math.min(.98,Math.max(.02,R.fish+R.fv*dt));
  const inZone=R.fish>=R.z&&R.fish<=R.z+R.w;R.p+=(inZone?.42:-.06)*dt;$('#rgZone').style.left=R.z*100+'%';$('#rgZone').classList.toggle('hit',inZone);$('#rgFish').style.left=R.fish*100+'%';$('#rgProg').style.width=Math.max(0,Math.min(1,R.p))*100+'%';$('#rgPct').textContent=Math.round(Math.max(0,Math.min(1,R.p))*100)+'%';
  if(R.p>=1){reelStop();catchNow(F,R.f,R.cm)}else if(R.p<=0){reelStop();F.phase='wait';F.t=0;F.biteAt=2+Math.random()*4;const v=visChars();if(v[0])emote(v[0],'…');toast('앗, 물고기가 도망갔어요… 다시 기다려 봐요');beep(330,0,.2,'sine')}}
window.gameReelStart=reelStart;window.assetVillageGame={reel:R,rush:RUSH};
const holdOn=e=>{if(!R.on)return;e.preventDefault();R.hold=true;$('#rgHold').classList.add('down')},holdOff=()=>{R.hold=false;$('#rgHold').classList.remove('down')};
reel.addEventListener('pointerdown',e=>{reel.setPointerCapture?.(e.pointerId);holdOn(e)});reel.addEventListener('pointerup',holdOff);reel.addEventListener('pointercancel',holdOff);reel.addEventListener('lostpointercapture',holdOff);reel.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('keydown',e=>{if(!R.on)return;if(e.code==='KeyF'||e.code==='Space'||e.key===' '||e.key.toLowerCase()==='f'){e.preventDefault();e.stopImmediatePropagation();holdOn(e)}},true);
addEventListener('keyup',e=>{if(e.code==='KeyF'||e.code==='Space'||e.key===' '||e.key.toLowerCase()==='f')holdOff()},true);
addEventListener('blur',holdOff);
const _lc=landCatch;landCatch=function(F,fisher){_lc(F,fisher);const c=F.catch;if(c&&!c.boot){const d=G.dex[c.name]||{n:0,best:0},first=!d.n;d.n++;d.best=Math.max(d.best,c.cm);G.dex[c.name]=d;gSave();hudText();if(first)setTimeout(()=>toast(`📖 도감에 새로 등록! ${c.name} (${allFish().filter(f=>G.dex[f.name]).length} / ${allFish().length})`,'gem'),2600)}};

// 러시 · 릴 감기 중에는 주민 이야기 창이 끼어들지 않게
const _npc=checkNpcMeet;checkNpcMeet=function(){if(RUSH.on||R.on||PLAY.mode)return;_npc()};

// 도감에 아직 없는 물고기는 더 잘 문다 (황금 잉어도 언젠가는 — 도감 완성이 요트의 조건이라)
pickFish=function(where){const L=FISH[where==='pier'?'lake':'stream'],w=f=>f[1]&&!(G.dex[f[0]]&&G.dex[f[0]].n)?Math.max(f[4]*4,12):f[4],tot=L.reduce((s,f)=>s+w(f),0);let r=Math.random()*tot;for(const f of L){if((r-=w(f))<0)return f}return L[0]};
window.dpFishDone=()=>allFish().every(f=>G.dex[f.name]&&G.dex[f.name].n);
window.dpGame={showModal,closeModal,hudText,endRush,reelStop,RUSH,R,fishCount:()=>{const a=allFish();return [a.filter(f=>G.dex[f.name]&&G.dex[f.name].n).length,a.length]}};

/* ── 도움말 ── */
const help=$('#helpDialog');if(help){help.querySelectorAll('p').forEach(p=>p.remove());help.querySelector('h2').textContent='마을에서 놀아요';help.querySelector('.eyebrow').textContent='WELCOME TO THE VILLAGE';
  help.querySelector('h2').insertAdjacentHTML('afterend',`<p><b>걷기</b> — PC 는 방향키 · WASD (Shift 달리기, Space 점프, B 자전거, H 손 흔들기). 모바일은 왼쪽 아래 화살표 버튼. 드래그로 둘러보고 휠 · ＋/− 로 확대해요. 건물이나 구역 이름을 누르면 그곳까지 걸어가요.</p><p><b>⚡ 다이아 러시</b> — 미니게임판의 시작을 누르면 60초 동안 주변에 빛기둥이 선 다이아가 나타나요. 닿으면 모아요 (황금 다이아는 3개). 위쪽 화살표가 가장 가까운 다이아 방향이에요.</p><p><b>🎣 낚시</b> — 호수 부두 끝 · 개울가 · 다리 위에서 F (모바일은 아래 가운데 알림). 찌가 흔들릴 때 한 번 더 누르면 릴 감기가 시작돼요. 누르고 있으면 초록 칸이 오른쪽, 떼면 왼쪽으로 가요 — 물고기를 칸 안에 두면 게이지가 차고, 다 차면 낚아요. 잡은 물고기는 도감에 모여요.</p><p><b>💎 숨은 다이아몬드</b> — 섬 구석 · 언덕 꼭대기 · 숲속 · 모래사장, 목표봉 정상 바로 아래에 10개. 오른쪽 위 💎 를 누르면 힌트와 보상(모자 · 강아지 · 왕관)이 나와요.</p><p><b>⛰ 목표봉</b> — 북쪽 큰길의 등산로를 따라 정상까지 올라요. 정상석에는 “덴포토”, 그 옆엔 다이아몬드가 반짝여요.</p><p><b>⛵ 요트 섬 일주</b> — 낚시 도감 11종과 숨은 다이아 10개를 모두 모으면 남쪽 해변 DentPhoto 선착장의 요트가 열려요. F 로 타면 섬을 한 바퀴 돌며 불꽃놀이를 해요 (Esc 로 내리기).</p><p><b>📅 계절</b> — 15초마다 한 달이 지나 3분이면 1년이에요. 겨울엔 폭설이 쌓이고, 장마엔 비가 와요 (비 올 때만 우산).</p><p><b>그 밖의 놀이</b> — F 로 벤치에 앉기 · 잔디에 눕기 · 오리 먹이 주기. 주민에게 다가가면 게임 도움말이나 주식 격언을 들려줘요. 주인공은 미니게임판의 👤 바꾸기로 바꿔요. 기록은 이 기기의 브라우저에 저장돼요.</p>`);
  const hb=help.querySelector('button.primary');if(hb)hb.textContent='놀러 가기'}

/* ── 매 프레임 ── */
let last=performance.now();(function loop(now){const raw=Math.min(1,(now-last)/1000),dt=Math.min(.1,raw);last=now;try{rushTick(dt,raw);reelTick(dt);for(const f of window.dpTicks||[])f(dt,raw)}catch(e){console.error(e)}requestAnimationFrame(loop)})(last);
renderGems();hudText();
})();
