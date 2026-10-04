const assert=require('node:assert/strict');
const {Ride}=require('./game-core.js'),C=require('./city.js'),E=require('./city-env.js'),W=require('./city-wet.js');
function fixture(wantWet=true){
 for(let u=C.Lc*.33;u<C.Lc*.43;u+=.5){const r=new Ride();r.start();r.branchChoice='safe';r.pos=C.sOf(u);const me=C.onSeg(u,C.latOf(u,0)),c={id:99,k:me.k,d:me.d+5,lane:-1,v:7};r.city.cars=[c];const env=E.env(u/C.Lc);const hit=W.trySplash(r,env,1/60,C);if(!!hit===wantWet){delete r.city.spray;return {r,env,c}}}
 throw Error('No suitable road sample');
}
let {r,env,c}=fixture();let hit=W.trySplash(r,env,1/60,C);assert(hit&&hit.side===-1);assert(hit.cover>=.09&&hit.cover<=.19);assert.equal(W.trySplash(r,env,2,C),null,'One splash per pass');
r.pause();assert.equal(W.trySplash(r,env,2,C),null);r.mode='finished';r.start();assert(!r.city.spray,'Restart clears spray state');
for(const alter of [x=>x.r.branchChoice='cliff',x=>x.env.rain=.2,x=>x.env.wet=0,x=>x.env.season='winter',x=>x.c.lane=1,x=>x.c.v=0,x=>x.c.d+=80,x=>x.c.k=(x.c.k+1)%C.segs.length,x=>x.r.jumping=true]){const x=fixture();alter(x);assert.equal(W.trySplash(x.r,x.env,1/60,C),null,'Only close moving oncoming cars in summer rain splash');}
const dry=fixture(false);assert.equal(W.trySplash(dry.r,dry.env,1/60,C),null,'No splash outside puddles');
console.log('PASS: puddle contact, heavy summer rain, oncoming proximity, direction, speed, one splash per pass, pause and restart');
