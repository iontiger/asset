/* 화면(카메라 렌즈)에 튀는 흙탕물 — 개울가를 달리면 진흙 물방울이 화면에 달라붙었다가
   잠깐 버틴 뒤 중력으로 천천히 흘러내리며 자국을 남기고 옅어진다. 3D 화면 위 · HUD 아래의 2D 캔버스. */
(function(root){
const rand=Math.random,clamp=(v,a,b)=>v<a?a:v>b?b:v;
function sprite(seed){const S=192,cv=document.createElement('canvas');cv.width=cv.height=S;const x=cv.getContext('2d');let a=seed*9301+49297;const r=()=>(a=(a*9301+49297)%233280)/233280;
  const R=S*.3,c=S/2,ph=[r()*6,r()*6,r()*6],arms=[];for(let i=0;i<2+Math.floor(r()*3);i++)arms.push({a:r()*Math.PI*2,w:.22+r()*.22,l:.12+r()*.25});
  const rad=t=>{let k=.78+.1*Math.sin(t*3+ph[0])+.07*Math.sin(t*5+ph[1])+.05*Math.sin(t*9+ph[2]);for(const m of arms){const d=Math.atan2(Math.sin(t-m.a),Math.cos(t-m.a));k+=m.l*Math.exp(-(d*d)/(m.w*m.w))}return R*k};
  x.filter='blur(.7px)';
  // 흙탕물 얼룩: 가운데는 묽고(비쳐 보이고) 가장자리는 진흙이 몰려 진하다
  x.beginPath();for(let i=0;i<=72;i++){const t=i/72*Math.PI*2,q=rad(t);i?x.lineTo(c+Math.cos(t)*q,c+Math.sin(t)*q):x.moveTo(c+Math.cos(t)*q,c+Math.sin(t)*q)}x.closePath();
  const g=x.createRadialGradient(c-R*.15,c-R*.15,R*.05,c,c,R*1.25);g.addColorStop(0,'rgba(176,146,104,.28)');g.addColorStop(.55,'rgba(128,98,62,.45)');g.addColorStop(.85,'rgba(96,70,42,.66)');g.addColorStop(1,'rgba(74,52,30,.8)');
  x.fillStyle=g;x.fill();x.lineWidth=1.2;x.strokeStyle='rgba(64,44,24,.4)';x.stroke();
  // 알갱이(흙) · 튄 방울
  x.save();x.clip();for(let i=0;i<55;i++){x.fillStyle=r()<.55?'rgba(70,50,28,.35)':'rgba(190,160,118,.22)';x.beginPath();x.arc(c+(r()-.5)*R*1.8,c+(r()-.5)*R*1.8,.6+r()*2.2,0,7);x.fill()}x.restore();
  for(const m of arms)for(let k=0;k<3;k++){const d=rad(m.a)*(1.12+k*.16+r()*.08),t=m.a+(r()-.5)*.25,rr=R*(.09-k*.022)*(.7+r()*.6);x.fillStyle='rgba(92,68,40,.6)';x.beginPath();x.arc(c+Math.cos(t)*d,c+Math.sin(t)*d,Math.max(1,rr),0,7);x.fill()}
  for(let i=0;i<5;i++){const t=r()*Math.PI*2,d=R*(1.1+r()*.35);x.fillStyle='rgba(92,68,40,.5)';x.beginPath();x.arc(c+Math.cos(t)*d,c+Math.sin(t)*d,1+r()*3,0,7);x.fill()}
  // 물방울 반사광 (렌즈에 맺힌 물)
  x.filter='none';x.fillStyle='rgba(255,252,240,.5)';x.beginPath();x.ellipse(c-R*.32,c-R*.36,R*.2,R*.08,-.7,0,7);x.fill();x.fillStyle='rgba(255,252,240,.22)';x.beginPath();x.ellipse(c+R*.3,c+R*.35,R*.12,R*.05,-.7,0,7);x.fill();
  return cv}
function waterSprite(){const cv=document.createElement('canvas');cv.width=cv.height=192;const x=cv.getContext('2d'),g=x.createRadialGradient(82,76,8,96,96,70);g.addColorStop(0,'rgba(192,225,246,.06)');g.addColorStop(.65,'rgba(132,186,215,.16)');g.addColorStop(.88,'rgba(180,224,247,.55)');g.addColorStop(1,'rgba(231,248,255,.08)');x.fillStyle=g;x.beginPath();x.ellipse(96,96,66,72,-.2,0,7);x.fill();x.strokeStyle='rgba(227,248,255,.7)';x.lineWidth=3;x.beginPath();x.ellipse(96,96,60,66,-.2,3.7,5.2);x.stroke();return cv}
class MudScreen{
  constructor(cv){this.cv=cv;this.x=cv.getContext('2d');this.drops=[];this.waterSprite=waterSprite();this.sprites=Array.from({length:8},(_,i)=>sprite(i+1));this.resize();addEventListener('resize',()=>this.resize())}
  resize(){this.dpr=Math.min(devicePixelRatio||1,1.5);this.W=innerWidth;this.H=innerHeight;this.cv.width=Math.round(this.W*this.dpr);this.cv.height=Math.round(this.H*this.dpr)}
  get coverage(){let a=0;for(const d of this.drops)a+=Math.PI*d.r*d.r*.8*d.alpha;return a/(this.W*this.H)}
  clear(){this.drops.length=0;this.x.clearRect(0,0,this.cv.width,this.cv.height)}
  // cover: 화면에서 덮을 비율(0.33 = 1/3) · side: -1 왼쪽, 1 오른쪽에서 튄다
  splash(cover=.33,side=0,kind='mud'){const W=this.W,H=this.H,k=Math.min(W,H)/800,target=W*H*cover;let area=0,n=0;
    const cx=W*clamp(.5+side*.26+(rand()-.5)*.3,.12,.88),cy=H*(.3+rand()*.45),spread=Math.sqrt(target)*.62;
    while(area<target*1.15&&n<120){const r=(16+Math.pow(rand(),2.2)*95)*k,gx=(rand()+rand()+rand()-1.5)*spread*1.5,gy=(rand()+rand()+rand()-1.5)*spread;
      this.add(cx+gx,cy+gy,r,kind);area+=Math.PI*r*r*.8;n++}
    for(let i=0;i<45;i++)this.add(cx+(rand()-.5)*spread*3.6,cy+(rand()-.5)*spread*2.4,(2+rand()*7)*k,kind)}
  add(x,y,r,kind='mud'){if(this.drops.length>320)this.drops.shift();this.drops.push({kind,x,y,r,top:y,s:Math.floor(rand()*8),rot:rand()*6.3,age:0,stick:kind==='water'?.08+rand()*.2:.25+rand()*1.3,vy:0,g:(40+rand()*110)*Math.min(this.W,this.H)/800,vmax:(60+rand()*140)*Math.min(this.W,this.H)/800,life:kind==='water'?1.4+rand()*1.1:4.5+rand()*3.5,alpha:1,a0:.72+rand()*.25})}
  update(dt){const H=this.H;for(const d of this.drops){d.age+=dt;if(d.age>d.stick){d.vy=Math.min(d.vmax*(d.r>14?1:.35),d.vy+d.g*dt);d.y+=d.vy*dt;d.r*=1-dt*.035}
      d.alpha=d.a0*(1-clamp((d.age-d.life*.55)/(d.life*.45),0,1))}
    this.drops=this.drops.filter(d=>d.alpha>.01&&d.y-d.r<H+40)}
  draw(){const x=this.x,p=this.dpr;x.setTransform(p,0,0,p,0,0);x.clearRect(0,0,this.W,this.H);if(!this.drops.length)return;
    // 렌즈 전체가 흙빛으로 흐려진다 (튄 양만큼)
    const cov=Math.min(1,this.drops.filter(d=>d.kind!=='water').reduce((a,d)=>a+Math.PI*d.r*d.r*.8*d.alpha,0)/(this.W*this.H)*2.4);if(cov>.02){x.fillStyle=`rgba(118,92,58,${.16*cov})`;x.fillRect(0,0,this.W,this.H)}
    for(const d of this.drops){if(d.y-d.top>4){const w=d.r*.55,g=x.createLinearGradient(0,d.top,0,d.y);g.addColorStop(0,'rgba(110,84,52,0)');g.addColorStop(1,d.kind==='water'?`rgba(174,220,245,${.2*d.alpha})`:`rgba(104,78,48,${.32*d.alpha})`);x.fillStyle=g;x.beginPath();x.moveTo(d.x-w*.5,d.top);x.lineTo(d.x+w*.5,d.top);x.lineTo(d.x+w,d.y);x.lineTo(d.x-w,d.y);x.fill()}}
    for(const d of this.drops){const st=1+Math.min(.7,d.vy/220);x.globalAlpha=d.alpha;x.save();x.translate(d.x,d.y);x.scale(1/Math.sqrt(st),st);x.rotate(d.rot);x.drawImage(d.kind==='water'?this.waterSprite:this.sprites[d.s],-d.r*1.6,-d.r*1.6,d.r*3.2,d.r*3.2);x.restore()}
    x.globalAlpha=1}}
root.MudScreen=MudScreen;
})(typeof window!=='undefined'?window:globalThis);
