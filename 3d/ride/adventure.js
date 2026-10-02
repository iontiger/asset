/* Course layout shared by the simulation, the renderer and the tests (units: 5 = 1 m, 21.6 km in all).
   - fork: the canyon hairpins (default) or the village detour, 20000–40000 (4 km)
   - mountain: the road climbs over 목표봉 and comes back down
   - creek: the road follows a stream and splashes through three fords */
(function(root){
 const path=root.ROAD_PATH||(typeof require==='function'?require('./road-path.js'):null);
 const fork={start:20000,end:40000,chooseFrom:18500};
 // The canyon road is the base path itself; the village detour swings out to the left.
 function branchOffset(s,choice='safe'){if(choice==='cliff'||s<=fork.start||s>=fork.end)return 0;return -50*Math.sin(Math.PI*(s-fork.start)/(fork.end-fork.start))**2}
 function travelScale(s,choice){const derivative=(branchOffset(s+1,choice)-branchOffset(s-1,choice))*10;return 1/Math.sqrt(1+derivative*derivative)}
 const sstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
 // 목표봉: a round peak centred on the road at s=peak; radius in world units.
 const mountain={start:49000,peak:55000,end:61000,height:72,radius:300,name:'목표봉'};
 const centre=path.at(mountain.peak),ahead=path.at(mountain.peak+200);mountain.x=centre.x;mountain.z=centre.z;
 {const l=Math.hypot(ahead.x-centre.x,ahead.z-centre.z);mountain.dx=(ahead.x-centre.x)/l;mountain.dz=(ahead.z-centre.z)/l}
 // The rocky top of 목표봉 rises beside the pass, left of the road (it never changes the road's own height).
 mountain.crag={x:centre.x+mountain.dz*62,z:centre.z-mountain.dx*62,height:48,radius:78};
 const offRoad=(x,z)=>Math.abs((x-mountain.x)*mountain.dz-(z-mountain.z)*mountain.dx);
 function mountainField(x,z){const t=Math.hypot(x-mountain.x,z-mountain.z)/mountain.radius;if(t>=1)return 0;const C=mountain.crag,u=Math.hypot(x-C.x,z-C.z)/C.radius;
  return mountain.height*(1-t*t)**2+(u<1?C.height*(1-u*u)**1.5*sstep(16,40,offRoad(x,z)):0)}
 // How much the ordinary hills/jumps fade out on the mountain (1 = only the mountain shape).
 const mountainMask=s=>Math.min(sstep(mountain.start-1500,mountain.start,s),sstep(mountain.end+1500,mountain.end,s));
 // 개울: lateral position (world units, + = right) of the stream along the road; it crosses the road at each ford.
 const creek={start:64000,end:70000,fords:[65600,67400,69200],half:3.6,side:17};
 function creekX(s){if(s<creek.start-1200||s>creek.end+1200)return null;let side=1;const W=creek.side;
  for(const f of creek.fords){if(s<f-260)return edge(s,side*W);if(s<=f+260)return edge(s,side*W+(-side*W*2)*sstep(f-260,f+260,s));side=-side}
  return edge(s,side*W);
  function edge(s,x){if(s<creek.start)return x+Math.sign(x)*40*sstep(creek.start,creek.start-1200,s);if(s>creek.end)return x+Math.sign(x)*40*sstep(creek.end,creek.end+1200,s);return x}}
 const biomes=[
  {from:0,name:'꽃바람 초원',ground:'#92ad67',road:'#caaa79',sky:'#bfdfe6',fog:'#cedfc4'},
  {from:18000,name:'황금빛 협곡',ground:'#bd9c73',road:'#bd8e61',sky:'#d9d6be',fog:'#dec7a5'},
  {from:41000,name:'목표봉 고갯길',ground:'#86a660',road:'#c4a578',sky:'#a8d4f0',fog:'#d4e6ee',fogNear:120,fogFar:660},
  {from:62000,name:'맑은 개울길',ground:'#88a862',road:'#b99a72',sky:'#b5dbe8',fog:'#cfe2dc'},
  {from:70800,name:'바람 언덕길',ground:'#90ab64',road:'#c6a878',sky:'#b9dce8',fog:'#d0e0c8'},
  {from:81000,name:'푸른 해안길',ground:'#bdc3a0',road:'#ddc69d',sky:'#a9d8e6',fog:'#c8e1df'},
  {from:96000,name:'노을빛 마을',ground:'#9da779',road:'#bfa584',sky:'#e4cab2',fog:'#dfd0b3'}];
 // 협곡 헤어핀(기본 길) 안쪽은 '협곡 특급' 하늘 — 맑은 파란 하늘과 사암 절벽
 const canyon={name:'협곡 특급길',ground:'#bd9c73',road:'#b88d5d',sky:'#9fcaee',fog:'#cfe4f2',fogNear:110,fogFar:520};
 function biome(s,choice){if(choice==='cliff'&&s>fork.start+250&&s<fork.end-250)return canyon;let b=biomes[0];for(const x of biomes)if(s>=x.from)b=x;return b}
 const api={fork,branchOffset,travelScale,biomes,canyon,biome,mountain,mountainField,mountainMask,creek,creekX,sstep};root.ADVENTURE=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
