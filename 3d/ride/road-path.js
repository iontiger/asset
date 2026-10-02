/* Arc-length sampled route: two real 170-degree hairpins, usable by rendering and tests. */
(function(root){
 const turns=[{start:14500,end:16500,side:1},{start:20500,end:22500,side:-1}],angle=170*Math.PI/180;
 function progress(s,t){return Math.max(0,Math.min(1,(s-t.start)/(t.end-t.start)))}
 function yaw(s){let a=0;for(const t of turns){const u=progress(s,t);a+=t.side*angle*(u*u*(3-2*u))}return a;}
 function pose(s){const t=turns.find(t=>s>=t.start&&s<=t.end);if(!t)return 0;const u=progress(s,t);return t.side*Math.pow(Math.sin(u*Math.PI),.65)}
 const samples=[{x:0,z:0}];for(let s=10;s<=39000;s+=10){const a=yaw(s-5),p=samples[samples.length-1];samples.push({x:p.x+Math.sin(a)*.5,z:p.z-Math.cos(a)*.5})}
 function at(s){if(s<0)return{x:0,z:-s/20};const i=Math.min(samples.length-2,Math.floor(s/10)),f=(s-i*10)/10,a=samples[i],b=samples[i+1];return{x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f}}
 const api={turns,yaw,pose,at};root.ROAD_PATH=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
