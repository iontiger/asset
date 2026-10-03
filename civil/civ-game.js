/* 덴포토 문명 — 화면 조작 · 판 · 턴 진행 (규칙은 civ-rules.js, 그림은 civ-view.js)
   마을(3d/)의 iframe 안에서 열리면 ✕ 버튼이 postMessage {dpCiv:'close'} 로 마을에 돌아간다.
   저장: localStorage 'dentphoto-civ-v1' (턴마다 자동), 기록 'dentphoto-civ-record-v1'. 시험용 window.civDebug */
(function(){
'use strict';
const C=window.CIV,$=s=>document.querySelector(s),SAVE='dentphoto-civ-v1',REC='dentphoto-civ-record-v1';
const view=new CivView($('#map3d'),$('#labels'));
let S=null,sel=null,pendingAttack=null,busy=false,shownLog=0,pickCiv='dent',hover=null,lastHoverPath=null;
const P=()=>S.civs[S.player];
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>Math.round(n).toLocaleString('ko-KR');
const eok=g=>(g/100).toFixed(g<1000?1:0).replace(/\.0$/,'')+'억';
const store={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};

/* ═══ 시작 화면 ═══ */
function startScreen(){const box=$('#civPick');box.innerHTML='';
  for(const c of C.CIVS){const b=document.createElement('button');b.style.setProperty('--civ',c.color);b.innerHTML=`<span class="dot"></span><b>${esc(c.name)}</b><small>${esc(c.leader)}</small>`;b.classList.toggle('on',c.key===pickCiv);b.onclick=()=>{pickCiv=c.key;startScreen()};box.appendChild(b)}
  const sv=store.get(SAVE);let info=null;try{if(sv){const o=JSON.parse(sv);info=o&&o.turn?{turn:o.turn,name:o.civs[o.player].name,over:o.over}:null}}catch{}
  $('#btContinue').hidden=!info||!!info.over;if(info)$('#btContinue').textContent=`이어하기 — ${info.name} · ${info.turn}턴`;$('#start').hidden=false}
$('#btNew').onclick=()=>{newGame({civ:pickCiv,size:$('#optSize').value,difficulty:$('#optDiff').value})};
$('#btContinue').onclick=()=>{try{loadGame(C.load(store.get(SAVE)))}catch(e){toast('저장된 게임을 불러오지 못했어요: '+e.message,'war')}};
function newGame(opt){S=C.newGame(opt);begin();toast(`🏕 ${P().name}의 이야기가 시작됐어요. 개척자로 첫 도시를 세워 보세요 (B)`,'good');const st=S.units.find(u=>u.civ===S.player&&u.type==='settler');if(st)select(st)}
function loadGame(s){S=s;begin();toast(`${P().name} · ${S.turn}턴부터 이어 해요`)}
function begin(){$('#start').hidden=true;closeModal();closeCity();view.setState(S);shownLog=S.log.length;
  const cap=S.cities.find(c=>c.civ===S.player&&c.capital)||S.cities.find(c=>c.civ===S.player);const u=S.units.find(u=>u.civ===S.player);view.dist=21;view.centerOn(cap?cap.tile:u?u.at:0,true);sel=null;refresh()}

/* ═══ 위 막대 · 버튼 ═══ */
function refresh(){if(!S)return;const Pc=P(),inc=C.civIncome(S,S.player);
  $('#stTurn b').textContent=`${S.turn}/${C.MAX_TURN}`;
  $('#stGold b').textContent=fmt(Pc.gold);$('#stGold small').textContent=(inc.gold>=0?'+':'')+fmt(inc.gold);
  const r=Pc.research;$('#stSci').classList.toggle('need',!r&&Object.keys(C.TECHS).some(k=>C.canResearch(S,S.player,k)));
  if(r){const cost=C.techCost(S,r),left=Math.max(1,Math.ceil((cost-Pc.progress)/Math.max(.5,inc.science)));$('#stSci b').textContent=C.TECHS[r].name;$('#stSci small').textContent=`+${fmt(inc.science)} · ${left}턴`;$('#stSci .bar u').style.width=Math.min(100,Pc.progress/cost*100)+'%'}
  else{$('#stSci b').textContent=Object.keys(C.TECHS).every(k=>Pc.techs.includes(k))?'모든 기술 완료':'연구 고르기';$('#stSci small').textContent=`+${fmt(inc.science)}`;$('#stSci .bar u').style.width='0'}
  $('#stGoal b').textContent=eok(Pc.gold);$('#stGoal .bar u').style.width=Math.min(100,Pc.gold/C.GOAL_GOLD*100)+'%';$('#stGoal').title=Pc.techs.includes('asset')?'금 2,000(=20억)에 닿으면 목표자산 승리!':'자산 경영 기술을 배우고 금 2,000(=20억)을 모으면 목표자산 승리';
  const nx=nextTodo();const b=$('#btNext');b.textContent=nx.label;b.classList.toggle('wait',nx.kind!=='end');$('#btEnd').hidden=nx.kind==='end'||!!S.over;b.disabled=busy||!!S.over&&nx.kind==='end';
  view.syncAll();drawMini();if(sel&&!S.units.includes(sel))sel=null;showUnit()}
function nextTodo(){if(S.over)return {kind:'end',label:'게임 끝'};const Pc=P();
  if(!Pc.research&&Object.keys(C.TECHS).some(k=>C.canResearch(S,S.player,k)))return {kind:'tech',label:'🔬 연구 고르기'};
  const city=S.cities.find(c=>c.civ===S.player&&!c.build);if(city)return {kind:'city',city,label:`🏗 ${city.name} 생산 고르기`};
  const idle=idleList();if(idle.length)return {kind:'unit',label:`다음 유닛 (${idle.length}) →`};
  return {kind:'end',label:'턴 종료 ⏎'}}
function idleList(){return C.idleUnits(S,S.player).filter(u=>u.skip!==S.turn)}
$('#btNext').onclick=()=>doNext();$('#btEnd').onclick=()=>endTurn();
function doNext(){if(busy||!S)return;const nx=nextTodo();if(nx.kind==='tech')openTech();else if(nx.kind==='city')openCity(nx.city);else if(nx.kind==='unit'){const list=idleList();const i=sel?list.indexOf(sel):-1;select(list[(i+1)%list.length]||list[0],true)}else endTurn()}
$('#stSci').onclick=()=>openTech();$('#btTech').onclick=()=>openTech();$('#btDiplo').onclick=()=>openDiplo();$('#btHelp').onclick=()=>openHelp();$('#btMenu').onclick=()=>openMenu();
$('#btHome').onclick=()=>goHome();
function goHome(){if(S&&!S.over)store.set(SAVE,C.save(S));if(window.parent&&window.parent!==window)window.parent.postMessage({dpCiv:'close'},'*');else location.href='../3d/'}

/* ═══ 알림 ═══ */
function toast(text,kind,at,extra){const box=$('#notes'),b=document.createElement('button');b.className='note'+(kind?' '+kind:'');b.textContent=text;
  b.onclick=()=>{if(extra&&extra.city!=null){const c=S.cities.find(c=>c.id===extra.city);if(c&&c.civ===S.player){openCity(c);return}}if(extra&&extra.needsTech){openTech();return}if(at!=null)view.centerOn(at)};
  box.appendChild(b);while(box.children.length>6)box.firstChild.remove();setTimeout(()=>{b.classList.add('fade');setTimeout(()=>b.remove(),600)},kind==='war'?11000:7000)}
function flushLog(){for(;shownLog<S.log.length;shownLog++){const L=S.log[shownLog];if(L.quiet&&S.log.length-shownLog>8)continue;toast(L.text,L.war||/빼앗|쓰러|사라|굶주/.test(L.text)?'war':/완성|완료|점령|세웠|찾았|합류/.test(L.text)?'good':'',L.at,L)}}

/* ═══ 유닛 선택 · 판 ═══ */
function select(u,center){sel=u;pendingAttack=null;hideTip();closeCity();if(u&&center)view.centerOn(u.at);marks();showUnit()}
function marks(path){view.clearMarks();if(!sel||!S.units.includes(sel))return;view.ring(sel.at);if(sel.civ!==S.player)return;
  if(sel.moves>0&&!sel.acted){const R=C.reachable(S,sel);R.delete(sel.at);view.mark([...R.keys()],'#ffffff',.4);
    const D=C.UNITS[sel.type];if(!D.civilian){const t=C.within(sel.at,D.rs?D.range:1,S.W,S.H).filter(k=>C.canAttack(S,sel,k));view.mark(t,'#ff4d3a',.42)}}
  if(pendingAttack!=null)view.mark([pendingAttack],'#ff2a1a',.6);
  const p=path||(sel.goto!=null?C.findPath(S,sel,sel.goto):null);if(p)view.pathLine(p)}
function showUnit(){const box=$('#unitPanel');if(!sel||!S||!S.units.includes(sel)){box.hidden=true;return}const u=sel,D=C.UNITS[u.type],mine=u.civ===S.player,civ=S.civs[u.civ];
  box.style.setProperty('--civ',civ.color);
  const str=D.rs?`원거리 ${D.rs} · 사거리 ${D.range} · 힘 ${D.str}`:D.str?`힘 ${D.str}`:'민간';
  let acts='';
  if(mine){const a=(id,label,key,main,dis,title)=>`<button data-act="${id}" class="${main?'main':''}" ${dis?'disabled':''} ${title?`title="${esc(title)}"`:''}>${label}${key?`<kbd>${key}</kbd>`:''}</button>`;
    if(D.found){const ok=C.canFound(S,u);acts+=a('found','🏠 도시 세우기','B',true,!ok,ok?'':'다른 도시와 3칸 이상 떨어진 우리 땅이나 빈 땅에서만 세울 수 있어요')}
    if(D.work){if(u.build){const M=C.IMPROVE[u.build];acts+=`<button disabled>${M.icon} ${M.name} 짓는 중 ${u.buildT}/${M.turns}</button>`+a('stopwork','중지')}
      else for(const [k,M] of Object.entries(C.IMPROVE))if(C.canImprove(S,u,k))acts+=a('imp:'+k,`${M.icon} ${M.name} (${M.turns}턴)`,k==='farm'?'1':k==='mine'?'2':k==='lumber'?'3':'4',true)}
    if(!D.civilian)acts+=a('fortify',u.fortify?'🛡 주둔 중':'🛡 주둔','F',false,u.fortify);
    if(u.goto!=null)acts+=a('cancel','➜ 이동 취소');
    acts+=a('skip','⏭ 이번 턴 쉬기','␣')+a('sleep','💤 잠자기','Z')+a('disband','✖ 해산')}
  const st=mine?`이동 ${+u.moves.toFixed(1)}/${D.moves}`:`${civ.name}${C.isWar(S,S.player,u.civ)?' · 전쟁 중':''}`;
  box.innerHTML=`<div class="u-head"><span class="u-icon">${D.icon}</span><div><b>${D.name}</b><small>${str} · ${st}${u.xp?` · 경험 ${u.xp}`:''}</small><div class="hpbar"><u style="width:${u.hp}%"></u></div></div></div>${D.desc?`<p class="u-desc">${esc(D.desc)}</p>`:''}<div class="u-actions">${acts}</div>`;
  box.hidden=false;box.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>unitAct(b.dataset.act))}
function unitAct(act){const u=sel;if(!u||busy)return;
  if(act==='found'){const ev0=S.events.length;const c=C.foundCity(S,u);if(c){sel=null;play(S.events.slice(ev0)).then(()=>{openCity(c);after()})}return}
  if(act.startsWith('imp:')){if(C.startImprove(S,u,act.slice(4))){after(true)}return}
  if(act==='stopwork'){u.build=null;u.buildT=0;after()}
  if(act==='fortify'){u.fortify=true;u.fort=Math.max(1,u.fort);u.goto=null;after(true)}
  if(act==='cancel'){u.goto=null;after()}
  if(act==='skip'){u.skip=S.turn;after(true)}
  if(act==='sleep'){u.sleep=true;u.goto=null;after(true)}
  if(act==='disband'){if(confirm(`${C.UNITS[u.type].name}을(를) 해산할까요?`)){S.units.splice(S.units.indexOf(u),1);sel=null;after()}}}
// 행동 뒤: 화면 맞추기, 끝난 유닛이면 다음 유닛으로
function after(advance){C.updateVision(S,S.player);flushLog();refresh();if(advance||sel&&(sel.moves<=0||sel.acted)){const list=idleList().filter(x=>x!==sel);if(list.length){select(list[0],true);return}sel=null;view.clearMarks();showUnit()}else marks()}
function play(ev,opt){busy=true;$('#btNext').disabled=true;return view.play(ev,opt).then(()=>{busy=false;refresh()})}

/* ═══ 지도 누르기 ═══ */
function clickTile(i){if(i==null||busy||!S)return;hideTip();const mineHere=S.units.filter(u=>u.at===i&&u.civ===S.player);
  if(sel&&sel.civ===S.player&&S.units.includes(sel)){
    if(pendingAttack===i){doAttack(sel,i);return}
    if(C.canAttack(S,sel,i)){pendingAttack=i;marks();attackTip(sel,i);return}
    if(i===sel.at){if(mineHere.length>1){select(mineHere.find(u=>u!==sel))}else{const c=C.cityAt(S,i);if(c&&c.civ===S.player)openCity(c)}return}
    if(mineHere.length&&!C.canEnter(S,sel,i)){select(mineHere[0]);return}
    const p=C.findPath(S,sel,i,{known:true});if(p){moveAlong(sel,p);return}
    if(mineHere.length){select(mineHere[0]);return}
    tileTip(i,'여기로는 갈 수 없어요');return}
  if(mineHere.length){select(mineHere.find(u=>!C.UNITS[u.type].civilian&&u.moves>0)||mineHere.find(u=>u.moves>0)||mineHere[0]);return}
  const c=C.cityAt(S,i);if(c&&c.civ===S.player){openCity(c);return}
  const other=S.units.find(u=>u.at===i&&P().visible[i]);if(other){select(other);return}
  sel=null;view.clearMarks();showUnit();tileTip(i)}
function moveAlong(u,p){const ev0=S.events.length;u.goto=p[p.length-1];u.fortify=false;u.sleep=false;C.followPath(S,u,p);if(u.at===u.goto)u.goto=null;
  play(S.events.slice(ev0)).then(()=>after(u.moves<=0))}
function doAttack(u,i){const ev0=S.events.length;pendingAttack=null;hideTip();
  if(!C.attack(S,u,i))return;play(S.events.slice(ev0)).then(()=>{if(S.over)gameOver();after(true)})}
function attackTip(u,i){const pv=C.preview(S,u,i);if(!pv)return;const city=C.cityAt(S,i),def=C.militaryAt(S,i)||C.civilianAt(S,i),name=city?`🏰 ${city.name}`:def?C.UNITS[def.type].icon+' '+C.UNITS[def.type].name:'';
  const tip=$('#tip');tip.innerHTML=pv.capture?`<h4>${name} 사로잡기</h4><button class="atk">사로잡기</button>`:
    `<h4>${pv.ranged?'🏹 원거리 공격':'⚔ 공격'} → ${name}</h4><div class="vs"><div><small>우리 힘</small><b>${pv.a.toFixed(1)}</b><small>받는 피해 ~${Math.min(100,pv.take)}</small></div><div>vs</div><div><small>상대 힘</small><b>${pv.d.toFixed(1)}</b><small>주는 피해 ~${pv.deal}${city?` / 체력 ${city.hp}`:def?` / 체력 ${def.hp}`:''}</small></div></div>
    ${pv.take>=u.hp?'<small style="color:#c8402f">⚠ 이 공격으로 유닛이 쓰러질 수 있어요</small><br>':''}<button class="atk">공격하기</button> <button class="no">취소</button>`;
  tip.hidden=false;tip.querySelector('.atk').onclick=()=>doAttack(u,i);const no=tip.querySelector('.no');if(no)no.onclick=()=>{pendingAttack=null;hideTip();marks()}}
function tileTip(i,extra){const Pc=P();if(!Pc.explored[i]){hideTip();return}const T=S.tiles[i],tr=C.TERRAIN[T.t],y=C.tileYield(S,S.tiles,i);
  const own=T.owner!=null?S.cities.find(c=>c.id===T.owner):null;const parts=[`<b>${T.wonder?'⛰ 목표봉 (자연경관)':tr.name}</b>`];
  if(T.wonder)parts.push('<small>2칸 안의 도시: 과학 +3 · 금 +2</small>');
  else if(!tr.block)parts.push(`<small>🍞${y.f} ⚙${y.p} 💰${y.g}${tr.def?' · 방어 +25%':''}${tr.move>1&&tr.move<9?' · 이동 2':''}</small>`);
  if(T.res)parts.push(`<small>${C.RESOURCES[T.res].icon} ${C.RESOURCES[T.res].name}</small>`);
  if(T.imp)parts.push(`<small>${C.IMPROVE[T.imp].icon} ${C.IMPROVE[T.imp].name}</small>`);if(T.road)parts.push('<small>🛤 도로</small>');if(T.ruin)parts.push('<small>💎 보물상자 — 유닛이 들어가면 열려요</small>');
  if(own)parts.push(`<small>${esc(S.civs[own.civ].name)} · ${esc(own.name)} 영토</small>`);
  const c=C.cityAt(S,i);if(c&&c.civ!==S.player)parts.push(`<small>🏰 ${esc(c.name)} · 인구 ${c.pop} · 방어 ${C.cityStr(S,c).toFixed(1)} · 체력 ${c.hp}/${c.maxHp}</small>`);
  if(extra)parts.push(`<small style="color:#c8402f">${extra}</small>`);
  const tip=$('#tip');tip.innerHTML=parts.join('<br>');tip.hidden=false;clearTimeout(tileTip.t);tileTip.t=setTimeout(hideTip,4200)}
function hideTip(){$('#tip').hidden=true}

/* ═══ 도시 화면 ═══ */
let openCityId=null;
function openCity(c){if(!c||c.civ!==S.player)return;openCityId=c.id;hideTip();const box=$('#cityPanel'),y=C.cityYield(S,c),Pc=P();box.style.setProperty('--civ',Pc.color);
  const fb=C.foodBox(c),grow=y.surplus>0?Math.ceil((fb-c.food)/(y.surplus*(c.buildings.includes('dental')?1.25:1))):null;
  const cur=c.build,curD=cur&&(cur.kind==='unit'?C.UNITS:cur.kind==='building'?C.BUILDINGS:cur.kind==='wonder'?C.WONDERS:C.PROJECTS)[cur.id];
  const cost=cur&&cur.kind!=='project'?C.itemCost(cur):0,turns=cur&&cur.kind!=='project'?Math.max(1,Math.ceil((cost-c.prod)/Math.max(.5,y.p))):null,buy=C.buyCost(S,c);
  const row=(it)=>{const D=(it.kind==='unit'?C.UNITS:it.kind==='building'?C.BUILDINGS:it.kind==='wonder'?C.WONDERS:C.PROJECTS)[it.id],on=cur&&cur.kind===it.kind&&cur.id===it.id;
    const t=it.kind==='project'?'':`${D.cost} · ${Math.max(1,Math.ceil((D.cost-(on?c.prod:Math.min(c.prod,D.cost)))/Math.max(.5,y.p)))}턴`;
    const info=it.kind==='unit'?(D.str?`힘 ${D.str}${D.rs?` · 원거리 ${D.rs}`:''} · 이동 ${D.moves}`:'')+(D.desc?' · '+D.desc:''):
      D.desc||[D.f&&`🍞+${D.f}`,D.p&&`⚙+${D.p}`,D.g&&`💰+${D.g}`,D.s&&`🔬+${D.s}`,D.gp&&`금 +${D.gp*100}%`,D.sp&&`과학 +${D.sp*100|0}%`].filter(Boolean).join(' ');
    return `<button class="opt ${on?'on':''}" data-k="${it.kind}" data-id="${it.id}"><span class="ic">${D.icon}</span><span>${D.name}${it.kind==='wonder'?' <small style="display:inline">불가사의</small>':''}<small>${esc(info)}</small></span><span class="t">${t}</span></button>`};
  const opts=C.buildOptions(S,c);const grp=k=>opts.filter(o=>o.kind===k).map(row).join('');
  const built=c.buildings.map(b=>{const D=C.BUILDINGS[b]||C.WONDERS[b];return `<span>${D.icon} ${D.name}</span>`}).join('')||'<span>아직 없어요</span>';
  box.innerHTML=`<div class="c-head"><span class="pop">${c.pop}</span><div><h3>${c.capital?'★ ':''}${esc(c.name)}</h3><small>체력 ${c.hp}/${c.maxHp} · 방어 ${C.cityStr(S,c).toFixed(1)} · 식량 ${Math.floor(c.food)}/${fb}${grow?` · ${grow}턴 뒤 성장`:y.surplus<0?' · 굶주림!':''}</small></div><button class="x" title="닫기 (Esc)">✕</button></div>
    <div class="c-yield"><div><b>${fmt(y.f)}</b>🍞 식량 ${y.surplus>=0?'+':''}${fmt(y.surplus)}</div><div><b>${y.p.toFixed(1)}</b>⚙ 생산</div><div><b>${y.g.toFixed(1)}</b>💰 금</div><div><b>${y.s.toFixed(1)}</b>🔬 과학</div></div>
    <div class="c-now">${cur?`<span class="big">${curD.icon}</span><div class="prog"><b>${curD.name}</b><small style="display:block;color:#7b876e;font-size:11px">${cur.kind==='project'?'생산력 → 금':`${Math.floor(c.prod)}/${cost} · ${turns}턴`}</small>${cur.kind!=='project'?`<div class="hpbar"><u style="width:${Math.min(100,c.prod/cost*100)}%"></u></div>`:''}</div>
      ${isFinite(buy)?`<button class="buy" ${buy>Pc.gold||c.boughtTurn===S.turn?'disabled':''}>💰 ${fmt(buy)} 사기</button>`:''}`:'<span class="big">❔</span><div class="prog"><b>무엇을 만들까요?</b><small style="display:block;color:#7b876e">아래에서 골라 주세요</small></div>'}</div>
    <div class="c-list"><h5>유닛</h5>${grp('unit')}<h5>건물</h5>${grp('building')||'<small style="color:#7b876e">새 기술을 배우면 늘어나요</small>'}${grp('wonder')?'<h5>불가사의</h5>'+grp('wonder'):''}<h5>프로젝트</h5>${grp('project')}<h5>지은 것</h5><div class="chips">${built}</div></div>`;
  box.hidden=false;box.querySelector('.x').onclick=closeCity;const bb=box.querySelector('.buy');if(bb)bb.onclick=()=>{if(C.buy(S,c)){toast(`💰 ${c.name}: 사들였어요`,'good');flushLog();refresh();openCity(c)}};
  box.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{c.build={kind:b.dataset.k,id:b.dataset.id};refresh();openCity(c)});
  view.centerOn(c.tile)}
function closeCity(){$('#cityPanel').hidden=true;openCityId=null}
$('#labels').addEventListener('click',e=>{const b=e.target.closest('.city-label');if(!b||busy)return;const c=S.cities.find(c=>c.id===+b.dataset.city);if(!c)return;if(c.civ===S.player)openCity(c);else{if(sel&&sel.civ===S.player&&C.canAttack(S,sel,c.tile)){clickTile(c.tile)}else tileTip(c.tile)}});

/* ═══ 기술 · 외교 · 도움말 · 메뉴 ═══ */
function modal(html,cls){const m=$('#modal'),card=m.querySelector('.card');card.className='card '+(cls||'');card.innerHTML=html;m.hidden=false;const x=card.querySelector('.close');if(x)x.onclick=closeModal;return card}
function closeModal(){$('#modal').hidden=true}
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal'&&!S?.over)closeModal()});
function openTech(){if(!S)return;const Pc=P(),inc=C.civIncome(S,S.player),depth={};const dep=k=>depth[k]??(depth[k]=C.TECHS[k].req.length?1+Math.max(...C.TECHS[k].req.map(dep)):0);
  const cols={};for(const k in C.TECHS){const d=dep(k);(cols[d]=cols[d]||[]).push(k)}
  let html='';for(const d of Object.keys(cols).sort((a,b)=>a-b))for(let r=0;r<6;r++){const k=cols[d][r];if(!k){html+='<span></span>';continue}const T=C.TECHS[k],known=Pc.techs.includes(k),now=Pc.research===k,av=C.canResearch(S,S.player,k);
    const cost=C.techCost(S,k),turns=Math.max(1,Math.ceil((cost-(now?Pc.progress:0))/Math.max(.5,inc.science)));
    html+=`<button class="tech ${known?'known':now?'now':av?'avail':'locked'}" data-t="${k}" ${known||!av?'disabled':''} style="grid-column:${+d+1};grid-row:${r+1}"><b>${known?'✓ ':now?'🔬 ':''}${T.name}</b><small>${known?'완료':`${cost} · ${turns}턴`}${T.req.length?` · ← ${T.req.map(q=>C.TECHS[q].name).join(', ')}`:''}</small><small>${esc((T.unlocks||[]).join(' · ')||T.desc||'')}</small></button>`}
  const card=modal(`<button class="close">✕</button><h2>🔬 기술</h2><p class="sub">과학 +${fmt(inc.science)}/턴 · 배운 기술 ${Pc.techs.length}/${Object.keys(C.TECHS).length}. 다음에 연구할 기술을 고르세요. 마지막 '자산 경영'을 배우고 금 2,000(=20억)을 모으면 목표자산 승리!</p><div class="tech-grid">${html}</div>`,'wide');
  card.querySelectorAll('.tech.avail,.tech.now').forEach(b=>b.onclick=()=>{Pc.research=b.dataset.t;closeModal();refresh();toast(`🔬 ${C.TECHS[Pc.research].name} 연구를 시작했어요`)})}
function openDiplo(){if(!S)return;const Pc=P(),mine=C.power(S,S.player);
  const rows=S.civs.filter(c=>c.id!==S.player).map(c=>{if(!Pc.met.includes(c.id))return `<div class="diplo" style="--civ:#bbb"><span class="dot"></span><div><b>아직 만나지 못한 문명</b><small>지도를 넓혀 보세요</small></div></div>`;
    const war=C.isWar(S,S.player,c.id),ratio=C.power(S,c.id)/Math.max(1,mine),cities=S.cities.filter(x=>x.civ===c.id).length;
    const mood=!c.alive?'사라짐':ratio>1.4?'우리보다 강해요':ratio<.7?'우리보다 약해요':'비슷해요';
    return `<div class="diplo" style="--civ:${c.color}"><span class="dot"></span><div><b>${esc(c.name)}</b><small>${esc(c.leader)} · 도시 ${cities} · 군사력 ${mood} · 점수 ${C.score(S,c.id)}</small></div><span class="st ${war?'war':''}">${!c.alive?'—':war?'⚔ 전쟁':'🕊 평화'}</span>${c.alive?war?`<button data-peace="${c.id}">평화 제안</button>`:`<button data-war="${c.id}">전쟁 선포</button>`:''}</div>`}).join('');
  const card=modal(`<button class="close">✕</button><h2>🤝 외교</h2><p class="sub">${esc(Pc.name)} · 점수 ${C.score(S,S.player)} · 평화 중에는 서로의 영토에 들어갈 수 없어요.</p>${rows}`);
  card.querySelectorAll('[data-war]').forEach(b=>b.onclick=()=>{const id=+b.dataset.war;if(!confirm(`${S.civs[id].name}에 전쟁을 선포할까요?`))return;C.declareWar(S,S.player,id);flushLog();closeModal();refresh();marks()});
  card.querySelectorAll('[data-peace]').forEach(b=>b.onclick=()=>{const id=+b.dataset.peace;if(C.aiAcceptsPeace(S,id,S.player)){C.makePeace(S,S.player,id);flushLog();closeModal();refresh();marks()}else toast(`${S.civs[id].name}: "아직은 싸울 거예요" (전쟁이 8턴 넘게 이어지고 우리가 충분히 강해야 받아들여요)`,'war')})}
function openHelp(){modal(`<button class="close">✕</button><div class="help"><h2>덴포토 문명 — 도움말</h2>
  <h3>조작</h3><ul><li>유닛을 누르면 갈 수 있는 칸(흰색)과 공격할 수 있는 칸(빨강)이 보여요. 칸을 누르면 그곳으로 가고, 먼 곳은 여러 턴에 걸쳐 갑니다.</li>
  <li>빨간 칸을 누르면 예상 피해가 나오고, 한 번 더 누르면 공격해요.</li><li>끌어서 지도 이동 · 휠/두 손가락으로 확대 · 도시 이름표를 누르면 도시 화면.</li>
  <li>단축키: <span class="kbd">⏎</span> 다음/턴 종료 · <span class="kbd">B</span> 도시 세우기 · <span class="kbd">F</span> 주둔 · <span class="kbd">␣</span> 쉬기 · <span class="kbd">Z</span> 잠자기 · <span class="kbd">1~4</span> 일꾼 작업 · <span class="kbd">T</span> 기술 · <span class="kbd">WASD/화살표</span> 지도 이동 · <span class="kbd">Esc</span> 닫기</li></ul>
  <h3>도시</h3><p>도시는 인구만큼 둘레 칸을 일궈 🍞식량 · ⚙생산 · 💰금 · 🔬과학을 얻어요. 식량이 차면 인구가 늘고 영토가 넓어집니다. 개척자를 만들면 인구가 1 줄어요. 목표봉(⛰) 2칸 안의 도시는 과학 +3 · 금 +2.</p>
  <h3>전투</h3><p>힘과 체력으로 피해가 정해져요. 언덕 · 숲은 방어 +25%, 주둔 +25%, 창병은 기마 유닛에 강하고 투석기 · 대포는 도시 공격에 강해요. 도시 체력을 0으로 만든 뒤 근접 유닛이 들어가면 점령합니다. 도시는 해마다 둘레 2칸의 적을 쏩니다.</p>
  <h3>승리</h3><ul><li>🏰 정복 — 모든 문명의 첫 수도를 차지</li><li>🏆 목표자산 — '자산 경영'을 배우고 금 2,000(=20억)을 모으기</li><li>⭐ 점수 — ${C.MAX_TURN}턴이 지나면 점수가 가장 높은 문명</li></ul>
  <p>마을 3D 모델(집 · 시장 · 금고 · 탑 · 등대 · 분수 · 열기구)과 우편배달부 오토바이가 그대로 들어 있어요.</p></div>`)}
function openMenu(){const card=modal(`<button class="close">✕</button><h2>메뉴</h2><p class="sub">${S?`${esc(P().name)} · ${S.turn}턴 · 지도 시드 ${S.seed}`:''}</p><div class="row-btns"><button data-m="save">💾 저장</button><button data-m="new">🆕 새 게임</button><button data-m="home" class="go">🏡 마을로 돌아가기</button></div>`);
  card.querySelector('[data-m=save]').onclick=()=>{if(S){store.set(SAVE,C.save(S));toast('💾 저장했어요','good')}closeModal()};
  card.querySelector('[data-m=new]').onclick=()=>{closeModal();if(!S||S.over||confirm('지금 게임을 저장하고 새 게임을 시작할까요?')){if(S&&!S.over)store.set(SAVE,C.save(S));startScreen()}};
  card.querySelector('[data-m=home]').onclick=goHome}
function gameOver(){const o=S.over;if(!o)return;const win=o.civ===S.player&&!o.lost,W=S.civs[o.civ];
  const rec=(()=>{try{return JSON.parse(store.get(REC)||'{}')}catch{return {}}})();rec.games=(rec.games||0)+1;if(win){rec.wins=(rec.wins||0)+1;rec.best=Math.max(rec.best||0,C.score(S,S.player))}rec.last={win,kind:o.kind,turn:o.turn,civ:P().name};store.set(REC,JSON.stringify(rec));
  try{window.parent!==window&&window.parent.postMessage({dpCiv:'finish',win,kind:o.kind,turn:o.turn},'*')}catch{}
  store.set(SAVE,C.save(S));
  const rows=S.civs.map(c=>`<tr><td><span class="dot" style="background:${c.color}"></span>${esc(c.name)}${c.id===S.player?' (우리)':''}</td><td>${S.cities.filter(x=>x.civ===c.id).length}</td><td>${c.techs.length}</td><td>${fmt(c.gold)}</td><td><b>${C.score(S,c.id)}</b></td></tr>`).join('');
  const card=modal(`<h2>${win?'🎉 승리!':'🏳 게임 끝'}</h2><p class="sub">${o.turn}턴 · ${esc(W?W.name:'')} — ${o.kind} 승리${win?'! 덴포토의 이름이 역사에 남았어요.':''}</p>
    <table class="score-table"><tr><th>문명</th><th>도시</th><th>기술</th><th>금</th><th>점수</th></tr>${rows}</table>
    <div class="row-btns"><button data-m="look">지도 둘러보기</button><button data-m="new">🆕 새 게임</button><button data-m="home" class="go">🏡 마을로</button></div>`);
  card.querySelector('[data-m=look]').onclick=closeModal;card.querySelector('[data-m=new]').onclick=()=>{closeModal();startScreen()};card.querySelector('[data-m=home]').onclick=goHome}

/* ═══ 턴 끝내기 ═══ */
async function endTurn(){if(busy||!S||S.over)return;busy=true;sel=null;view.clearMarks();showUnit();closeCity();hideTip();$('#btNext').disabled=true;$('#btNext').textContent='다른 문명 차례…';
  await new Promise(r=>setTimeout(r,30));
  const ev=C.endTurn(S);await view.play(ev,{fast:true,cap:3.2});busy=false;
  store.set(SAVE,C.save(S));flushLog();refresh();
  if(S.over){gameOver();return}
  if(S.peaceOffer&&S.peaceOffer.turn>=S.turn-1){const id=S.peaceOffer.from;S.peaceOffer=null;if(C.isWar(S,S.player,id)){const card=modal(`<h2>🕊 평화 제안</h2><p class="sub">${esc(S.civs[id].name)}의 ${esc(S.civs[id].leader)}: "이제 그만 싸우고 평화롭게 지냅시다."</p><div class="row-btns"><button data-m="no">거절</button><button data-m="yes" class="go">평화 협정 맺기</button></div>`);
    card.querySelector('[data-m=yes]').onclick=()=>{C.makePeace(S,S.player,id);flushLog();closeModal();refresh()};card.querySelector('[data-m=no]').onclick=closeModal}}
  else S.peaceOffer=null;
  const list=idleList();if(list.length)select(list[0],true)}

/* ═══ 작은 지도 ═══ */
const mini=$('#mini'),mx=mini.getContext('2d');const MCOL={ocean:'#2d6e9b',coast:'#5fb0c4',grass:'#8fbf5e',plains:'#c2c070',desert:'#d6a56c',forest:'#4f8a43',hills:'#a3a861',mountain:'#8f877a'};
function drawMini(){if(!S)return;const Pc=P(),w=mini.width,h=mini.height,sx=w/(S.W+.5),sy=h/S.H;mx.fillStyle='#1d2a36';mx.fillRect(0,0,w,h);
  for(let i=0;i<S.W*S.H;i++){if(!Pc.explored[i])continue;const c=i%S.W,r=(i/S.W)|0,x=(c+(r&1)*.5)*sx,y=r*sy,T=S.tiles[i];mx.fillStyle=MCOL[T.t];mx.fillRect(x,y,sx+.6,sy+.6);
    if(T.owner!=null){const oc=S.cities.find(q=>q.id===T.owner);if(oc){mx.fillStyle=S.civs[oc.civ].color+'88';mx.fillRect(x,y,sx+.6,sy+.6)}}
    if(!Pc.visible[i]){mx.fillStyle='#1d2a3655';mx.fillRect(x,y,sx+.6,sy+.6)}}
  for(const c of S.cities)if(Pc.explored[c.tile]){const cc=c.tile%S.W,r=(c.tile/S.W)|0;mx.fillStyle='#fffbed';mx.fillRect((cc+(r&1)*.5)*sx-2,r*sy-2,sx+4,sy+4);mx.fillStyle=S.civs[c.civ].color;mx.fillRect((cc+(r&1)*.5)*sx-1,r*sy-1,sx+2,sy+2)}
  for(const u of S.units)if(u.civ===S.player||Pc.visible[u.at]&&C.isWar(S,S.player,u.civ)){const cc=u.at%S.W,r=(u.at/S.W)|0;mx.fillStyle=u.civ===S.player?'#fff':'#ff3b2a';mx.beginPath();mx.arc((cc+(r&1)*.5+.5)*sx,(r+.5)*sy,1.6,0,7);mx.fill()}
  // 화면에 보이는 곳
  const pts=[[0,74],[view.W,74],[view.W,view.H],[0,view.H]].map(([x,y])=>view.groundAt(x,y)).filter(Boolean);
  if(pts.length===4){mx.strokeStyle='#fff';mx.lineWidth=1.2;mx.beginPath();pts.forEach((p,k)=>{const X=p.x/Math.sqrt(3)*sx,Y=p.z/1.5*sy;k?mx.lineTo(X,Y):mx.moveTo(X,Y)});mx.closePath();mx.stroke()}}
mini.addEventListener('click',e=>{if(!S)return;const r=mini.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*mini.width,y=(e.clientY-r.top)/r.height*mini.height;const sx=mini.width/(S.W+.5),sy=mini.height/S.H;view.camGoal=new THREE.Vector3(x/sx*Math.sqrt(3),0,y/sy*1.5)});

/* ═══ 지도 끌기 · 확대 · 누르기 ═══ */
const cv=$('#map3d'),pts=new Map();let drag=null,pinch=null;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pts.size===1)drag={x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,moved:false,btn:e.button};
  if(pts.size===2){const [a,b]=[...pts.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),dist:view.dist};drag=null}});
cv.addEventListener('pointermove',e=>{if(pts.has(e.pointerId))pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinch&&pts.size===2){const [a,b]=[...pts.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);view.dist=Math.max(view.minDist,Math.min(view.maxDist,pinch.dist*pinch.d/Math.max(20,d)));return}
  if(drag){if(Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>7)drag.moved=true;if(drag.moved){const a=view.groundAt(drag.x,drag.y),b=view.groundAt(e.clientX,e.clientY);if(a&&b)view.pan(a.x-b.x,a.z-b.z);drag.x=e.clientX;drag.y=e.clientY}return}
  if(e.pointerType==='mouse'&&S&&sel&&sel.civ===S.player&&!busy){const i=view.pick(e.clientX,e.clientY);if(i!==hover){hover=i;if(i!=null&&i!==sel.at&&P().explored[i]&&!C.canAttack(S,sel,i)){const p=C.findPath(S,sel,i,{known:true});lastHoverPath=p;marks(p)}else if(lastHoverPath){lastHoverPath=null;marks()}}}});
const up=e=>{pts.delete(e.pointerId);if(pts.size<2)pinch=null;if(drag&&!drag.moved&&pts.size===0){if(drag.btn===2){sel=null;view.clearMarks();showUnit()}else clickTile(view.pick(e.clientX,e.clientY))}if(pts.size===0)drag=null};
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',e=>{pts.delete(e.pointerId);drag=null;pinch=null});
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('wheel',e=>{e.preventDefault();view.zoom(e.deltaY>0?1.1:1/1.1)},{passive:false});
const held=new Set();
addEventListener('keydown',e=>{if(!S||$('#start').hidden===false)return;if(e.target.tagName==='SELECT'||e.target.tagName==='INPUT')return;const k=e.key.toLowerCase();
  if(k==='escape'){if(!$('#modal').hidden&&!S.over)closeModal();else if(!$('#cityPanel').hidden)closeCity();else{sel=null;pendingAttack=null;hideTip();view.clearMarks();showUnit()}return}
  if(!$('#modal').hidden)return;
  if(k==='enter'){e.preventDefault();if(e.shiftKey)endTurn();else doNext();return}
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){held.add(k);e.preventDefault();return}
  if(k==='t')return openTech();if(k==='h'||k==='?')return openHelp();
  if(k==='+'||k==='=')return view.zoom(1/1.15);if(k==='-')return view.zoom(1.15);
  if(sel&&sel.civ===S.player){const map={b:'found',f:'fortify',' ':'skip',z:'sleep','1':'imp:farm','2':'imp:mine','3':'imp:lumber','4':'imp:road'};const a=map[k];if(a){e.preventDefault();if(a.startsWith('imp:')&&!C.canImprove(S,sel,a.slice(4)))return;if(a==='found'&&!C.canFound(S,sel))return;unitAct(a)}}
  if(k==='g')openDiplo()});
addEventListener('keyup',e=>held.delete(e.key.toLowerCase()));

/* ═══ 돌리기 ═══ */
let last=performance.now(),miniT=0;
function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;
  if(held.size){const sp=view.dist*.9*dt;let dx=0,dz=0;if(held.has('a')||held.has('arrowleft'))dx-=sp;if(held.has('d')||held.has('arrowright'))dx+=sp;if(held.has('w')||held.has('arrowup'))dz-=sp;if(held.has('s')||held.has('arrowdown'))dz+=sp;view.pan(dx,dz)}
  if(S){view.frame(dt);if((miniT-=dt)<=0){miniT=.4;drawMini()}}
  requestAnimationFrame(loop)}
requestAnimationFrame(loop);
startScreen();
// 주소에 ?quick 이 있으면 바로 새 게임 (시험용)
const q=new URLSearchParams(location.search);if(q.has('quick'))newGame({civ:'dent',size:q.get('size')||'normal',seed:+q.get('seed')||4242});
window.civDebug={get S(){return S},view,C,select,clickTile,endTurn,refresh,openCity,openTech,newGame,get sel(){return sel}};
})();
