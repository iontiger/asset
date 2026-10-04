const assert=require('node:assert/strict');
const {Ride}=require('./game-core.js'),C=require('./city.js');
function rideAt(d,offset=0){const r=new Ride();r.start();r.items=[];r.branchChoice='safe';r.city.cars=[];r.pos=C.sOf(d.u+offset);return r}
function tick(r,keys=[],n=1){const events=[];for(let i=0;i<n;i++){r.update(1/60,new Set(keys));events.push(...r.events)}return events}
const first=C.deliveries[0];
let r=rideAt(first);tick(r,['s'],89);assert.equal(r.city.delivered,0);tick(r,['s'],2);assert.equal(r.city.delivered,1);assert.equal(r.score,500);tick(r,['s'],180);assert.equal(r.score,500,'No duplicate rewards');
r=rideAt(first);tick(r,['s'],60);r.player=-.8;tick(r,[],1);assert.equal(r.city.deliveries[0].wait,0,'Leaving lane resets progress');r.player=0;r.speed=20;tick(r,[],1);assert.equal(r.city.deliveries[0].wait,0,'Moving does not deliver');
r=rideAt(first);tick(r,['s'],50);r.pause();tick(r,[],100);assert.equal(r.city.delivered,0);r.start();tick(r,['s'],42);assert.equal(r.city.delivered,1,'Pause freezes progress');
r=rideAt(first,-10);r.speed=400;tick(r,['w'],60);assert.equal(r.city.delivered,0,'Drive-through is not a delivery');assert.equal(r.city.deliveries[0].status,'missed');
r=rideAt(first);r.branchChoice='cliff';tick(r,['s'],180);assert.equal(r.city.delivered,0,'Canyon has no deliveries');
r=rideAt(first);for(const d of C.deliveries){r.pos=C.sOf(d.u);r.speed=0;r.player=0;tick(r,['s'],92)}assert.equal(r.city.delivered,3);assert.equal(r.score,2500,'Three deliveries plus completion bonus');tick(r,['s'],120);assert.equal(r.score,2500);r.start();assert.equal(r.city.delivered,0);assert(r.city.deliveries.every(d=>d.status==='pending'&&d.wait===0));
for(const d of C.deliveries){r=rideAt(d,-65);r.autoStop=true;for(const prior of C.deliveries.filter(x=>x.i<d.i))r.city.deliveries[prior.i].status='missed';r.speed=112;const events=tick(r,['w'],1800);assert.equal(r.city.deliveries[d.i].status,'done','Touch auto-stop delivers '+d.name);assert.equal(events.filter(e=>e.type==='delivery'&&e.name===d.name).length,1);assert(C.uOf(r.pos)>d.u+5,'Touch resumes after delivery');}
console.log('PASS: delivery dwell, lane/speed validation, pause, missed stops, canyon exclusion, rewards, reset, mobile stop/resume at all three mailboxes');
