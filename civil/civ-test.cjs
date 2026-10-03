// node civ-test.cjs — 컴퓨터 문명끼리 끝까지 두어 보며 규칙이 깨지지 않는지 본다
const assert=require('assert'),CIV=require('./civ-rules.js');
const t0=Date.now();
for(const [size,seed] of [['small',7],['normal',12345],['large',99]]){
  const S=CIV.newGame({size,seed,allAI:true,difficulty:'normal'});
  assert(S.civs.length>=3&&S.units.length>=S.civs.length*3,'start units');
  for(const c of S.civs)assert(CIV.passable(S,c.start),'start on land');
  let maxCities=0;
  for(let t=0;t<260&&!S.over;t++){S.civs[0].ai=true;CIV.endTurn(S);
    for(const u of S.units){assert(CIV.passable(S,u.at),'unit on land '+u.type);assert(u.hp>0&&u.hp<=100)}
    for(const c of S.cities){assert(S.tiles[c.tile].city===c.id);assert(c.pop>=1);assert(Number.isFinite(c.prod)&&Number.isFinite(c.food))}
    const occ=new Map();for(const u of S.units){const k=u.at+(CIV.UNITS[u.type].civilian?'c':'m');if(occ.has(k)){console.log('STACK',S.turn,k,S.units.filter(o=>o.at===u.at).map(o=>[o.id,o.civ,o.type,o.moves]),JSON.stringify(S.events.filter(e=>e.to===u.at||e.at===u.at||e.from===u.at)));process.exit(1)}occ.set(k,u.civ)}
    maxCities=Math.max(maxCities,S.cities.length)}
  const techs=S.civs.map(c=>c.techs.length),cities=S.civs.map(c=>S.cities.filter(x=>x.civ===c.id).length);
  console.log(size,'turn',S.turn,'over',JSON.stringify(S.over),'cities',cities.join('/'),'max',maxCities,'techs',techs.join('/'),'units',S.units.length,'wonders',Object.keys(S.wonders).length,'wars',Object.keys(S.war).length);
  assert(maxCities>=S.civs.length*2,'AI expands');assert(Math.max(...techs)>=10,'AI researches');
  const txt=CIV.save(S),S2=CIV.load(txt);assert.equal(S2.cities.length,S.cities.length);assert(S2.civs[0].explored instanceof Uint8Array);
}
// 플레이어 조작: 도시 세우기 · 이동 · 기술 고르기
{const S=CIV.newGame({size:'small',seed:3});const P=S.civs[0];const st=S.units.find(u=>u.civ===0&&u.type==='settler');
 assert(CIV.canFound(S,st));const c=CIV.foundCity(S,st);assert(c&&c.capital);
 const sc=S.units.find(u=>u.civ===0&&u.type==='scout');const R=CIV.reachable(S,sc);assert(R.size>3,'scout reach');
 P.research='pottery';for(let i=0;i<30;i++)CIV.endTurn(S);assert(P.techs.includes('pottery'));assert(c.pop>=2,'grows');}
console.log('PASS civ rules',(Date.now()-t0)+'ms');
