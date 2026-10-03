/* 덴포토 문명 — 게임 규칙 (화면 없이 돌아가는 순수 로직, node 에서도 시험한다)
   - 육각 지도(odd-r 오프셋) · 지형 · 자원 · 보물상자 · 자연경관 '목표봉'
   - 문명 · 도시(성장 · 생산 · 영토 · 방어) · 유닛(이동 · 전투 · 개척 · 개간) · 기술 · 불가사의
   - 컴퓨터 문명 AI · 외교(전쟁/평화) · 승리(정복 · 목표자산 20억 · 점수)
   상태는 JSON 하나(state)로 저장/불러오기 된다. 무작위는 state.rs 를 쓰는 시드 난수라 같은 시드면 같은 지도가 나온다. */
(function(root){
'use strict';

/* ═══ 1. 자료 ═══ */
const TERRAIN={
  ocean:{name:'바다',f:1,p:0,g:0,move:99,water:true},
  coast:{name:'얕은 바다',f:1,p:0,g:1,move:99,water:true},
  grass:{name:'초원',f:2,p:0,g:0,move:1},
  plains:{name:'평원',f:1,p:1,g:0,move:1},
  desert:{name:'협곡 사암지',f:0,p:1,g:0,move:1},
  forest:{name:'숲',f:1,p:2,g:0,move:2,def:.25},
  hills:{name:'언덕',f:1,p:2,g:0,move:2,def:.25},
  mountain:{name:'산',f:0,p:0,g:0,move:99,block:true}};
const RESOURCES={
  wheat:{name:'밀',icon:'🌾',f:1,on:['grass','plains']},
  deer:{name:'사슴',icon:'🦌',f:1,on:['forest']},
  fish:{name:'물고기',icon:'🐟',f:2,on:['coast']},
  horses:{name:'말',icon:'🐎',p:1,g:1,on:['plains','grass']},
  stone:{name:'돌',icon:'🪨',p:1,on:['hills','desert','plains']},
  gold:{name:'금광',icon:'🪙',g:3,on:['hills','desert']},
  gems:{name:'보석',icon:'💎',g:3,on:['forest','hills']}};
const IMPROVE={
  farm:{name:'농장',icon:'🌱',f:1,turns:4,on:['grass','plains','desert'],tech:'agriculture'},
  mine:{name:'광산',icon:'⛏',p:1,turns:4,on:['hills','desert'],tech:'mining',bonus:['stone','gold','gems']},
  lumber:{name:'제재소',icon:'🪵',p:1,turns:4,on:['forest'],tech:'bronze'},
  road:{name:'도로',icon:'🛤',turns:2,tech:'wheel'}};
const UNITS={
  settler:{name:'개척자',icon:'🏕',cost:40,str:0,moves:2,civilian:true,found:true,desc:'새 도시를 세웁니다 (도시 인구 1 소모)'},
  worker:{name:'일꾼',icon:'⚒',cost:28,str:0,moves:2,civilian:true,work:true,desc:'농장 · 광산 · 제재소 · 도로를 짓습니다'},
  scout:{name:'우편배달부',icon:'🏍',cost:20,str:4,moves:4,sight:3,desc:'오토바이로 빠르게 지도를 밝힙니다'},
  warrior:{name:'전사',icon:'🗡',cost:20,str:8,moves:2},
  archer:{name:'궁수',icon:'🏹',cost:30,str:5,rs:8,range:2,moves:2,tech:'archery'},
  spear:{name:'창병',icon:'🔱',cost:35,str:11,moves:2,tech:'bronze',antiMounted:true,desc:'기마 유닛에 +50%'},
  horse:{name:'기마병',icon:'🐎',cost:42,str:12,moves:4,tech:'horseback',mounted:true},
  sword:{name:'검사',icon:'⚔',cost:50,str:16,moves:2,tech:'iron'},
  catapult:{name:'투석기',icon:'☄',cost:55,str:6,rs:15,range:2,moves:2,tech:'math',siege:true,desc:'도시 공격 +100%'},
  knight:{name:'기사',icon:'🛡',cost:70,str:21,moves:4,tech:'chivalry',mounted:true},
  musket:{name:'머스킷병',icon:'🎖',cost:85,str:27,moves:2,tech:'gunpowder'},
  cannon:{name:'대포',icon:'💣',cost:95,str:10,rs:26,range:2,moves:2,tech:'chemistry',siege:true,desc:'도시 공격 +100%'}};
const BUILDINGS={
  granary:{name:'곡물창고',icon:'🌾',cost:40,tech:'pottery',f:2},
  walls:{name:'성벽',icon:'🧱',cost:50,tech:'masonry',def:8,hp:100,desc:'도시 방어 +8 · 체력 +100'},
  workshop:{name:'공방',icon:'🔨',cost:55,tech:'bronze',p:2},
  post:{name:'우체국',icon:'✉',cost:55,tech:'wheel',g:2,s:1},
  library:{name:'도서관',icon:'📚',cost:60,tech:'writing',s:3},
  lighthouse:{name:'등대',icon:'🗼',cost:50,tech:'sailing',coastal:true,f:2,g:1},
  market:{name:'시장',icon:'🏪',cost:70,tech:'currency',g:3,gp:.25},
  dental:{name:'치과',icon:'🦷',cost:70,tech:'medicine',f:2,growth:.25,desc:'식량 +2 · 성장 25% 빠르게'},
  photo:{name:'사진관',icon:'📷',cost:65,tech:'optics',g:2,s:2,border:1,desc:'영토 한 칸 더 넓게'},
  university:{name:'대학',icon:'🎓',cost:120,tech:'education',s:4,sp:.33},
  bank:{name:'은행',icon:'🏦',cost:120,tech:'banking',g:4,gp:.25}};
const WONDERS={
  fountain:{name:'바람 분수',icon:'⛲',cost:110,tech:'masonry',f:4,model:'fountain'},
  dentlight:{name:'덴포토 등대',icon:'🗼',cost:130,tech:'sailing',coastal:true,f:3,g:3,model:'lighthouse'},
  tower:{name:'목표봉 전망탑',icon:'🗻',cost:150,tech:'math',s:6,model:'tower'},
  vault:{name:'억 돌파 석탑',icon:'💰',cost:220,tech:'banking',g:10,model:'vault'},
  balloon:{name:'풍선 축제',icon:'🎈',cost:200,tech:'chemistry',g:5,s:5,model:'balloon'}};
const TECHS={
  agriculture:{name:'농업',cost:0,req:[]},
  pottery:{name:'도자기',cost:24,req:['agriculture']},
  husbandry:{name:'목축',cost:24,req:['agriculture']},
  mining:{name:'채광',cost:24,req:['agriculture']},
  archery:{name:'활쏘기',cost:30,req:['agriculture']},
  wheel:{name:'바퀴',cost:45,req:['husbandry']},
  bronze:{name:'청동기',cost:45,req:['mining']},
  masonry:{name:'석조',cost:45,req:['mining']},
  writing:{name:'문자',cost:50,req:['pottery']},
  sailing:{name:'항해',cost:60,req:['pottery']},
  horseback:{name:'승마',cost:65,req:['wheel']},
  currency:{name:'화폐',cost:85,req:['bronze','writing']},
  math:{name:'수학',cost:85,req:['wheel','writing']},
  iron:{name:'철기',cost:95,req:['bronze']},
  medicine:{name:'의학',cost:115,req:['writing','pottery']},
  optics:{name:'광학',cost:115,req:['sailing','math']},
  education:{name:'교육',cost:165,req:['medicine','math']},
  chivalry:{name:'기사도',cost:165,req:['horseback','iron','currency']},
  banking:{name:'금융',cost:185,req:['currency','education']},
  gunpowder:{name:'화약',cost:225,req:['iron','education']},
  chemistry:{name:'화학',cost:260,req:['gunpowder','optics']},
  asset:{name:'자산 경영',cost:330,req:['banking','chemistry'],desc:'금고가 2,000(=20억)에 닿으면 목표자산 승리'}};
// 기술마다 여는 것 (도움말 · 기술 화면에 쓴다)
for(const k in TECHS)TECHS[k].unlocks=[];
for(const [k,u] of Object.entries(UNITS))if(u.tech)TECHS[u.tech].unlocks.push(u.icon+' '+u.name);
for(const [k,b] of Object.entries(BUILDINGS))TECHS[b.tech].unlocks.push(b.icon+' '+b.name);
for(const [k,w] of Object.entries(WONDERS))TECHS[w.tech].unlocks.push(w.icon+' '+w.name+'(불가사의)');
for(const [k,m] of Object.entries(IMPROVE))if(m.tech!=='agriculture')TECHS[m.tech].unlocks.push(m.icon+' '+m.name);
TECHS.asset.unlocks.push('🏆 목표자산 20억 승리');
const CIVS=[
  {key:'dent',name:'DentPhoto 마을',leader:'덴포토 촌장',color:'#e2563a',cities:['덴포토','바람골','우체국거리','사진관골목','치과마을','분수광장','등대언덕','편지골','억돌파','꽃바람','새봄','장미마을']},
  {key:'canyon',name:'협곡 부족',leader:'사암 족장',color:'#e0a13a',cities:['붉은협곡','헤어핀','사암성','낙석골','협곡특급','메아리골','황금절벽','바위문']},
  {key:'coast',name:'해안 연맹',leader:'등대지기',color:'#2f8fd0',cities:['푸른항구','물결','갈매기','모래톱','소라','해안길','파도마루','진주곶']},
  {key:'peak',name:'목표봉 왕국',leader:'봉우리 왕',color:'#8a5cd0',cities:['정상','구름성','눈꽃','바위산','고갯길','솔숲','별바라기','안개봉']},
  {key:'creek',name:'개울 공국',leader:'개울 공작',color:'#2fa36a',cities:['맑은개울','여울','갈대밭','징검다리','물레방아','버들골','흙탕마을','돌다리']}];
const PROJECTS={wealth:{name:'자산 운용',icon:'💹',cost:Infinity,desc:'생산력을 금으로 바꿉니다 (생산 1 → 금 0.8)'}};
const GOAL_GOLD=2000,MAX_TURN=250;

/* ═══ 2. 육각 격자 (odd-r: 홀수 줄이 반 칸 오른쪽) ═══ */
const NB=[[[1,0],[0,-1],[-1,-1],[-1,0],[-1,1],[0,1]],[[1,0],[1,-1],[0,-1],[-1,0],[0,1],[1,1]]];
function cube(c,r){const x=c-(r-(r&1))/2;return [x,r,-x-r]}
function hexDist(a,b,W){const ac=cube(a%W,(a/W)|0),bc=cube(b%W,(b/W)|0);return Math.max(Math.abs(ac[0]-bc[0]),Math.abs(ac[1]-bc[1]),Math.abs(ac[2]-bc[2]))}
function neighbors(i,W,H){const c=i%W,r=(i/W)|0,o=[];for(const [dc,dr] of NB[r&1]){const nc=c+dc,nr=r+dr;if(nc>=0&&nc<W&&nr>=0&&nr<H)o.push(nr*W+nc)}return o}
function within(i,R,W,H){const out=[],seen=new Set([i]);let ring=[i];out.push(i);for(let d=1;d<=R;d++){const nx=[];for(const t of ring)for(const n of neighbors(t,W,H))if(!seen.has(n)){seen.add(n);nx.push(n);out.push(n)}ring=nx}return out}

/* ═══ 3. 난수 ═══ */
function rng(S){S.rs=(S.rs+0x6D2B79F5)|0;let t=Math.imul(S.rs^S.rs>>>15,1|S.rs);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}
const ri=(S,n)=>Math.floor(rng(S)*n),pick=(S,a)=>a[ri(S,a.length)];

/* ═══ 4. 지도 만들기 ═══ */
function noiseField(S,W,H,scale){const gw=Math.ceil(W/scale)+2,gh=Math.ceil(H/scale)+2,g=[];for(let i=0;i<gw*gh;i++)g.push(rng(S));
  const sm=t=>t*t*(3-2*t);return (x,y)=>{x/=scale;y/=scale;const x0=Math.floor(x),y0=Math.floor(y),fx=sm(x-x0),fy=sm(y-y0),v=(a,b)=>g[(b+1)*gw+a+1]||0;
    return v(x0,y0)*(1-fx)*(1-fy)+v(x0+1,y0)*fx*(1-fy)+v(x0,y0+1)*(1-fx)*fy+v(x0+1,y0+1)*fx*fy}}
function genMap(S,W,H){
  const n1=noiseField(S,W,H,6),n2=noiseField(S,W,H,3),n3=noiseField(S,W,H,1.6),m1=noiseField(S,W,H,5),m2=noiseField(S,W,H,2.2);
  const el=[],tiles=[];
  for(let r=0;r<H;r++)for(let c=0;c<W;c++){const x=c+(r&1)/2,dx=(x/W-.5)*2,dy=(r/H-.5)*2,fall=Math.max(0,Math.hypot(dx*.92,dy*1.05));
    el.push(n1(x,r)*.55+n2(x,r)*.3+n3(x,r)*.15-fall*fall*.62)}
  const sorted=[...el].sort((a,b)=>a-b),sea=sorted[Math.floor(el.length*.54)],landEl=el.filter(e=>e>sea).sort((a,b)=>b-a),
    mt=landEl[Math.floor(landEl.length*.05)],hl=landEl[Math.floor(landEl.length*.2)];
  for(let i=0;i<W*H;i++){const c=i%W,r=(i/W)|0,x=c+(r&1)/2,e=el[i],m=m1(x,r)*.7+m2(x,r)*.3,lat=Math.abs(r/H-.5)*2;let t;
    if(e<=sea)t='ocean';else if(e>=mt)t='mountain';else if(e>=hl)t=m>.68?'forest':'hills';
    else if(m>.66)t='forest';else if(m<.3&&lat<.75)t='desert';else if(m<.46)t='plains';else t='grass';
    tiles.push({t,el:e})}
  for(let i=0;i<W*H;i++)if(tiles[i].t==='ocean'&&neighbors(i,W,H).some(n=>!TERRAIN[tiles[n].t].water))tiles[i].t='coast';
  // 가장 큰 땅덩이 (모든 문명이 여기서 시작한다 — 배가 없으니 서로 걸어서 만난다)
  const land=new Int32Array(W*H).fill(-1);let best=-1,bestN=0,id=0;
  for(let i=0;i<W*H;i++)if(land[i]<0&&!TERRAIN[tiles[i].t].water){let n=0;const st=[i];land[i]=id;while(st.length){const k=st.pop();n++;for(const nb of neighbors(k,W,H))if(land[nb]<0&&!TERRAIN[tiles[nb].t].water){land[nb]=id;st.push(nb)}}if(n>bestN){bestN=n;best=id}id++}
  for(let i=0;i<W*H;i++)tiles[i].main=land[i]===best;
  // 자원
  for(let i=0;i<W*H;i++){const T=tiles[i];const opts=Object.entries(RESOURCES).filter(([k,v])=>v.on.includes(T.t));if(opts.length&&rng(S)<(T.t==='coast'?.12:.13))T.res=pick(S,opts)[0]}
  // 자연경관 목표봉 — 가장 높은 산
  let top=-1;for(let i=0;i<W*H;i++)if(tiles[i].main&&tiles[i].t==='mountain'&&(top<0||tiles[i].el>tiles[top].el))top=i;
  if(top<0){for(let i=0;i<W*H;i++)if(tiles[i].main&&(top<0||tiles[i].el>tiles[top].el))top=i;tiles[top].t='mountain'}
  tiles[top].wonder='목표봉';delete tiles[top].res;
  for(const T of tiles)delete T.el;
  return tiles}
function startSpots(S,tiles,W,H,n){
  const val=i=>{let v=0;for(const k of within(i,2,W,H)){const T=tiles[k],y=tileYield(null,tiles,k);v+=y.f*1.3+y.p+y.g*.6+(T.res?1:0)}return v};
  const cand=[];for(let i=0;i<W*H;i++){const T=tiles[i],c=i%W,r=(i/W)|0;if(T.main&&!TERRAIN[T.t].water&&T.t!=='mountain'&&c>1&&c<W-2&&r>1&&r<H-2)cand.push({i,v:val(i)})}
  cand.sort((a,b)=>b.v-a.v);const good=cand.slice(0,Math.max(n*6,Math.floor(cand.length*.45)));
  let bestSet=null,bestScore=-1;
  for(let tries=0;tries<60;tries++){const set=[pick(S,good).i];while(set.length<n){let bi=-1,bd=-1;for(const g of good){const d=Math.min(...set.map(s=>hexDist(s,g.i,W)))+rng(S)*1.5;if(d>bd){bd=d;bi=g.i}}set.push(bi)}
    let md=99;for(let a=0;a<n;a++)for(let b=a+1;b<n;b++)md=Math.min(md,hexDist(set[a],set[b],W));const sc=md*10+set.reduce((s,i)=>s+val(i),0)*.15;if(sc>bestScore){bestScore=sc;bestSet=set}}
  for(const s of bestSet){if(tiles[s].t==='desert'||tiles[s].t==='hills'||tiles[s].t==='forest')tiles[s].t='plains';delete tiles[s].res;
    // 시작 자리 둘레에 밀 한 칸은 꼭
    const ring=neighbors(s,W,H).filter(k=>['grass','plains'].includes(tiles[k].t)&&!tiles[k].res);if(ring.length)tiles[pick(S,ring)].res='wheat'}
  return bestSet}

/* ═══ 5. 새 게임 ═══ */
function newGame(opt={}){
  const size=opt.size==='small'?{W:30,H:20,n:3}:opt.size==='large'?{W:48,H:30,n:5}:{W:38,H:24,n:4};
  const S={v:1,W:size.W,H:size.H,turn:1,rs:(opt.seed??(Date.now()%2147483647))|0,seed:0,civs:[],units:[],cities:[],uid:1,cid:1,wonders:{},war:{},log:[],events:[],
    difficulty:opt.difficulty||'normal',player:0,over:null};
  S.seed=S.rs;
  S.tiles=genMap(S,S.W,S.H);
  const n=Math.min(opt.civs||size.n,CIVS.length),pk=Math.max(0,CIVS.findIndex(c=>c.key===(opt.civ||'dent')));
  const order=[pk,...CIVS.map((c,i)=>i).filter(i=>i!==pk)].slice(0,n);
  const spots=startSpots(S,S.tiles,S.W,S.H,n);
  order.forEach((ci,k)=>{const C=CIVS[ci];S.civs.push({id:k,key:C.key,name:C.name,leader:C.leader,color:C.color,ai:k!==0||!!opt.allAI,gold:0,science:0,techs:['agriculture'],research:null,progress:0,
    names:[...C.cities],named:0,alive:true,met:[],explored:new Uint8Array(S.W*S.H),visible:new Uint8Array(S.W*S.H),capital:null,start:spots[k],warTurn:{}});
    const nb=neighbors(spots[k],S.W,S.H).filter(t=>passable(S,t)&&!S.units.some(u=>u.at===t));
    addUnit(S,k,'settler',spots[k]);addUnit(S,k,'warrior',spots[k]);addUnit(S,k,'scout',nb[0]??spots[k]);
    if(k!==0||opt.allAI)addUnit(S,k,'warrior',nb[1]??nb[0]??spots[k])});
  // 보물상자 (마을에서 모으던 보석 상자) — 시작 자리에서 떨어진 땅에
  for(let k=0,tries=0;k<Math.round(S.W*S.H/90)&&tries<600;tries++){const i=ri(S,S.W*S.H),T=S.tiles[i];if(!T.main||TERRAIN[T.t].water||T.t==='mountain'||T.ruin||T.res)continue;if(spots.some(s=>hexDist(s,i,S.W)<4))continue;T.ruin=true;k++}
  for(const c of S.civs)updateVision(S,c.id);
  return S}

/* ═══ 6. 지형 · 산출 ═══ */
function tileYield(S,tiles,i,civ){const T=tiles[i],tr=TERRAIN[T.t],y={f:tr.f,p:tr.p,g:tr.g,s:0};
  if(T.res){const R=RESOURCES[T.res];y.f+=R.f||0;y.p+=R.p||0;y.g+=R.g||0}
  if(T.imp&&T.imp!=='road'){const m=IMPROVE[T.imp];y.f+=m.f||0;y.p+=m.p||0;if(m.bonus&&T.res&&m.bonus.includes(T.res))y.p+=1}
  if(T.road&&!tr.water)y.g+=0; // 도로는 이동만 빠르게
  return y}
const passable=(S,i)=>{const t=TERRAIN[S.tiles[i].t];return !t.water&&!t.block};
function moveCost(S,from,to){const A=S.tiles[from],B=S.tiles[to];if(!passable(S,to))return 99;const ra=A.road||A.city!=null,rb=B.road||B.city!=null;if(ra&&rb)return 1/3;return TERRAIN[B.t].move}

/* ═══ 7. 유닛 ═══ */
function addUnit(S,civ,type,at){const u={id:S.uid++,civ,type,at,hp:100,moves:UNITS[type].moves,fort:0,sleep:false,goto:null,build:null,buildT:0,xp:0,acted:false};S.units.push(u);return u}
const unitsAt=(S,i)=>S.units.filter(u=>u.at===i);
const militaryAt=(S,i)=>S.units.find(u=>u.at===i&&!UNITS[u.type].civilian);
const civilianAt=(S,i)=>S.units.find(u=>u.at===i&&UNITS[u.type].civilian);
const cityAt=(S,i)=>S.tiles[i].city!=null?S.cities.find(c=>c.id===S.tiles[i].city):null;
const isWar=(S,a,b)=>a!==b&&!!S.war[a<b?a+'-'+b:b+'-'+a];
function setWar(S,a,b,on){const k=a<b?a+'-'+b:b+'-'+a;if(on)S.war[k]=S.turn;else delete S.war[k];S.civs[a].warTurn[b]=S.civs[b].warTurn[a]=S.turn}
function sight(u){return UNITS[u.type].sight||2}

// 들어갈 수 있는가 (공격 제외): 땅 · 쌓기 규칙 · 평화 중 남의 영토 금지
function canEnter(S,u,i){if(!passable(S,i))return false;const D=UNITS[u.type],T=S.tiles[i];
  if(T.owner!=null){const oc=S.cities.find(c=>c.id===T.owner);if(oc&&oc.civ!==u.civ&&!isWar(S,u.civ,oc.civ))return false}
  const city=cityAt(S,i);if(city&&city.civ!==u.civ)return false;
  for(const o of S.units)if(o.at===i&&o.id!==u.id){if(o.civ!==u.civ)return false;if(!!UNITS[o.type].civilian===!!D.civilian)return false}
  return true}
// 길찾기 (A*) — 비용은 이동력, 끝 칸은 공격 대상이어도 된다(attackOk)
function findPath(S,u,goal,opt={}){const W=S.W,H=S.H,start=u.at;if(start===goal)return [start];
  const g=new Map([[start,0]]),came=new Map(),open=[[hexDist(start,goal,W),start]],closed=new Set(),limit=opt.limit||400;let n=0;
  while(open.length&&n++<limit*6){let bi=0;for(let k=1;k<open.length;k++)if(open[k][0]<open[bi][0])bi=k;const [,cur]=open.splice(bi,1)[0];if(cur===goal)break;if(closed.has(cur))continue;closed.add(cur);
    for(const nb of neighbors(cur,W,H)){const isGoal=nb===goal;if(!passable(S,nb))continue;
      if(!(isGoal&&opt.attackOk)&&!canEnter(S,u,nb)){if(!(opt.ignoreUnits&&passable(S,nb)&&!cityAt(S,nb)))continue}
      if(opt.known&&!S.civs[u.civ].explored[nb])continue;
      const c=g.get(cur)+moveCost(S,cur,nb);if(c<(g.get(nb)??1e9)){g.set(nb,c);came.set(nb,cur);open.push([c+hexDist(nb,goal,W)*.34,nb])}}}
  if(!came.has(goal))return null;const p=[goal];let k=goal;while(k!==start){k=came.get(k);p.push(k)}return p.reverse()}
function pathCost(S,p){let c=0;for(let k=1;k<p.length;k++)c+=moveCost(S,p[k-1],p[k]);return c}
// 이번 턴에 닿을 수 있는 칸들 (이동력이 조금이라도 남으면 비싼 칸에도 들어갈 수 있다)
function reachable(S,u){const out=new Map([[u.at,u.moves]]),q=[u.at];if(u.moves<=0)return out;
  while(q.length){const cur=q.shift(),left=out.get(cur);if(left<=0)continue;for(const nb of neighbors(cur,S.W,S.H)){if(!canEnter(S,u,nb))continue;const rem=Math.max(0,left-moveCost(S,cur,nb));if(rem>(out.get(nb)??-1)){out.set(nb,rem);q.push(nb)}}}
  return out}
function stepUnit(S,u,to){const cost=moveCost(S,u.at,to);const from=u.at;u.at=to;u.moves=Math.max(0,u.moves-cost);u.fort=0;u.fortify=false;u.build=null;u.buildT=0;u.sleep=false;
  emit(S,{type:'move',unit:u.id,civ:u.civ,from,to});
  const T=S.tiles[to];
  if(T.ruin){T.ruin=false;ruinReward(S,u)}
  meetAround(S,u.civ,to);updateVision(S,u.civ)}
function ruinReward(S,u){const C=S.civs[u.civ],r=ri(S,4);let text;
  if(r===0){const g=35+ri(S,40);C.gold+=g;text=`보물상자에서 금 ${g}을 찾았어요`}
  else if(r===1){C.progress+=40;text='보물상자 속 옛 지도책 — 연구 +40'}
  else if(r===2){for(const k of within(u.at,6,S.W,S.H))C.explored[k]=1;text='보물상자 속 지도 — 주변 땅이 밝혀졌어요'}
  else{const free=neighbors(u.at,S.W,S.H).concat([u.at]).find(k=>passable(S,k)&&!militaryAt(S,k));if(free!=null){addUnit(S,u.civ,'warrior',free);text='보물상자에서 전사가 합류했어요'}else{C.gold+=40;text='보물상자에서 금 40을 찾았어요'}}
  note(S,u.civ,'💎 '+text,u.at)}
function moveTo(S,u,goal){if(u.moves<=0)return false;const p=findPath(S,u,goal);if(!p)return false;u.goto=goal;return followPath(S,u,p)}
function followPath(S,u,p){let moved=false;for(let k=1;k<p.length;k++){if(u.moves<=0)break;const nx=p[k];
    const enemyCiv=S.units.find(o=>o.at===nx&&o.civ!==u.civ);
    if(enemyCiv){if(!UNITS[enemyCiv.type].civilian||militaryAt(S,nx)||!isWar(S,u.civ,enemyCiv.civ)||UNITS[u.type].civilian)break;
      // 민간 유닛 사로잡기
      for(const o of unitsAt(S,nx).filter(o=>o.civ!==u.civ)){if(o.type==='settler'){o.type='worker'}o.civ=u.civ;o.moves=0;o.goto=null;note(S,u.civ,'일꾼을 사로잡았어요',nx);note(S,enemyCiv.civ,'일꾼/개척자를 빼앗겼어요',nx)}}
    if(!canEnter(S,u,nx))break;stepUnit(S,u,nx);moved=true;if(!S.units.includes(u))return moved}
  if(u.at===u.goto)u.goto=null;return moved}

/* ═══ 8. 전투 ═══ */
function unitStr(S,u,role,vs,tileI){const D=UNITS[u.type];let s=role==='ranged'?D.rs:D.str,m=1;
  if(role==='def'){const T=S.tiles[tileI??u.at];m+=TERRAIN[T.t].def||0;if(u.fort>0)m+=.25;}
  if(vs&&D.antiMounted&&UNITS[vs.type]&&UNITS[vs.type].mounted)m+=.5;
  if(vs==='city'&&D.siege)m+=1;
  m+=Math.min(.3,(u.xp||0)/100);
  return Math.max(.5,s*m*(.55+.45*u.hp/100))}
function cityStr(S,c){const C=S.civs[c.civ];let best=8;for(const [k,d] of Object.entries(UNITS))if(!d.civilian&&(!d.tech||C.techs.includes(d.tech)))best=Math.max(best,d.str);
  const gar=militaryAt(S,c.tile),walls=c.buildings.includes('walls')?BUILDINGS.walls.def:0;
  return (5+c.pop*1.1+best*.45+walls+(gar&&gar.civ===c.civ?unitStr(S,gar,'def')*.25:0)+(c.capital?2:0))*(.6+.4*c.hp/c.maxHp)}
const dmg=(S,a,d)=>Math.max(1,Math.round(28*Math.pow(a/d,1.2)*(.85+rng(S)*.3)));
// 미리보기 (UI 에서 공격 전 예상 피해를 보여 준다)
function preview(S,u,target){const D=UNITS[u.type],city=cityAt(S,target),def=militaryAt(S,target)||civilianAt(S,target),ranged=!!D.rs;
  if(city&&city.civ!==u.civ){const a=unitStr(S,u,ranged?'ranged':'atk','city'),d=cityStr(S,city);return {ranged,city:true,a,d,deal:Math.round(28*Math.pow(a/d,1.2)),take:ranged?0:Math.round(28*Math.pow(d/a,1.2))}}
  if(!def)return null;if(UNITS[def.type].civilian)return {ranged,capture:true,a:1,d:0,deal:100,take:0};
  const a=unitStr(S,u,ranged?'ranged':'atk',def),d=unitStr(S,def,'def',u);return {ranged,a,d,deal:Math.round(28*Math.pow(a/d,1.2)),take:ranged?0:Math.round(28*Math.pow(d/a,1.2))}}
function canAttack(S,u,target){const D=UNITS[u.type];if(D.civilian||u.moves<=0||u.acted)return false;const city=cityAt(S,target),def=S.units.find(o=>o.at===target&&o.civ!==u.civ);
  const foeCiv=city&&city.civ!==u.civ?city.civ:def?def.civ:null;if(foeCiv==null||!isWar(S,u.civ,foeCiv))return false;
  const d=hexDist(u.at,target,S.W);if(D.rs)return d<=D.range&&d>0;return d===1&&passable(S,target)}
function attack(S,u,target){if(!canAttack(S,u,target))return false;const D=UNITS[u.type],city=cityAt(S,target)&&cityAt(S,target).civ!==u.civ?cityAt(S,target):null;
  u.acted=true;u.fort=0;u.sleep=false;u.goto=null;const ranged=!!D.rs;
  if(city){const a=unitStr(S,u,ranged?'ranged':'atk','city'),d=cityStr(S,city),hit=dmg(S,a,d);
    city.hp=Math.max(ranged?1:0,city.hp-hit);let back=0;if(!ranged){back=dmg(S,d,a);u.hp-=back}
    emit(S,{type:'attack',from:u.at,to:target,unit:u.id,civ:u.civ,deal:hit,take:back,city:city.id});u.moves=0;u.xp+=4;
    if(u.hp<=0){killUnit(S,u,'공격하다 쓰러졌어요')}
    else if(!ranged&&city.hp<=0)captureCity(S,city,u);
    meetAround(S,u.civ,target);return true}
  const def=militaryAt(S,target)||civilianAt(S,target);if(!def)return false;
  if(UNITS[def.type].civilian){u.moves=0;if(ranged){killUnit(S,def,'공격을 받아 흩어졌어요');}else{followPath(S,Object.assign(u,{moves:1}),[u.at,target]);u.moves=0}return true}
  const a=unitStr(S,u,ranged?'ranged':'atk',def),d=unitStr(S,def,'def',u),hit=dmg(S,a,d),back=ranged?0:dmg(S,d,a);
  def.hp-=hit;u.hp-=back;def.fort=0;u.xp+=5;def.xp+=4;
  emit(S,{type:'attack',from:u.at,to:target,unit:u.id,civ:u.civ,deal:hit,take:back,target:def.id});u.moves=0;
  if(def.hp<=0){killUnit(S,def,'전투에서 쓰러졌어요');if(u.hp>0&&!ranged){const civ2=civilianAt(S,target);if(civ2&&civ2.civ!==u.civ){civ2.civ=u.civ;if(civ2.type==='settler')civ2.type='worker'}if(canEnter(S,u,target)){u.moves=1;stepUnit(S,u,target);u.moves=0}}}
  if(u.hp<=0)killUnit(S,u,'공격하다 쓰러졌어요');
  return true}
function killUnit(S,u,why){const i=S.units.indexOf(u);if(i<0)return;S.units.splice(i,1);emit(S,{type:'die',unit:u.id,at:u.at,civ:u.civ});note(S,u.civ,`${UNITS[u.type].name}이(가) ${why}`,u.at)}
function cityShoot(S,c){if(c.shot||c.hp<c.maxHp*.15)return null;const R=2;let best=null,bs=1e9;
  for(const o of S.units){if(o.civ===c.civ||!isWar(S,c.civ,o.civ))continue;if(hexDist(c.tile,o.at,S.W)>R)continue;const sc=o.hp+(UNITS[o.type].civilian?50:0);if(sc<bs){bs=sc;best=o}}
  if(!best)return null;const a=cityStr(S,c)*.9,d=unitStr(S,best,'def'),hit=dmg(S,a,d);best.hp-=hit;c.shot=true;
  emit(S,{type:'attack',from:c.tile,to:best.at,city:c.id,civ:c.civ,deal:hit,take:0,target:best.id,fromCity:true});
  if(best.hp<=0)killUnit(S,best,'도시의 화살에 쓰러졌어요');return best}

/* ═══ 9. 도시 ═══ */
function cityName(S,civ){const C=S.civs[civ];const n=C.names[C.named%C.names.length]+(C.named>=C.names.length?' '+(1+Math.floor(C.named/C.names.length)):'');C.named++;return n}
function canFound(S,u){if(!UNITS[u.type].found)return false;const T=S.tiles[u.at];if(!passable(S,u.at)||T.city!=null)return false;
  if(T.owner!=null&&S.cities.find(c=>c.id===T.owner).civ!==u.civ)return false;return !S.cities.some(c=>hexDist(c.tile,u.at,S.W)<3)}
function foundCity(S,u){if(!canFound(S,u))return null;const C=S.civs[u.civ],first=!S.cities.some(c=>c.civ===u.civ)&&C.capital==null;
  const c={id:S.cid++,civ:u.civ,name:cityName(S,u.civ),tile:u.at,pop:1,food:0,prod:0,build:null,buildings:[],hp:200,maxHp:200,capital:first,origCap:first,founder:u.civ,shot:false,radius:1,worked:[],born:S.turn};
  S.cities.push(c);S.tiles[u.at].city=c.id;S.tiles[u.at].imp=null;S.tiles[u.at].ruin=false;if(first)C.capital=c.id;
  const i=S.units.indexOf(u);S.units.splice(i,1);claim(S,c);assignWork(S,c);c.build=aiPickBuild(S,c,true);
  emit(S,{type:'found',city:c.id,civ:c.civ,at:c.tile});note(S,c.civ,`🏠 새 도시 ${c.name}을(를) 세웠어요`,c.tile);meetAround(S,c.civ,c.tile);updateVision(S,c.civ);return c}
function claim(S,c){const R=Math.min(3,(c.pop>=3?2:1)+(c.buildings.includes('photo')?1:0));c.radius=R;
  for(const k of within(c.tile,R,S.W,S.H)){const T=S.tiles[k];if(T.owner==null)T.owner=c.id}S.tiles[c.tile].owner=c.id}
function cityTiles(S,c){return within(c.tile,3,S.W,S.H).filter(k=>S.tiles[k].owner===c.id&&k!==c.tile&&!TERRAIN[S.tiles[k].t].block)}
function assignWork(S,c){const tiles=cityTiles(S,c).filter(k=>{const o=S.units.find(u=>u.at===k&&u.civ!==c.civ);return !o});
  const sc=k=>{const y=tileYield(S,S.tiles,k);return y.f*1.5+y.p*1.15+y.g*.7};tiles.sort((a,b)=>sc(b)-sc(a));c.worked=tiles.slice(0,c.pop)}
const coastal=(S,c)=>neighbors(c.tile,S.W,S.H).some(k=>S.tiles[k].t==='coast'||S.tiles[k].t==='ocean');
function nearPeak(S,c){return within(c.tile,2,S.W,S.H).some(k=>S.tiles[k].wonder)}
function cityYield(S,c){const y={f:2,p:1,g:1,s:1+c.pop*.5};{const ct=tileYield(S,S.tiles,c.tile);y.f=Math.max(2,ct.f)+(ct.f>=2?1:0);y.p=Math.max(1,ct.p)+(ct.p>=1?0:0)+1;y.g+=ct.g}
  for(const k of c.worked){const t=tileYield(S,S.tiles,k);y.f+=t.f;y.p+=t.p;y.g+=t.g}
  let gp=0,sp=0;for(const b of c.buildings){const B=BUILDINGS[b]||WONDERS[b];if(!B)continue;y.f+=B.f||0;y.p+=B.p||0;y.g+=B.g||0;y.s+=B.s||0;gp+=B.gp||0;sp+=B.sp||0}
  if(nearPeak(S,c)){y.s+=3;y.g+=2}
  if(c.capital){y.g+=2;y.p+=1}
  const C=S.civs[c.civ];if(C.techs.includes('asset'))gp+=.25;
  const bonus=C.ai?{easy:.85,normal:1,hard:1.3}[S.difficulty]:{easy:1.15,normal:1,hard:1}[S.difficulty];
  y.p=y.p*bonus;y.g=y.g*(1+gp);y.s=y.s*(1+sp)*bonus;
  y.eat=c.pop*2;y.surplus=y.f-y.eat;return y}
const foodBox=c=>12+Math.round(8*(c.pop-1)+Math.pow(c.pop-1,1.6));
function itemCost(item){return (item.kind==='unit'?UNITS:item.kind==='building'?BUILDINGS:item.kind==='project'?PROJECTS:WONDERS)[item.id].cost}
function canBuild(S,c,item){const C=S.civs[c.civ];if(item.kind==='project')return !!PROJECTS[item.id];
  if(item.kind==='unit'){const D=UNITS[item.id];if(D.tech&&!C.techs.includes(D.tech))return false;if(item.id==='settler'&&c.pop<2)return false;return true}
  if(item.kind==='building'){const B=BUILDINGS[item.id];return !c.buildings.includes(item.id)&&C.techs.includes(B.tech)&&(!B.coastal||coastal(S,c))}
  const Wd=WONDERS[item.id];return !S.wonders[item.id]&&C.techs.includes(Wd.tech)&&(!Wd.coastal||coastal(S,c))&&!S.cities.some(o=>o.id!==c.id&&o.civ===c.civ&&o.build&&o.build.kind==='wonder'&&o.build.id===item.id)}
function buildOptions(S,c){const o=[];for(const k in UNITS)o.push({kind:'unit',id:k});for(const k in BUILDINGS)o.push({kind:'building',id:k});for(const k in WONDERS)o.push({kind:'wonder',id:k});o.push({kind:'project',id:'wealth'});return o.filter(it=>canBuild(S,c,it))}
function buyCost(S,c){if(!c.build)return 0;if(c.build.kind==='wonder'||c.build.kind==='project')return Infinity;return Math.round((itemCost(c.build)-c.prod)*2.2+12)}
function buy(S,c){const cost=buyCost(S,c),C=S.civs[c.civ];if(!c.build||cost>C.gold||c.boughtTurn===S.turn)return false;C.gold-=cost;c.prod=itemCost(c.build);c.boughtTurn=S.turn;finishBuild(S,c);return true}
function finishBuild(S,c){const it=c.build;if(!it||c.prod<itemCost(it))return false;const C=S.civs[c.civ];
  if(it.kind==='unit'){const D=UNITS[it.id];let at=c.tile;
    if(D.civilian?civilianAt(S,c.tile):militaryAt(S,c.tile)){const free=neighbors(c.tile,S.W,S.H).find(k=>{const tmp={civ:c.civ,type:it.id,id:-1};return canEnter(S,tmp,k)});if(free==null)return false;at=free}
    if(it.id==='settler'){if(c.pop<2)return false;c.pop--;assignWork(S,c)}
    const u=addUnit(S,c.civ,it.id,at);u.moves=0;note(S,c.civ,`${c.name}: ${D.icon} ${D.name} 완성`,c.tile,{city:c.id,unit:u.id});emit(S,{type:'built',city:c.id,civ:c.civ,unit:u.id})}
  else if(it.kind==='building'){c.buildings.push(it.id);if(it.id==='walls'){c.maxHp+=BUILDINGS.walls.hp;c.hp+=BUILDINGS.walls.hp}if(it.id==='photo')claim(S,c);note(S,c.civ,`${c.name}: ${BUILDINGS[it.id].icon} ${BUILDINGS[it.id].name} 완성`,c.tile,{city:c.id});emit(S,{type:'built',city:c.id,civ:c.civ})}
  else{if(S.wonders[it.id]){c.prod=0;c.build=null;return false}S.wonders[it.id]={civ:c.civ,city:c.id,turn:S.turn};c.buildings.push(it.id);
    note(S,S.player,`🌟 ${C.name}의 ${c.name}에서 불가사의 ${WONDERS[it.id].name}을(를) 완성했어요`,c.tile,{city:c.id,wonder:true});emit(S,{type:'built',city:c.id,civ:c.civ,wonder:it.id})}
  c.prod-=itemCost(it);c.prod=Math.max(0,Math.min(c.prod,20));c.build=null;return true}
function processCity(S,c){const C=S.civs[c.civ],y=cityYield(S,c);
  c.shot=false;c.hp=Math.min(c.maxHp,c.hp+(c.hp<c.maxHp?18:0));
  // 성장
  let surplus=y.surplus;if(surplus>0&&c.buildings.includes('dental'))surplus*=1.25;
  if(c.build&&c.build.kind==='unit'&&c.build.id==='settler'&&surplus>0)surplus*=.5;
  c.food+=surplus;
  if(c.food>=foodBox(c)){c.food-=foodBox(c);c.food=c.buildings.includes('granary')?Math.min(c.food+foodBox(c)*.2,foodBox(c)*.5):c.food;c.pop++;const r0=c.radius;claim(S,c);assignWork(S,c);if(!C.ai)note(S,c.civ,`${c.name}의 인구가 ${c.pop}(으)로 늘었어요`,c.tile,{city:c.id,quiet:true});if(c.radius>r0)updateVision(S,c.civ)}
  else if(c.food<0){if(c.pop>1){c.pop--;c.food=foodBox(c)*.5;assignWork(S,c);note(S,c.civ,`${c.name}이(가) 굶주려 인구가 줄었어요`,c.tile,{city:c.id})}else c.food=0}
  // 생산
  if(c.build&&!canBuild(S,c,c.build)){if(c.build.kind==='wonder'&&S.wonders[c.build.id])note(S,c.civ,`${c.name}: 다른 문명이 먼저 ${WONDERS[c.build.id].name}을(를) 지었어요`,c.tile,{city:c.id});
    if(!(c.build.kind==='unit'&&c.build.id==='settler'&&c.pop<2))c.build=null}
  if(!c.build&&C.ai)c.build=aiPickBuild(S,c);
  if(c.build&&c.build.kind==='project'){C.gold+=Math.round(y.p*.8)}else{c.prod+=y.p;if(!c.build)c.prod=Math.min(c.prod,80);finishBuild(S,c)}
  if(!c.build){c.build=C.ai?aiPickBuild(S,c):null;if(!C.ai)note(S,c.civ,`${c.name}: 무엇을 만들지 정해 주세요`,c.tile,{city:c.id,needs:true})}
  return y}

/* ═══ 10. 기술 · 시야 · 만남 ═══ */
function canResearch(S,civ,k){const C=S.civs[civ];return !C.techs.includes(k)&&TECHS[k].req.every(r=>C.techs.includes(r))}
const techCost=(S,k)=>Math.round(TECHS[k].cost*1.9*({small:.85,normal:1,large:1.15}[S.W<34?'small':S.W>44?'large':'normal']));
function civIncome(S,civ){let g=0,s=0,f=0,p=0;for(const c of S.cities)if(c.civ===civ){const y=cityYield(S,c);g+=y.g;s+=y.s;f+=y.f;p+=y.p}
  const units=S.units.filter(u=>u.civ===civ).length,cities=S.cities.filter(c=>c.civ===civ).length,upkeep=Math.max(0,units-(3+cities*2));
  return {gold:g-upkeep,science:s,food:f,prod:p,upkeep}}
function updateVision(S,civ){const C=S.civs[civ];C.visible.fill(0);const see=(i,R)=>{for(const k of within(i,R,S.W,S.H)){C.visible[k]=1;C.explored[k]=1}};
  for(const u of S.units)if(u.civ===civ)see(u.at,sight(u));for(const c of S.cities)if(c.civ===civ){see(c.tile,c.radius+1)}}
function meetAround(S,civ,at){for(const k of within(at,3,S.W,S.H)){const T=S.tiles[k];const others=new Set();for(const u of S.units)if(u.at===k&&u.civ!==civ)others.add(u.civ);
    if(T.owner!=null){const oc=S.cities.find(c=>c.id===T.owner);if(oc&&oc.civ!==civ)others.add(oc.civ)}
    for(const o of others)meet(S,civ,o)}}
function meet(S,a,b){const A=S.civs[a],B=S.civs[b];if(A.met.includes(b))return;A.met.push(b);B.met.push(a);
  note(S,a,`🤝 ${B.name}(${B.leader})을(를) 만났어요`,null);note(S,b,`🤝 ${A.name}(${A.leader})을(를) 만났어요`,null)}
function power(S,civ){let p=0;for(const u of S.units)if(u.civ===civ&&!UNITS[u.type].civilian)p+=(UNITS[u.type].str+(UNITS[u.type].rs||0)*.6)*u.hp/100;for(const c of S.cities)if(c.civ===civ)p+=cityStr(S,c)*.6;return p}
function declareWar(S,a,b){if(isWar(S,a,b)||a===b)return;setWar(S,a,b,true);meet(S,a,b);for(const o of S.civs)if(o.alive&&(o.met.includes(a)||o.id===a||o.id===b))note(S,o.id,`⚔ ${S.civs[a].name}이(가) ${S.civs[b].name}에 전쟁을 선포했어요`,null,{war:true})}
function makePeace(S,a,b){if(!isWar(S,a,b))return;setWar(S,a,b,false);
  // 평화가 되면 남의 영토 안에 있던 유닛은 가장 가까운 자기 도시로 돌아간다
  for(const u of S.units){const T=S.tiles[u.at];if(T.owner==null)continue;const oc=S.cities.find(c=>c.id===T.owner);if(!oc||oc.civ===u.civ||(oc.civ!==a&&oc.civ!==b)||(u.civ!==a&&u.civ!==b))continue;
    const home=S.cities.filter(c=>c.civ===u.civ).sort((x,y)=>hexDist(x.tile,u.at,S.W)-hexDist(y.tile,u.at,S.W))[0];if(home){const spot=[home.tile,...within(home.tile,2,S.W,S.H)].find(k=>canEnter(S,u,k));if(spot!=null){u.at=spot;u.goto=null}}}
  for(const o of S.civs)if(o.alive&&(o.met.includes(a)||o.id===a||o.id===b))note(S,o.id,`🕊 ${S.civs[a].name}과(와) ${S.civs[b].name}이(가) 평화 협정을 맺었어요`,null);updateVision(S,a);updateVision(S,b)}
function aiAcceptsPeace(S,ai,other){const t=S.turn-(S.war[ai<other?ai+'-'+other:other+'-'+ai]||S.turn);return t>=8&&power(S,ai)<power(S,other)*1.35}

/* ═══ 11. 도시 점령 · 문명 탈락 · 승리 ═══ */
function captureCity(S,c,u){const old=c.civ,O=S.civs[old],N=S.civs[u.civ];
  for(const o of unitsAt(S,c.tile).filter(o=>o.civ!==u.civ))killUnit(S,o,'도시와 함께 무너졌어요');
  c.civ=u.civ;c.pop=Math.max(1,Math.ceil(c.pop/2));c.food=0;c.prod=0;c.build=null;c.hp=Math.round(c.maxHp*.35);c.buildings=c.buildings.filter(b=>b!=='walls');c.maxHp=200;c.hp=Math.min(c.hp,c.maxHp);
  if(c.capital){c.capital=false;O.capital=null;const next=S.cities.find(x=>x.civ===old&&x.id!==c.id);if(next){next.capital=true;O.capital=next.id}}
  // 영토 안 타일은 그대로 이 도시 몫
  emit(S,{type:'move',unit:u.id,civ:u.civ,from:u.at,to:c.tile});u.at=c.tile;u.moves=0;u.fort=0;u.goto=null;assignWork(S,c);c.build=aiPickBuild(S,c);
  emit(S,{type:'capture',city:c.id,civ:u.civ,from:old});note(S,u.civ,`🏰 ${c.name}을(를) 점령했어요!`,c.tile,{city:c.id});note(S,old,`💥 ${c.name}을(를) ${N.name}에게 빼앗겼어요`,c.tile,{city:c.id});
  for(const o of S.civs)if(o.id!==u.civ&&o.id!==old&&o.met.includes(u.civ))note(S,o.id,`${N.name}이(가) ${O.name}의 ${c.name}을(를) 점령했어요`,null);
  if(!S.cities.some(x=>x.civ===old)){O.alive=false;for(const x of S.units.filter(x=>x.civ===old))S.units.splice(S.units.indexOf(x),1);for(const k in S.war)if(k.split('-').map(Number).includes(old))delete S.war[k];
    for(const o of S.civs)note(S,o.id,`☠ ${O.name}이(가) 역사 속으로 사라졌어요`,null,{war:true})}
  updateVision(S,u.civ);updateVision(S,old);checkVictory(S)}
function score(S,civ){const C=S.civs[civ];let s=0;for(const c of S.cities)if(c.civ===civ)s+=10+c.pop*4+c.buildings.length*3;s+=C.techs.length*6;for(const k in S.wonders)if(S.wonders[k].civ===civ)s+=25;s+=Math.floor(C.gold/50);return Math.round(s)}
function checkVictory(S){if(S.over)return S.over;
  const alive=S.civs.filter(c=>c.alive);
  // 정복: 다른 문명의 첫 수도를 모두 차지 (또는 다른 문명이 모두 사라짐)
  for(const C of alive){if(!S.cities.some(c=>c.civ===C.id))continue;const others=S.civs.filter(o=>o.id!==C.id);
    if(others.length&&others.every(o=>{const cap=S.cities.find(c=>c.origCap&&c.founder===o.id);return !o.alive||!!cap&&cap.civ===C.id})){S.over={civ:C.id,kind:'정복',turn:S.turn};break}}
  if(!S.over)for(const C of alive)if(C.techs.includes('asset')&&C.gold>=GOAL_GOLD){S.over={civ:C.id,kind:'목표자산 20억',turn:S.turn};break}
  if(!S.over&&!S.civs[S.player].alive)S.over={civ:alive[0]?alive[0].id:-1,kind:'정복',turn:S.turn,lost:true};
  if(!S.over&&S.turn>MAX_TURN){let b=alive[0];for(const C of alive)if(score(S,C.id)>score(S,b.id))b=C;S.over={civ:b.id,kind:'점수',turn:S.turn}}
  if(S.over)emit(S,{type:'over',over:S.over});return S.over}

/* ═══ 12. 알림 · 이벤트 ═══ */
function note(S,civ,text,at,extra){if(civ!==S.player)return;S.log.push(Object.assign({turn:S.turn,civ,text,at},extra||{}));if(S.log.length>200)S.log.splice(0,S.log.length-200)}
function emit(S,e){S.events.push(e);if(S.events.length>600)S.events.splice(0,S.events.length-600)}

/* ═══ 13. 일꾼 ═══ */
function canImprove(S,u,kind){const D=UNITS[u.type],T=S.tiles[u.at],M=IMPROVE[kind],C=S.civs[u.civ];if(!D.work||!M)return false;if(!C.techs.includes(M.tech))return false;if(T.city!=null)return false;
  if(kind==='road')return !T.road;if(T.imp===kind)return false;if(!M.on.includes(T.t))return false;
  if(T.owner==null)return false;const oc=S.cities.find(c=>c.id===T.owner);return oc&&oc.civ===u.civ}
function startImprove(S,u,kind){if(!canImprove(S,u,kind))return false;u.build=kind;u.buildT=0;u.goto=null;u.sleep=false;u.moves=0;workStep(S,u);return true}
function workStep(S,u){if(!u.build)return;u.buildT++;const M=IMPROVE[u.build];if(u.buildT>=M.turns){const T=S.tiles[u.at];if(u.build==='road')T.road=true;else T.imp=u.build;
    emit(S,{type:'improve',at:u.at,civ:u.civ,kind:u.build});note(S,u.civ,`${M.icon} ${M.name} 완성`,u.at,{quiet:true});u.build=null;u.buildT=0;
    for(const c of S.cities)if(c.civ===u.civ)assignWork(S,c)}}

/* ═══ 14. 턴 진행 ═══ */
function startTurnFor(S,civ){const C=S.civs[civ];
  for(const u of S.units)if(u.civ===civ){
    const full=UNITS[u.type].moves,rested=u.moves>=full&&!u.acted;
    if(rested&&u.hp<100){const T=S.tiles[u.at],own=T.owner!=null&&S.cities.find(c=>c.id===T.owner).civ===civ,inCity=T.city!=null&&own;u.hp=Math.min(100,u.hp+(inCity?25:own?15:10))}
    if(u.build)workStep(S,u);
    if(u.fort>0||(rested&&!u.build&&!u.goto&&u.fort===0&&u.fortify))u.fort++;
    u.moves=u.build?0:full;u.acted=false}
  for(const u of [...S.units])if(u.civ===civ&&u.goto!=null&&S.units.includes(u)){const p=findPath(S,u,u.goto);if(p)followPath(S,u,p);else u.goto=null}
  updateVision(S,civ)}
function endCivTurn(S,civ){const C=S.civs[civ];if(!C.alive)return;
  for(const c of S.cities.filter(c=>c.civ===civ)){cityShoot(S,c)}
  for(const c of S.cities.filter(c=>c.civ===civ))processCity(S,c);
  const inc=civIncome(S,civ);C.gold=Math.max(0,C.gold+inc.gold);
  if(!C.research||C.techs.includes(C.research))C.research=C.ai?aiPickTech(S,civ):null;
  if(C.research){C.progress+=inc.science;const cost=techCost(S,C.research);if(C.progress>=cost){C.progress-=cost;C.techs.push(C.research);note(S,civ,`🔬 ${TECHS[C.research].name} 연구 완료${TECHS[C.research].unlocks.length?' — '+TECHS[C.research].unlocks.join(', '):''}`,null,{tech:C.research});
      emit(S,{type:'tech',civ,tech:C.research});C.research=C.ai?aiPickTech(S,civ):null;if(!C.ai)note(S,civ,'다음 연구할 기술을 골라 주세요',null,{needsTech:true})}}
}
// 플레이어가 '턴 종료'를 누르면: 플레이어 도시 처리 → 컴퓨터 문명 차례 → 새 턴
function endTurn(S){if(S.over)return;S.events.length=0;
  if(S.civs[S.player].ai)aiTurn(S,S.player);
  endCivTurn(S,S.player);
  for(const C of S.civs)if(C.ai&&C.alive&&C.id!==S.player){startTurnFor(S,C.id);aiTurn(S,C.id);endCivTurn(S,C.id)}
  S.turn++;checkVictory(S);
  if(!S.over){const P=S.civs[S.player];if(P.alive)startTurnFor(S,S.player)}
  return S.events}
function idleUnits(S,civ){return S.units.filter(u=>u.civ===civ&&u.moves>0&&!u.acted&&!u.sleep&&!u.build&&u.fort===0&&!u.fortify&&u.goto==null)}

/* ═══ 15. 컴퓨터 문명 ═══ */
function aiPickTech(S,civ){const C=S.civs[civ];const opts=Object.keys(TECHS).filter(k=>canResearch(S,civ,k));if(!opts.length)return null;
  const pref={pottery:1.2,mining:1.1,bronze:1.2,writing:1.25,currency:1.2,archery:1.1,masonry:1.05,math:1.1,iron:1.1,education:1.2,banking:1.2,asset:1.4,medicine:1.05};
  opts.sort((a,b)=>techCost(S,a)/(pref[a]||1)-techCost(S,b)/(pref[b]||1));return C.ai?opts[ri(S,Math.min(2,opts.length))]:opts[0]}
function aiPickBuild(S,c,fresh){const C=S.civs[c.civ],opts=buildOptions(S,c),has=k=>opts.find(o=>o.id===k);
  const my=S.units.filter(u=>u.civ===c.civ),mil=my.filter(u=>!UNITS[u.type].civilian),cities=S.cities.filter(x=>x.civ===c.civ),
    settlers=my.filter(u=>u.type==='settler').length+cities.filter(x=>x!==c&&x.build&&x.build.id==='settler').length,
    workers=my.filter(u=>u.type==='worker').length+cities.filter(x=>x!==c&&x.build&&x.build.id==='worker').length,
    atWar=S.civs.some(o=>o.alive&&isWar(S,c.civ,o.id)),garrison=militaryAt(S,c.tile);
  const bestMil=(ranged)=>{let b=null;for(const o of opts)if(o.kind==='unit'){const D=UNITS[o.id];if(D.civilian||o.id==='scout')continue;if(!!D.rs!==!!ranged)continue;const v=(D.rs||D.str)/Math.sqrt(D.cost);if(!b||v>b.v)b={o,v}}return b&&b.o};
  const want=Math.round(S.W*S.H/(95*S.civs.length))+2;
  if(fresh&&cities.length===1&&!garrison)return bestMil()||{kind:'unit',id:'warrior'};
  if(!garrison&&mil.length<cities.length+1)return bestMil();
  if(atWar&&mil.length<cities.length*3+2)return rng(S)<.35&&bestMil(true)?bestMil(true):bestMil();
  if(has('settler')&&settlers===0&&cities.length<want&&c.pop>=2&&(c.capital||rng(S)<.5))return has('settler');
  if(workers<Math.ceil(cities.length*.8)&&has('worker'))return has('worker');
  if(S.turn<10&&my.filter(u=>u.type==='scout').length<1)return has('scout');
  if(mil.length<cities.length*1.6+1)return rng(S)<.3&&bestMil(true)?bestMil(true):bestMil();
  const order=['walls','granary','library','post','workshop','market','lighthouse','dental','photo','university','bank'];
  if(C.ai&&C.techs.includes('asset'))order.unshift('market','bank','post');
  const bs=opts.filter(o=>o.kind==='building').sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
  if(bs.length&&(bs[0].id!=='walls'||atWar||c.capital||cities.length>2))return bs[0];
  const ws=opts.filter(o=>o.kind==='wonder');if(ws.length&&(c.capital||rng(S)<.4))return pick(S,ws);
  if(bs.length)return bs[0];
  if(mil.length>=cities.length*2.2+1&&!atWar)return {kind:'project',id:'wealth'};
  return rng(S)<.5?bestMil():bestMil(true)||bestMil()}
function aiSettleSpot(S,u){const C=S.civs[u.civ];let best=null,bs=-1e9;
  for(const k of within(u.at,9,S.W,S.H)){const T=S.tiles[k];if(!passable(S,k)||T.city!=null)continue;if(T.owner!=null&&S.cities.find(c=>c.id===T.owner).civ!==u.civ)continue;
    if(S.cities.some(c=>hexDist(c.tile,k,S.W)<4))continue;if(S.units.some(o=>o.id!==u.id&&o.type==='settler'&&o.civ===u.civ&&o.target!=null&&hexDist(o.target,k,S.W)<4))continue;
    let v=0;for(const n of within(k,2,S.W,S.H)){const t=S.tiles[n];if(t.owner!=null&&S.cities.find(c=>c.id===t.owner).civ!==u.civ)continue;const y=tileYield(S,S.tiles,n);v+=y.f*1.4+y.p+y.g*.6+(t.wonder?4:0)}
    if(neighbors(k,S.W,S.H).some(n=>S.tiles[n].t==='coast'))v+=3;const own=S.cities.filter(c=>c.civ===u.civ);const dHome=own.length?Math.min(...own.map(c=>hexDist(c.tile,k,S.W))):0;
    v-=hexDist(u.at,k,S.W)*1.4+Math.max(0,dHome-6)*3;if(v>bs){bs=v;best=k}}
  return best}
function aiTurn(S,civ){const C=S.civs[civ];if(!C.alive)return;
  if(!C.research)C.research=aiPickTech(S,civ);
  // 외교
  if(S.turn%4===civ%4)for(const oid of C.met){const O=S.civs[oid];if(!O.alive)continue;const mine=power(S,civ),theirs=power(S,oid);
    if(!isWar(S,civ,oid)){const lastPeace=C.warTurn[oid]||0,mod={easy:.6,normal:1,hard:1.4}[S.difficulty];
      if(S.turn>=(oid===S.player?{easy:70,normal:45,hard:30}[S.difficulty]:35)&&S.turn-lastPeace>15&&mine>theirs*1.35&&rng(S)<.22*mod)declareWar(S,civ,oid)}
    else if(oid!==S.player&&aiAcceptsPeace(S,civ,oid)&&aiAcceptsPeace(S,oid,civ)&&rng(S)<.3)makePeace(S,civ,oid)
    else if(oid===S.player&&aiAcceptsPeace(S,civ,oid)&&mine<theirs*.7&&!S.peaceOffer&&rng(S)<.25)S.peaceOffer={from:civ,turn:S.turn}}
  const enemies=S.civs.filter(o=>o.alive&&isWar(S,civ,o.id)).map(o=>o.id);
  const myCities=S.cities.filter(c=>c.civ===civ);
  for(const u of [...S.units.filter(u=>u.civ===civ)]){if(!S.units.includes(u))continue;const D=UNITS[u.type];
    try{
    if(D.found){if(!myCities.length&&S.turn<=2||!S.cities.some(c=>c.civ===civ)){if(canFound(S,u)){foundCity(S,u);continue}}
      if(u.target==null||!canFoundAt(S,u,u.target))u.target=aiSettleSpot(S,u);
      if(u.target==null){u.target=null;continue}
      if(u.at===u.target){if(canFound(S,u))foundCity(S,u);else u.target=null;continue}
      const p=findPath(S,u,u.target);if(p){followPath(S,u,p);if(u.at===u.target&&canFound(S,u))foundCity(S,u)}else u.target=null;continue}
    if(D.work){if(u.build)continue;aiWorker(S,u);continue}
    if(u.type==='scout'&&!enemies.length){aiExplore(S,u);continue}
    aiMilitary(S,u,enemies,myCities)}catch(e){if(typeof console!=='undefined')console.error('AI',e)}}
  // 도시는 끝날 때 쏜다 (endCivTurn)
}
function canFoundAt(S,u,k){const T=S.tiles[k];if(!passable(S,k)||T.city!=null)return false;if(T.owner!=null&&S.cities.find(c=>c.id===T.owner).civ!==u.civ)return false;return !S.cities.some(c=>hexDist(c.tile,k,S.W)<4)}
function aiWorker(S,u){const C=S.civs[u.civ];let best=null,bs=-1e9;
  for(const c of S.cities)if(c.civ===u.civ)for(const k of c.worked.concat(cityTiles(S,c))){const T=S.tiles[k];if(T.imp)continue;
    let kind=null;if(['grass','plains'].includes(T.t))kind=T.res==='horses'||T.res==='stone'&&C.techs.includes('mining')?'mine':'farm';if(T.t==='hills'||T.t==='desert'&&T.res)kind='mine';if(T.t==='forest'&&C.techs.includes('bronze'))kind='lumber';if(T.t==='desert'&&!T.res)kind='farm';
    if(kind==='mine'&&!IMPROVE.mine.on.includes(T.t))kind='farm';if(!kind||!C.techs.includes(IMPROVE[kind].tech))continue;
    if(S.units.some(o=>o.id!==u.id&&o.civ===u.civ&&o.type==='worker'&&(o.at===k&&o.build||o.target===k)))continue;
    const v=(c.worked.includes(k)?6:2)-hexDist(u.at,k,S.W);if(v>bs){bs=v;best={k,kind}}}
  if(!best){if(C.techs.includes('wheel')&&!S.tiles[u.at].road&&S.tiles[u.at].owner!=null&&canImprove(S,u,'road')){startImprove(S,u,'road');return}aiRetreat(S,u);return}
  u.target=best.k;if(u.at!==best.k){const p=findPath(S,u,best.k);if(p)followPath(S,u,p)}
  if(u.at===best.k&&u.moves>0){if(!startImprove(S,u,best.kind))u.target=null}}
function aiExplore(S,u){const C=S.civs[u.civ];// 가장 가까운 안 가 본 땅 가장자리
  let best=null,bd=1e9;for(let k=0;k<S.W*S.H;k++){if(!C.explored[k]||!passable(S,k))continue;if(!neighbors(k,S.W,S.H).some(n=>!C.explored[n]))continue;const d=hexDist(u.at,k,S.W)+rng(S)*2;if(d<bd&&d>0){bd=d;best=k}}
  if(best==null){aiRetreat(S,u);return}const p=findPath(S,u,best,{limit:600});if(p)followPath(S,u,p);else{const n=neighbors(u.at,S.W,S.H).filter(k=>canEnter(S,u,k));if(n.length)followPath(S,u,[u.at,pick(S,n)])}}
function aiRetreat(S,u){const home=S.cities.filter(c=>c.civ===u.civ).sort((a,b)=>hexDist(a.tile,u.at,S.W)-hexDist(b.tile,u.at,S.W))[0];if(!home)return;
  if(hexDist(home.tile,u.at,S.W)<=1)return;const goal=[home.tile,...neighbors(home.tile,S.W,S.H)].find(k=>canEnter(S,u,k));if(goal==null)return;const p=findPath(S,u,goal);if(p)followPath(S,u,p)}
function aiMilitary(S,u,enemies,myCities){const D=UNITS[u.type];
  // 도시 지키기: 비어 있는 자기 도시가 있으면 가장 가까운 유닛이 들어간다
  const here=cityAt(S,u.at);if(here&&here.civ===u.civ){const others=S.units.filter(o=>o.at===u.at&&o.id!==u.id&&!UNITS[o.type].civilian);
    const threat=enemies.length&&S.units.some(o=>enemies.includes(o.civ)&&hexDist(o.at,u.at,S.W)<=3);
    if(!others.length&&(threat||S.units.filter(o=>o.civ===u.civ&&!UNITS[o.type].civilian).length<=myCities.length*1.2||rng(S)<.6)){
      if(D.rs){const t=bestTarget(S,u,enemies);if(t!=null&&canAttack(S,u,t))attack(S,u,t)}else{const t=bestTarget(S,u,enemies,true);if(t!=null&&canAttack(S,u,t)&&goodOdds(S,u,t))attack(S,u,t)}
      if(u.moves>0&&!u.acted)u.fortify=true;return}}
  u.fortify=false;
  const empty=myCities.find(c=>!militaryAt(S,c.tile)&&hexDist(c.tile,u.at,S.W)<=8);if(empty&&!D.rs||empty&&D.rs&&!enemies.length){const p=findPath(S,u,empty.tile);if(p){followPath(S,u,p);return}}
  if(enemies.length){
    if(u.hp<45&&!here){aiRetreat(S,u);return}
    const t=bestTarget(S,u,enemies);if(t!=null&&canAttack(S,u,t)&&(D.rs||goodOdds(S,u,t))){attack(S,u,t);return}
    // 공격 목표: 가장 가까운 적 도시, 근처 적 유닛
    const foeUnits=S.units.filter(o=>enemies.includes(o.civ)&&hexDist(o.at,u.at,S.W)<=5);
    const foeCities=S.cities.filter(c=>enemies.includes(c.civ)).sort((a,b)=>hexDist(a.tile,u.at,S.W)-hexDist(b.tile,u.at,S.W));
    let goal=foeUnits.length?foeUnits.sort((a,b)=>hexDist(a.at,u.at,S.W)-hexDist(b.at,u.at,S.W))[0].at:foeCities.length?foeCities[0].tile:null;
    if(goal!=null){const army=S.units.filter(o=>o.civ===u.civ&&!UNITS[o.type].civilian&&hexDist(o.at,u.at,S.W)<=3).length;
      if(!foeUnits.length&&army<3&&hexDist(goal,u.at,S.W)<=4&&rng(S)<.6)return; // 모일 때까지 기다린다
      const p=findPath(S,u,goal,{attackOk:true,limit:500});
      if(p&&p.length>1){const stopAt=D.rs?Math.max(1,p.length-1-D.range):p.length-1;followPath(S,u,p.slice(0,stopAt+1));
        const t2=bestTarget(S,u,enemies);if(t2!=null&&canAttack(S,u,t2)&&(D.rs||goodOdds(S,u,t2)))attack(S,u,t2)}
      return}}
  // 평화로울 때: 빈 도시를 지키거나 영토 안을 돌거나 쉰다
  if(u.type==='scout'){aiExplore(S,u);return}
  if(rng(S)<.15){const n=neighbors(u.at,S.W,S.H).filter(k=>canEnter(S,u,k)&&S.tiles[k].owner!=null&&cityOwner(S,k)===u.civ);if(n.length)followPath(S,u,[u.at,pick(S,n)])}
  else if(!here)aiRetreat(S,u)}
function cityOwner(S,k){const T=S.tiles[k];if(T.owner==null)return null;const c=S.cities.find(c=>c.id===T.owner);return c?c.civ:null}
function bestTarget(S,u,enemies,meleeOnly){const D=UNITS[u.type],R=D.rs?D.range:1;let best=null,bs=-1e9;
  for(const k of within(u.at,R,S.W,S.H)){if(k===u.at||!canAttack(S,u,k))continue;const pv=preview(S,u,k);if(!pv)continue;
    const city=cityAt(S,k);const v=pv.deal-pv.take*.8+(city?10:0)+(pv.capture?30:0);if(v>bs){bs=v;best=k}}
  return best}
function goodOdds(S,u,t){const pv=preview(S,u,t);if(!pv)return false;if(pv.capture)return true;if(pv.city){const c=cityAt(S,t);return pv.deal>=c.hp||pv.take<u.hp*.6}return pv.deal>=pv.take*.9&&pv.take<u.hp}

/* ═══ 16. 저장 ═══ */
function save(S){return JSON.stringify(S,(k,v)=>v instanceof Uint8Array?{__u8:Array.from(v).join('')}:k==='events'?[]:v)}
function load(txt){const S=JSON.parse(txt,(k,v)=>v&&typeof v==='object'&&typeof v.__u8==='string'?Uint8Array.from(v.__u8,ch=>+ch):v);if(!S||S.v!==1)throw new Error('저장 형식이 달라요');S.events=[];return S}

const api={PROJECTS,TERRAIN,RESOURCES,IMPROVE,UNITS,BUILDINGS,WONDERS,TECHS,CIVS,GOAL_GOLD,MAX_TURN,
  neighbors,within,hexDist,newGame,tileYield,passable,moveCost,canEnter,findPath,pathCost,reachable,moveTo,followPath,
  unitsAt,militaryAt,civilianAt,cityAt,isWar,declareWar,makePeace,aiAcceptsPeace,preview,canAttack,attack,canFound,foundCity,
  cityYield,foodBox,itemCost,canBuild,buildOptions,buyCost,buy,cityTiles,cityStr,canResearch,techCost,civIncome,updateVision,
  canImprove,startImprove,endTurn,startTurnFor,idleUnits,score,checkVictory,power,save,load,aiPickBuild,rng};
root.CIV=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
