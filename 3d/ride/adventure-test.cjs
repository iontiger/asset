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
console.log('PASS: manual drift, rewards, glancing hits, near misses, perfect landing, anti-hold timing, branch lock, shorter cliff route, safe-route collision suppression, combos, restart, snow plain, rock-free canyon, NYC lights/cameras/jam, NYC 24h seasons');
