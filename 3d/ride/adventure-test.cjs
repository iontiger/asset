const assert=require('node:assert/strict');const {Ride}=require('./game-core.js'),A=require('./adventure.js');
function tick(r,keys,n=1){for(let i=0;i<n;i++)r.update(1/60,new Set(keys))}
let r=new Ride();r.start();r.items=[];r.pos=25000;r.speed=320;r.energy=30;tick(r,['w']);assert(r.drifting,'Hairpin drift is automatic');assert(r.drifted.size===0);tick(r,['w'],70);assert(r.drifting);assert(r.drifted.size===1);assert(r.score>=300);assert(r.energy>65);const score=r.score;tick(r,['w'],10);assert.equal(r.score,score,'One award per hairpin');
r=new Ride();r.start();const rock=r.items.find(x=>x.type==='rock');r.pos=rock.z-1;r.speed=300;r.player=rock.x+(rock.radius*.82)/9;r.falling.set(rock.id,1);tick(r,[]);assert(r.events.some(x=>x.type==='graze'));assert(!r.crashing);
r=new Ride();r.start();const rock2=r.items.find(x=>x.type==='rock');r.pos=rock2.z-1;r.speed=300;r.player=rock2.x+(rock2.radius+.7)/9;r.falling.set(rock2.id,1);tick(r,[]);assert(r.events.some(x=>x.type==='nearMiss'));assert(r.score>0);const missScore=r.score;tick(r,[]);assert.equal(r.score,missScore);
r=new Ride();r.start();r.items=[];r.jumping=true;r.airY=.08;r.airV=-9;r.flightY=require('./game-core.js').roadHeight(r.pos)+.08;r.speed=200;tick(r,['e']);assert(r.events.some(x=>x.type==='perfectLand'));assert(r.bonusTime>0);assert(r.score>=500);
r=new Ride();r.start();r.items=[];r.jumping=true;r.airY=8;r.airV=0;r.flightY=8;r.speed=180;tick(r,['e']);tick(r,['e'],120);assert(!r.events.some(x=>x.type==='perfectLand'));assert.equal(r.score,0,'Holding E early must not auto-perfect');
r=new Ride();r.start();r.pos=19500;assert(r.chooseBranch('cliff'));r.pos=21500;assert(!r.chooseBranch('safe'));assert.equal(r.branchChoice,'cliff');assert.equal(A.branchOffset(20000,'safe'),0);assert.equal(A.branchOffset(40000,'safe'),0);assert(A.branchOffset(30000,'safe')<0&&A.branchOffset(30000,'cliff')===0);
let safeLength=0,cliffLength=0;for(let s=20000;s<40000;s++){safeLength+=1/A.travelScale(s,'safe');cliffLength+=1/A.travelScale(s,'cliff')}assert(safeLength>cliffLength,'Cliff branch must be physically shorter');
r=new Ride();r.start();r.pos=26000;r.branchChoice='safe';const obstacle={type:'rock',z:26001,x:0,id:999,radius:2.5};r.items=[obstacle];r.speed=300;r.falling.set(999,1);tick(r,[]);assert(!r.crashing);r.pos=26000;r.branchChoice='cliff';tick(r,[]);assert(r.crashing);
r=new Ride();r.start();r.items=[];r.pos=31000;r.branchChoice='cliff';r.speed=420;tick(r,['w'],30);assert.equal(Math.round(r.speed/2),250,'Canyon auto-cruises at 250 km/h');const beforeBrake=r.speed;tick(r,['arrowdown'],2);assert(r.speed<beforeBrake,'Down arrow brakes in canyon');
r.pos=0;r.reward(200,'nearMiss');r.reward(300,'drift');assert(r.combo===2);tick(r,[],600);assert.equal(r.combo,0);r.start();assert.equal(r.score,0);assert.equal(r.rockPassed.size,0);assert.equal(r.branchChoice,'cliff');assert(!r.drifting);
// 폭설 평원: 느려지고 미끄럽고, 협곡에는 낙석이 없다
assert(!new Ride().items.some(o=>o.type==='rock'&&o.z>A.fork.start&&o.z<A.fork.end),'No rocks in the canyon fork');
assert(A.snowAmt(92000)===1&&A.snowAmt(84500)===0&&A.snowAmt(100000)===0,'Snow only between the pier and the lighthouse');
r=new Ride();r.start();r.items=[];r.pos=88000;r.speed=400;tick(r,['w'],240);assert(r.events.length>=0&&r.speed<240,'Deep snow caps the speed');assert(r.inSnow);
const snowSpeed=r.speed;tick(r,['w','d'],40);const p1=r.player;tick(r,['w'],12);assert(r.player>p1,'Bike keeps sliding after steering is released');
r=new Ride();r.start();r.items=[];r.pos=70500;r.speed=400;tick(r,['w'],60);assert(r.speed>390,'Normal road keeps full speed');
// 뉴욕 시내: 게이트 정지 · 신호/과속 감점 · 정체 차단 · 터치 자동정지
{const C=require('./city.js');const run=(mode,auto)=>{const q=new Ride();q.start();q.items=[];q.branchChoice='safe';q.pos=19000;q.speed=480;q.autoStop=!!auto;const ev=[];let t=0,minGate=Infinity,blocked=false;const k=new Set(['w']);
 while(q.pos<40500&&t<400){q.update(1/60,k);t+=1/60;ev.push(...q.events);const u=C.uOf(q.pos);if(u>20&&u<45)minGate=Math.min(minGate,q.speed);if(u>C.jam.u0&&u<C.jam.u1&&q.speed<1&&q.player>-.2)blocked=true;
  const nl=C.nextLight(q);k.clear();if(mode==='careful'){if(nl&&nl.s.state!=='green'&&nl.dist<30&&nl.dist>0)k.add('s');else if(q.speed<118)k.add('w')}else k.add('w')}
 return {q,ev,t,minGate,blocked}};
 const careful=run('careful'),reckless=run('reckless'),auto=run('reckless',true);
 assert(careful.q.pos>=40000,'Careful rider leaves the city');assert(careful.minGate<2,'Gate light stops the bike at 0 km/h');
 assert(!careful.ev.some(x=>x.type==='penalty'),'Careful rider is never fined');assert(!careful.ev.some(x=>x.type==='letter'),'No letters in the NYC streets');assert(careful.blocked,'Cars ahead in the jam block the bike');
 const pens=reckless.ev.filter(x=>x.type==='penalty');assert(pens.some(x=>x.kind==='signal'&&x.points===-200),'Red light costs 200');assert(pens.some(x=>x.kind==='speed'&&x.points===-150),'Speeding costs 150');
 assert(!auto.ev.some(x=>x.type==='penalty'),'Touch auto-stop never runs a red');
 const c=new Ride();c.start();c.items=[];c.branchChoice='cliff';c.pos=31000;c.speed=420;tick(c,['w'],30);assert.equal(Math.round(c.speed/2),250,'Canyon still cruises at 250')}
{const E=require('./city-env.js'),at=p=>E.env(p);assert.equal(Math.round(at(0).hour),12);assert.equal(Math.round(at(1).hour)%24,12,'Leaves the city at noon');assert(at(.5).dark>.95&&at(0).dark<.01&&at(1).dark<.01,'Night falls in the middle');
 assert.deepEqual([.1,.35,.6,.9].map(p=>at(p).season),['spring','summer','autumn','winter']);assert(at(.38).rain>.9&&at(.38).season==='summer','Summer downpour');assert(at(.88).snow>.9&&at(.88).season==='winter','Winter blizzard');
 let h=12,turned=0;for(let p=.01;p<=1;p+=.01){const x=at(p).hour;if(x<h-12)turned++;else assert(x>=h-1e-9,'Clock only moves forward');h=x}assert.equal(turned,1,'Clock passes midnight once')}
{const N=require('./city-npc.js').PEOPLE;assert.equal(N.length,18,'18 named NPCs walk the city');assert.equal(new Set(N.map(n=>n[0])).size,18);assert(N.some(n=>n[0]==='클라라'))}
{const fs=require('fs'),path=require('path'),D=path.join(__dirname,'nyc'),man=JSON.parse(fs.readFileSync(path.join(D,'nyc.json'))),bin=fs.statSync(path.join(D,'nyc.bin')).size;   // 블렌더 뉴욕 키트
 for(const k of ['car','taxi','lamp','hydrant','trash','mailbox','fire_escape'])assert(man.meshes[k],'kit has '+k);
 for(const [k,e] of Object.entries(man.meshes)){for(const a of ['pos','nor','uv'])assert(e[a][0]%4===0&&e[a][0]+e[a][1]*4<=bin,k+' '+a+' in bin');assert(e.idx[0]+e.idx[1]*(e.i32?4:2)<=bin);assert(e.tris<=2000,k+' stays light')}
 for(const st of ['brick','lime','deco','glass']){assert(man.kits[st]&&man.meshes[st+'_up']&&man.meshes[st+'_gr']&&man.meshes[st+'_co']);for(const t of ['c','m','n','fc','fm','fn'])assert(fs.existsSync(path.join(D,st+'_'+t+'.jpg')),st+'_'+t)}
 for(const f of ['asphalt_c.jpg','asphalt_n.jpg','walk_c.jpg','walk_n.jpg','city_1k.hdr','CREDITS.md'])assert(fs.existsSync(path.join(D,f)),f);
 {const Q=require('./ride-post.js');assert(Q.Grade&&typeof Q.make==='function')}
 const R=require('./city-real.js');assert.equal(R.styleOf({glass:true,h:40,col:'#4f6b85'}),'glass');assert.equal(R.styleOf({glass:false,h:40,col:'#8f4e3d'}),'brick');assert.equal(R.styleOf({glass:false,h:40,col:'#d6cfc1'}),'lime');assert.equal(R.styleOf({glass:false,h:120,col:'#8f4e3d'}),'deco')}
// 살아 있는 거리: 맞은편 차도 빨간불이면 교차로 건너편 정지선 앞에서 선다 · 시내 소리 · city-life 모듈
{const fs=require('fs'),path=require('path'),C=require('./city.js');const st=C.newState(),L=C.lights.find(l=>l.cross!==undefined);st.lights[L.i].state='red';st.lights[L.i].done=true;
 st.cars=[{id:0,k:L.k,d:L.cross+C.WALK+4.5+2.6+30,lane:-1,v:7,flow:true}];const r={pos:C.sOf(5),speed:0,player:0,mode:'paused',city:st,events:[]};
 for(let i=0;i<200;i++)C.update(r,.05);const c=st.cars[0];assert(c.v<.05&&c.d>=L.cross+C.WALK+4.5+2.6-1.1,'oncoming car waits at its stop line '+c.d.toFixed(1));
 st.lights[L.i].state='green';for(let i=0;i<60;i++)C.update(r,.05);assert(st.cars[0].v>3,'and drives on when green');
 const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');assert(html.indexOf('city-life.js')>html.indexOf('city-npc.js')&&html.indexOf('city-life.js')<html.indexOf('city-scene.js'));
 assert(typeof require('./city-life.js').build==='function');
 for(const f of ['city-ts.js','city-wet.js'])assert(html.indexOf(f)>html.indexOf('city-life.js')&&html.indexOf(f)<html.indexOf('city-scene.js'),f);
 {const PJ=JSON.parse(fs.readFileSync(path.join(__dirname,'nyc','people.json'))),pb=fs.statSync(path.join(__dirname,'nyc','people.bin')).size;for(const k of ['torso','coat','head','hair_s','hair_l','arm','hand','thigh','shin']){const e=PJ.meshes[k];assert(e&&e.col&&e.idx[0]+e.idx[1]*(e.i32?4:2)<=pb,'people '+k)}
  const CP=require('./city-people.js');assert.deepEqual(PJ.joints.hip,[.092,0,.93]);assert.deepEqual(CP.J.hip,[.092,.93,0]);assert(html.indexOf('city-people.js')<html.indexOf('city-life.js'))}
 for(const f of fs.readdirSync(path.join(__dirname,'nyc')).filter(f=>f.endsWith('.jpg')))assert(fs.existsSync(path.join(__dirname,'nyc','s',f)),'phone texture '+f);
 {const TS=require('./city-ts.js');assert(TS.STOCKS.length>=8&&['logo','stocks','musical','iny','news','wave','ride'].every(k=>typeof TS.DRAW[k]==='function'));assert(typeof require('./city-wet.js').attach==='function')}const au=fs.readFileSync(path.join(__dirname,'ride-audio.js'),'utf8');for(const k of ['city(','horn(','siren(','chirp('])assert(au.includes(' '+k),k)}
{const fs=require('fs'),path=require('path');const gif=fs.readFileSync(path.join(__dirname,'nyc','loading.gif'));assert(gif.slice(0,6).toString()==='GIF89a'&&gif.length<400000,'NYC loading gif');
 const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8'),gjs=fs.readFileSync(path.join(__dirname,'game.js'),'utf8');assert(html.includes('id="city-loading"')&&html.includes('nyc/loading.gif'),'loading overlay in html');
 assert(/function prepCity\(\)/.test(gjs)&&gjs.includes("cityPrep.state==='loading'")&&gjs.includes('compileAsync'),'city prep pauses and precompiles')}
{// 풀숲 충격 뒤 손을 떼면(폰) 도로 안쪽으로 튕겨 나가고, 눈길에서도 다시 풀숲에 끌려가지 않는다
 for(const [start,side] of [[3000,1],[3000,-1],[90000,1],[90000,-1]]){const g=new Ride();g.start();g.items=[];g.pos=start;g.speed=380;let hit=false,t=0;const into=side>0?'arrowright':'arrowleft';
  while(t<6&&!hit){g.update(1/60,new Set(['arrowup',into]));t+=1/60;hit=g.events.some(e=>e.type==='grass');g.events.length=0}assert(hit,'grass hit '+start);
  let again=0;for(let k=0;k<240;k++){g.update(1/60,new Set(['arrowup']));if(g.events.some(e=>e.type==='grass'))again++;g.events.length=0}
  assert.equal(again,0,'no repeated grass hits after release '+start+' '+side);assert(Math.abs(g.player)<.75,'bounced toward the road center '+start+' '+side+' '+g.player)}}
{// 지진(3회차부터): 기본은 꺼져 있고, 켜면 첫 점프 뒤 ~ 갈림길 전에 길이 기울며 솟아(끝에서 뛰어내림) · 땅덩이가 솟아 길 일부를 막고 · 바위가 굴러오며, 잘 피하면 부딪히지 않는다
 const G=require('./game-core.js');assert(G.QUAKE.start>G.JUMPS[0]+620&&G.QUAKE.end<A.fork.start,'quake zone between first jump and fork');assert(G.RAMPS.length>=3&&G.BLOCKS.length>=8&&G.BOULDERS.length>=6);
 for(const R of G.RAMPS)assert(R.z0>G.QUAKE.start&&R.z0+R.len<G.QUAKE.end,'ramp inside quake zone');
 for(const k of G.BLOCKS)assert(k.x0>-1.25&&k.x1<1.25&&(k.x0>-1||k.x1<1),'block leaves a gap '+k.z);
 const run=(on,smart)=>{const q=new Ride();q.start();q.quakeOn=on;q.items=q.items.filter(o=>o.type!=='rock');q.pos=G.QUAKE.start-600;q.speed=380;const ev={};let t=0,vmax=0,lift=0,maxSlope=0;
  const pred=(st,b,T)=>{let x=st.x,v=st.v;for(let k=0;k<T;k+=1/60){if(x*b.side>-2.7){v=Math.min(2.5,v+1.3/60);x-=b.side*v/60}}return x};
  while(q.pos<G.QUAKE.end+400&&t<120){let k=[];
   if(smart){let best=null;
    for(const b of G.BLOCKS){const d=b.z-q.pos;if(d<-40||d>900)continue;const g=[[-1.1,b.x0-.12],[b.x1+.12,1.1]].filter(g=>g[1]-g[0]>.05).sort((A,B)=>Math.abs((A[0]+A[1])/2-q.player)-Math.abs((B[0]+B[1])/2-q.player))[0];best={d,tg:Math.max(g[0],Math.min(g[1],q.player))};break}
    for(const b of G.BOULDERS){const st=q.boulders.get(b.id);if(!st||b.z<q.pos-30||b.z-q.pos>900)continue;const d=b.z-q.pos;if(best&&best.d<d)break;const px=pred(st,b,d/(q.speed*1.35+1));best={d,tg:Math.abs(px)>1.6?0:px>0?Math.max(-.9,px-.75):Math.min(.9,px+.75)};break}
    if(best)k=q.player<best.tg-.05?['arrowright']:q.player>best.tg+.05?['arrowleft']:[];if(q.jumping&&q.airV<0&&q.airY<3)k.push('e')}
   q.update(1/60,new Set(['arrowup',...k]));t+=1/60;lift=Math.max(lift,q.liftY);maxSlope=Math.max(maxSlope,q.liftSlope);for(const st of q.boulders.values())vmax=Math.max(vmax,st.v);for(const e of q.events)ev[e.type]=(ev[e.type]||0)+1}return {ev,vmax,lift,maxSlope}};
 const off=run(false,false);assert(!off.ev.quakeIn&&!off.ev.boulder&&!off.ev.quakeRamp&&!off.ev.quakeBlock&&off.lift===0,'no quake by default');
 const on=run(true,false);assert.equal(on.ev.quakeIn,1);assert.equal(on.ev.quakeOut,1);assert.equal(on.ev.boulder,G.BOULDERS.length);assert(on.vmax>2,'boulders accelerate under gravity');
 assert.equal(on.ev.quakeRamp,G.RAMPS.length);assert.equal(on.ev.quakeLaunch,G.RAMPS.length,'every ramp ends in a jump down');assert.equal(on.ev.quakeBlock,G.BLOCKS.length);assert(on.lift>7&&on.maxSlope>.1,'ground rises steeply under the bike');assert(on.ev.hit>=1,'driving straight hits a risen block');
 const smart=run(true,true);assert(!smart.ev.hit,'blocks and boulders can be dodged');assert.equal(smart.ev.perfectLand>=G.RAMPS.length,true,'ramp jumps land with E timing')}
console.log('PASS: manual drift, rewards, glancing hits, near misses, perfect landing, anti-hold timing, branch lock, shorter cliff route, safe-route collision suppression, combos, restart, snow plain, rock-free canyon, NYC lights/cameras/jam, NYC 24h seasons, NYC Blender kit, NYC street life, Times Square, puddles, people kit, phone textures, city loading GIF, grass bounce, earthquake');
