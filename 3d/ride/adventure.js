(function(root){
 const fork={start:14000,end:24000,chooseFrom:13000};
 function branchOffset(s,choice='safe'){if(s<=fork.start||s>=fork.end)return 0;return (choice==='cliff'?26:-34)*Math.sin(Math.PI*(s-fork.start)/(fork.end-fork.start))**2}
 function travelScale(s,choice){const derivative=(branchOffset(s+1,choice)-branchOffset(s-1,choice))*10;return 1/Math.sqrt(1+derivative*derivative)}
 const biomes=[{name:'꽃바람 초원',ground:'#92ad67',road:'#caaa79',sky:'#bfdfe6',fog:'#cedfc4'},{name:'황금빛 협곡',ground:'#bd9c73',road:'#bd8e61',sky:'#d9d6be',fog:'#dec7a5'},{name:'푸른 해안길',ground:'#bdc3a0',road:'#ddc69d',sky:'#a9d8e6',fog:'#c8e1df'},{name:'노을빛 마을',ground:'#9da779',road:'#bfa584',sky:'#e4cab2',fog:'#dfd0b3'}];
 // 협곡 헤어핀(기본 길) 안쪽은 '협곡 특급' 하늘 — 맑은 파란 하늘과 사암 절벽
 const canyon={name:'협곡 특급길',ground:'#bd9c73',road:'#b88d5d',sky:'#9fcaee',fog:'#cfe4f2',fogNear:110,fogFar:520};
 const api={fork,branchOffset,travelScale,biomes,canyon,biome:(s,choice)=>choice==='cliff'&&s>fork.start+250&&s<fork.end-250?canyon:biomes[Math.min(3,Math.max(0,Math.floor(s/9000)))]};root.ADVENTURE=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
