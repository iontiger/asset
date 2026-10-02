/* Arc-length sampled route: two real 170-degree hairpins (the canyon), plus gentle bends, usable by rendering and tests.
   21.6 km course (108000 units, 5 units = 1 m). The canyon fork runs 20000–40000 with longer, wider hairpins. */
(function(root){
 const LENGTH=108000;
 const turns=[{start:23000,end:27000,side:1},{start:35000,end:39000,side:-1}],angle=170*Math.PI/180;
 // Gentle road bends (no drift): meadow, canyon leg, creek meanders, coast.
 const bends=[{start:5200,end:6800,deg:18},{start:10400,end:12000,deg:-18},{start:29600,end:31000,deg:28},{start:31600,end:33000,deg:-28},
  {start:65000,end:67000,deg:24},{start:69600,end:71800,deg:-48},{start:74000,end:76000,deg:24},{start:86000,end:88000,deg:20},{start:91000,end:93000,deg:-20}];
 const smooth=u=>u*u*(3-2*u);
 function progress(s,t){return Math.max(0,Math.min(1,(s-t.start)/(t.end-t.start)))}
 function yaw(s){let a=0;for(const t of turns)a+=t.side*angle*smooth(progress(s,t));for(const b of bends)a+=b.deg*Math.PI/180*smooth(progress(s,b));return a;}
 function pose(s){const t=turns.find(t=>s>=t.start&&s<=t.end);if(!t)return 0;const u=progress(s,t);return t.side*Math.pow(Math.sin(u*Math.PI),.65)}
 const samples=[{x:0,z:0}];for(let s=10;s<=LENGTH+4000;s+=10){const a=yaw(s-5),p=samples[samples.length-1];samples.push({x:p.x+Math.sin(a)*.5,z:p.z-Math.cos(a)*.5})}
 function at(s){if(s<0)return{x:0,z:-s/20};const i=Math.min(samples.length-2,Math.floor(s/10)),f=(s-i*10)/10,a=samples[i],b=samples[i+1];return{x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f}}
 const api={LENGTH,turns,bends,yaw,pose,at};root.ROAD_PATH=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
