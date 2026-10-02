const assert=require('node:assert/strict');
const {Ride,LANDMARKS}=require('./game-core.js');
const r=new Ride(),keys=new Set();const step=(frames=1)=>{for(let i=0;i<frames;i++)r.update(1/60,keys)};
assert.equal(r.mode,'ready');r.start();keys.add('w');step(120);assert(r.speed>100);assert(r.pos>0);
keys.add('d');step(15);assert(r.player>0);keys.delete('d');keys.add(' ');step(20);assert(r.energy<100);
r.pause();const frozen=r.pos;step(60);assert.equal(r.pos,frozen);r.start();assert.equal(r.mode,'playing');assert.equal(r.pos,frozen);
keys.clear();r.pos=599;r.speed=200;r.player=0;step();assert.equal(r.letters,1);assert(r.collected.has(0));step();assert.equal(r.letters,1);
r.pos=1049;r.speed=200;r.player=Math.sin(.8)*.78;r.hit=0;r.falling.set(1000,1);step();assert(r.speed<150);assert(r.hit>0);assert(r.crashing);step(30);assert(r.airY>3);r.pause();const frozenAir=r.airY;step(30);assert.equal(r.airY,frozenAir);r.start();step(120);assert(!r.crashing);assert.equal(r.airY,0);assert(Math.abs(r.player)<.1);
r.pos=1699;r.speed=200;step();assert(r.visited.has(0));
r.pos=r.length-1;r.speed=200;step();assert.equal(r.mode,'finished');assert.equal(r.visited.size,7);
r.start();assert.equal(r.pos,0);assert.equal(r.letters,0);assert.equal(r.energy,100);assert.equal(r.visited.size,0);assert.equal(r.collected.size,0);
keys.add('w');r.player=1.05;r.speed=180;step();assert(r.events.some(e=>e.type==='grass'));assert(r.player<.97);assert(r.airV>0);step(20);assert(r.airY>0);step(90);assert(r.speed>0,'Grass bounce must allow riding again');
assert.equal(LANDMARKS.length,7);assert(LANDMARKS.every(l=>Math.abs(l.x)>1));
// Ride the whole course with deterministic lane targeting, proving collectibles remain reachable.
r.start();r.items=r.items.filter(o=>o.type==='letter');for(let i=0;i<30000&&r.mode==='playing';i++){const next=r.items.filter(o=>o.type==='letter'&&o.z>=r.pos).sort((a,b)=>a.z-b.z)[0];r.player=next?.x||0;step()}
assert.equal(r.mode,'finished');assert(r.letters>=12);assert.equal(r.visited.size,7);
console.log('PASS: acceleration, steering, boost, pause/resume, collection, collision, landmarks, full-course completion, restart, off-road drag');

const vm=require('node:vm'),fs=require('node:fs'),THREE=require('./vendor/three.min.js');
const scope={window:{THREE},document:{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})}};
vm.runInNewContext(fs.readFileSync('village-landmarks.js','utf8'),scope);
for(const name of scope.window.VillageModels.names){const model=scope.window.VillageModels.create(name);let count=0;model.traverse(o=>{if(o.isMesh)count++});assert(count>0);const bounds=new THREE.Box3().setFromObject(model);assert(Number.isFinite(bounds.max.y)&&bounds.max.y>bounds.min.y)}
console.log('PASS: all 10 village types produce finite real Three.js mesh models');

// Speed tuning: soft launch, 200 km/h cruise, real travel increase, smooth boost release.
const fast=new Ride();fast.items=[];fast.start();const throttle=new Set(['w']);
for(let i=0;i<60;i++)fast.update(1/60,throttle);
assert(fast.speed/2>20&&fast.speed/2<30,'First second should remain gentle');
for(let i=0;i<360;i++){fast.player=0;fast.update(1/60,throttle)}
assert.equal(fast.speed/2,200);const cruiseStart=fast.pos;
for(let i=0;i<60;i++){fast.player=0;fast.update(1/60,throttle)}
assert(Math.abs(fast.pos-cruiseStart-540)<.1,'Cruise must move 2.7 times faster than the old 200-unit speed');
throttle.add(' ');for(let i=0;i<120;i++){fast.player=0;fast.update(1/60,throttle)}
assert.equal(fast.speed/2,260);throttle.delete(' ');fast.update(1/60,throttle);assert(fast.speed>500,'Releasing boost should decelerate smoothly');
console.log('PASS: gentle launch, 200 km/h cruise, 2.7x travel, 260 km/h boost, smooth boost release');

const impact=new Ride();impact.start();const rock=impact.items.find(o=>o.type==='rock');impact.pos=rock.z-60;impact.player=rock.x;impact.speed=520;impact.falling.set(rock.id,1);impact.update(.05,new Set(['w']));assert(impact.crashing,'Swept test must detect a giant rock at high speed');
impact.start();assert(!impact.crashing);assert.equal(impact.airY,0);assert.equal(impact.falling.size,0);assert.equal(impact.grassCooldown,0);
impact.pos=100;impact.update(.016,new Set());assert(impact.events.some(e=>e.type==='rockfall'));for(let i=0;i<60;i++)impact.update(1/60,new Set());assert(impact.falling.get(1000)>=.9);
console.log('PASS: grass recoil, airborne crash, pause midair, landing recovery, swept giant-rock collision, falling rocks, restart cleanup');

const {JUMPS,COBBLES,roadHeight,surfaceAt}=require('./game-core.js');
const jumpRide=new Ride();jumpRide.items=[];jumpRide.start();jumpRide.pos=JUMPS[0]-1;jumpRide.speed=400;
jumpRide.update(1/60,new Set(['w']));assert(jumpRide.jumping);assert(jumpRide.events.some(e=>e.type==='jump'));
let peak=0,landed=false;for(let i=0;i<360;i++){jumpRide.player=0;jumpRide.update(1/60,new Set(['w']));peak=Math.max(peak,jumpRide.airY);if(jumpRide.events.some(e=>e.type==='jumpLand')){landed=true;break}}
assert(peak>5);assert(landed);assert(!jumpRide.jumping);assert.equal(jumpRide.airY,0);
assert(roadHeight(JUMPS[0])-roadHeight(JUMPS[0]-500)>6);
assert.equal(surfaceAt(COBBLES[0][0]+30),'stone');assert.equal(surfaceAt(0),'dirt');
jumpRide.start();assert.equal(jumpRide.jumped.size,0);assert(!jumpRide.jumping);
assert.equal(jumpRide.length,108000);assert.equal(new Ride().items.filter(o=>o.type==='letter').length,216);
assert(LANDMARKS.every(l=>l.z<jumpRide.length));assert(JUMPS.every(z=>z<jumpRide.length));
console.log('PASS: 21.6km course, high hill launch, airborne arc, automatic landing, stone surfaces, jump reset');

const route=require('./road-path.js');
for(const t of route.turns){assert(Math.abs(Math.abs(route.yaw(t.end)-route.yaw(t.start))*180/Math.PI-170)<1e-9);assert(Math.abs(route.pose((t.start+t.end)/2))>.99);for(let s=t.start;s<t.end;s+=10){const a=route.at(s),b=route.at(s+10);assert(Math.abs(Math.hypot(b.x-a.x,b.z-a.z)-.5)<1e-9)}}
assert.equal(route.pose(0),0);assert.equal(route.pose(60000),0);assert(route.at(30000).z>route.at(26000).z,'First hairpin must reverse forward direction');
{const A=require('./adventure.js'),M=A.mountain;assert(roadHeight(M.peak)-roadHeight(M.start-2000)>50,'Road climbs over 목표봉');assert(Math.abs(roadHeight(M.peak)-M.height)<1e-6);
 const fr=new Ride();fr.items=[];fr.start();fr.pos=A.creek.fords[0]-5;fr.speed=400;fr.update(1/60,new Set(['w']));assert(fr.events.some(e=>e.type==='ford'),'Fords splash');assert(fr.speed<400);
 assert(A.creekX(A.creek.fords[0])===0&&A.creekX(A.creek.start+500)>9&&A.creekX(A.creek.fords[0]+1500)<-9,'Stream crosses at fords');}
console.log('PASS: two actual 170-degree turns, continuous arc-length route, turn pose envelope, reverse direction');
