/* ═══════ 폭죽 · 불꽃 — 목표봉 정상, 요트 일주에서 함께 쓴다 ═══════
   gameFireworks(x,y,z,n,spread,height,scale) : (x,z) 둘레에서 n 발을 쏘아 올려 터뜨린다. scale 은 멀리서 보는 큰 불꽃(요트)용.
   불꽃 알갱이는 미리 만든 Points 몇 묶음을 돌려 쓴다 (휴대폰에서도 가볍게). 가산 혼합이라 블룸이 켜져 있으면 번진다.
   window.dpTicks 에 함수를 넣으면 game.js 의 매 프레임 루프가 (dt, raw) 로 부른다. */
'use strict';
window.dpTicks=window.dpTicks||[];
(function(){
const N=140,POOL=16,COLORS=['#ff5a5a','#ffd24a','#6be3ff','#a98bff','#7dff9a','#ff8ad8','#ffffff','#ffa24a'];
const bursts=[...Array(POOL)].map(()=>{const g=new THREE.BufferGeometry(),pos=new Float32Array(N*3),col=new Float32Array(N*3);g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));
  const m=new THREE.PointsMaterial({size:.95,map:dotTex,vertexColors:true,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true,fog:false});
  const p=new THREE.Points(g,m);p.frustumCulled=false;p.visible=false;p.userData.world=true;p.userData.noAO=true;scene.add(p);return {p,pos,col,vel:new Float32Array(N*3),t:9,life:1.8,size:.95}});
const rockets=[...Array(POOL)].map(()=>{const m=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:'#fff2c0',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));m.scale.setScalar(1.1);m.visible=false;m.userData.world=true;scene.add(m);return {m,on:false,x:0,y:0,z:0,vy:0,top:0,delay:0,k:1}});
const _c=new THREE.Color(),_c2=new THREE.Color();
const HDR=1.35;
function explode(x,y,z,k=1){const b=bursts.reduce((a,c)=>a.t>c.t?a:c);b.t=0;b.life=(1.6+Math.random()*.6)*(k>1?1.2:1);b.size=.95*k;const two=Math.random()<.45;_c.set(COLORS[Math.floor(Math.random()*COLORS.length)]);_c2.set(COLORS[Math.floor(Math.random()*COLORS.length)]);
  const sp=(7+Math.random()*5)*k,ring=Math.random()<.25;for(let i=0;i<N;i++){let dx,dy,dz;if(ring){const a=i/N*Math.PI*2;dx=Math.cos(a);dy=Math.sin(a)*.25;dz=Math.sin(a)}else{dy=Math.random()*2-1;const a=Math.random()*Math.PI*2,r=Math.sqrt(1-dy*dy);dx=Math.cos(a)*r;dz=Math.sin(a)*r}const v=sp*(ring?1:.75+Math.random()*.35);
    b.pos[i*3]=x;b.pos[i*3+1]=y;b.pos[i*3+2]=z;b.vel[i*3]=dx*v;b.vel[i*3+1]=dy*v+1.5*k;b.vel[i*3+2]=dz*v;const c=two&&i%2?_c2:_c;b.col[i*3]=c.r*HDR;b.col[i*3+1]=c.g*HDR;b.col[i*3+2]=c.b*HDR}
  b.p.geometry.attributes.position.needsUpdate=true;b.p.geometry.attributes.color.needsUpdate=true;b.p.visible=true;b.p.material.opacity=1;
  try{if(playLoud()){noiseHit(1200+Math.random()*900,.9,.35,.09);noiseHit(3500,.6,.6,.03)}}catch{}}
function launch(x,y,z,delay=0,height,k=1){const r=rockets.find(r=>!r.on)||rockets[0],top=y+(height||12+Math.random()*8);Object.assign(r,{on:true,x,y,z,vy:Math.max(22,(top-y)*.62+6)+Math.random()*6,top,delay,k});r.m.scale.setScalar(1.1*k);r.m.position.set(x,y,z);r.m.visible=false}
window.gameFireworks=function(x,y,z,n=5,spread=10,height,k=1){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,d=Math.random()*spread;launch(x+Math.cos(a)*d,y,z+Math.sin(a)*d,i*(.22+Math.random()*.35),height&&height*(.85+Math.random()*.3),k)}};
window.dpTicks.push(function(dt){
  for(const r of rockets){if(!r.on)continue;if(r.delay>0){r.delay-=dt;if(r.delay<=0){r.m.visible=true;try{if(playLoud())tone(300,0,.35,'sine',.02,900)}catch{}}continue}r.y+=r.vy*dt;r.vy*=Math.pow(.55,dt);r.m.position.set(r.x+Math.sin(r.y*3)*.08,r.y,r.z);if(r.y>=r.top||r.vy<4){r.on=false;r.m.visible=false;explode(r.x,r.y,r.z,r.k)}}
  for(const b of bursts){if(b.t>=b.life){if(b.p.visible)b.p.visible=false;continue}b.t+=dt;const drag=Math.pow(.32,dt);for(let i=0;i<N;i++){const k=i*3;b.vel[k]*=drag;b.vel[k+1]=b.vel[k+1]*drag-6.5*dt;b.vel[k+2]*=drag;b.pos[k]+=b.vel[k]*dt;b.pos[k+1]+=b.vel[k+1]*dt;b.pos[k+2]+=b.vel[k+2]*dt}
    b.p.geometry.attributes.position.needsUpdate=true;const u=b.t/b.life;b.p.material.opacity=u<.7?1:Math.max(0,1-(u-.7)/.3);b.p.material.size=b.size*(1-u*.35)*(u>.6?(.6+.4*Math.abs(Math.sin(b.t*40))):1)}
});
})();
