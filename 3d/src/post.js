/* ═══════ 협곡 특급 우편 (CANYON EXPRESS) — 엄청 서두르는 우편배달부 ═══════
   마을 북동쪽 'DentPhoto 우체국' 문 앞에 가면 전용 게임 화면이 열린다. 배달 오토바이로 250km/h 질주하며
   90° · 150° 급커브(브레이크 + 안쪽으로 핸들)와 협곡 위에서 떨어지는 낙석(피하거나 Space 로 점프)을 지나
   바위마을 우체국까지 편지를 배달하면 성공. 목숨(초록 막대) 3개, 기록 · 별 · 편지 수는 이 브라우저에 기억.
   - 게임 세계는 마을과 따로인 장면(PS) — 마을 renderer 로 그리되, 게임 중에는 renderScene 을 감싸 이 장면만 그린다.
   - 길은 1m 간격 중심선(직선 · 원호) 위의 (s 앞 거리, x 오른쪽 거리) 좌표로 움직인다.
   - 협곡 벽은 양옆으로 '다른 길과의 중간선'까지만 뻗어, 머리핀 커브 사이는 바위 능선이 된다.
   - 시험용 window.dpPost (open · start · sim · ST …) */
'use strict';
(function(){
const KEY='asset-village-3d-post';
const SAVE={best:null,stars:0,letters:0,runs:0,clears:0};try{Object.assign(SAVE,JSON.parse(localStorage.getItem(KEY)||'null')||{})}catch{}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(SAVE))}catch{}};
const touch=matchMedia('(hover:none)').matches;
const beep=(f,d=0,l=.1,w='triangle',v=.04)=>{try{if(playLoud())tone(f,d,l,w,v)}catch{}};
const V3=THREE.Vector3,clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t;
const SM=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.8,metalness:0},o||{}));
function rng(seed){let a=seed>>>0;return ()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash(n){const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s)}
function vn(x){const i=Math.floor(x),f=x-i,u=f*f*(3-2*f);return hash(i)*(1-u)+hash(i+1)*u}

/* ═══ 1. 배달 오토바이 + 우편배달부 (마을 우체국 앞에 세워 둔 것과 게임에서 타는 것) ═══ */
function beamM(p,a,b,r,m){const A=new V3(...a),B=new V3(...b),d=B.clone().sub(A),L=d.length();const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,L,8),m);o.position.copy(A).addScaledVector(d,.5);o.quaternion.setFromUnitVectors(new V3(0,1,0),d.normalize());o.castShadow=true;p.add(o);return o}
function makeBike(){
  const g=new THREE.Group(),lean=new THREE.Group();g.add(lean);
  const red=SM('#d8442f',{roughness:.42}),dk=SM('#2c2c33',{roughness:.65}),chrome=SM('#dfe3e8',{roughness:.25,metalness:.6}),
    seat=SM('#3a2a22'),wood=SM('#cf9452'),woodD=SM('#9a6532'),parcel=SM('#eadcae'),parcel2=SM('#d9b98a'),twine=SM('#8a5a2c'),
    blue=SM('#3d6fb8'),navy=SM('#28406e'),skin=SM('#f3c9a2'),hair=SM('#c8662e'),bag=SM('#8b5a32'),scarfM=SM('#e2483a'),white=SM('#fbf7ee'),
    lamp=SM('#fff6d8',{emissive:'#ffe9a8',emissiveIntensity:.8}),tail=SM('#ff4a3a',{emissive:'#ff2a1a',emissiveIntensity:.9});
  const B=(w,h,d,m,x,y,z,p=lean)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o};
  const S=(r,m,x,y,z,sx=1,sy=1,sz=1,p=lean,det=1)=>{const o=new THREE.Mesh(new THREE.IcosahedronGeometry(r,det),m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;p.add(o);return o};
  const C=(rt,rb,h,m,x,y,z,p=lean,n=12)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,n),m);o.position.set(x,y,z);o.castShadow=true;p.add(o);return o};
  const wheels=[];
  for(const z of [.76,-.74]){const w=new THREE.Group();w.position.set(0,.37,z);lean.add(w);const t=new THREE.Mesh(new THREE.TorusGeometry(.29,.1,8,20),dk);t.rotation.y=Math.PI/2;t.castShadow=true;w.add(t);
    const hb=C(.15,.15,.22,chrome,0,0,0,w,10);hb.rotation.z=Math.PI/2;for(let k=0;k<3;k++)B(.03,.5,.03,chrome,0,0,0,w).rotation.x=k*Math.PI/3;wheels.push(w)}
  // 앞 포크 · 흙받이 · 전조등 · 핸들
  beamM(lean,[.1,.37,.76],[.1,1.08,.52],.035,chrome);beamM(lean,[-.1,.37,.76],[-.1,1.08,.52],.035,chrome);
  B(.26,.07,.46,red,0,.74,.8).rotation.x=.25;
  C(.13,.15,.14,chrome,0,1.02,.66,lean,14).rotation.x=Math.PI/2;C(.11,.11,.03,lamp,0,1.02,.735,lean,14).rotation.x=Math.PI/2;
  B(.86,.05,.05,chrome,0,1.13,.5);for(const x of [-.42,.42])B(.08,.07,.14,dk,x,1.13,.5);
  // 몸통 · 안장 · 엔진 · 배기관 · 뒤 흙받이
  S(.3,red,0,.86,.22,1,.82,1.7);B(.36,.12,.62,seat,0,1.0,-.24);B(.3,.3,.42,dk,0,.52,0);
  C(.06,.08,.9,chrome,.24,.48,-.32,lean,8).rotation.x=Math.PI/2-.1;
  B(.3,.07,.5,red,0,.76,-.78).rotation.x=-.18;
  // 짐받이 · 나무 상자 · 소포 · 편지 다발 (참고 그림처럼 높이 쌓았다)
  B(.62,.04,.74,chrome,0,1.02,-.66);
  B(.6,.38,.58,wood,0,1.23,-.64);for(const y of [1.1,1.3])B(.64,.05,.62,woodD,0,y,-.64);for(const x of [-.31,.31])B(.04,.4,.62,woodD,x,1.23,-.64);
  {const r=.12;B(.5,.3,.44,parcel,.02,1.57,-.62).rotation.y=r;B(.52,.31,.05,twine,.02,1.57,-.62).rotation.y=r;B(.05,.31,.46,twine,.02,1.57,-.62).rotation.y=r}
  {const r=-.2;B(.36,.24,.3,parcel2,-.05,1.84,-.6).rotation.y=r;B(.37,.05,.31,twine,-.05,1.86,-.6).rotation.y=r}
  B(.3,.12,.22,white,.12,2.02,-.58).rotation.y=.3;
  B(.16,.08,.04,tail,0,.98,-1.03);
  // 우편배달부 — 몸을 숙이고 핸들을 꽉 잡는다
  const rider=new THREE.Group();lean.add(rider);
  for(const s of [-1,1]){B(.17,.17,.44,navy,s*.17,1.04,.02,rider);B(.15,.42,.15,navy,s*.2,.78,.24,rider);B(.17,.1,.26,dk,s*.2,.56,.3,rider)}
  B(.5,.56,.34,blue,0,1.4,-.06,rider).rotation.x=.5;B(.52,.08,.36,navy,0,1.17,-.16,rider).rotation.x=.5;
  B(.1,.34,.32,bag,.3,1.3,-.14,rider);beamM(rider,[-.24,1.62,.06],[.3,1.42,-.12],.03,bag);
  beamM(rider,[.25,1.56,.06],[.4,1.14,.48],.07,blue);beamM(rider,[-.25,1.56,.06],[-.4,1.14,.48],.07,blue);
  S(.07,skin,.4,1.13,.5,1,1,1,rider);S(.07,skin,-.4,1.13,.5,1,1,1,rider);
  const head=new THREE.Group();head.position.set(0,1.86,.16);rider.add(head);
  S(.31,skin,0,0,0,1,1,1,head,2);S(.32,hair,0,.05,-.06,1,.9,1,head,1);
  C(.31,.3,.17,navy,0,.22,0,head,16);C(.315,.315,.05,scarfM,0,.15,0,head,16);B(.32,.035,.2,navy,0,.13,.3,head);
  S(.035,dk,.11,0,.29,1,1,1,head);S(.035,dk,-.11,0,.29,1,1,1,head);
  const scarf=B(.2,.07,.5,scarfM,0,1.66,-.32,rider);
  return {g,lean,wheels,rider,scarf,head}}

/* ═══ 2. 마을의 DentPhoto 우체국 (게임 입구) — 목표봉 가는 길목 ═══ */
const spot=findSpot(58,-112,9);ATTRACT.push(spot);
const cx=spot.x,cz=spot.z,q=Math.round(Math.atan2(-cx,-cz)/(Math.PI/2))*(Math.PI/2),fx=Math.round(Math.sin(q)),fz=Math.round(Math.cos(q));
const BW=7.2,BD=5.6,BH=3.9,gy=terrainHeight(cx,cz);
const og=new THREE.Group();og.position.set(cx,gy,cz);og.rotation.y=q;og.userData.world=true;scene.add(og);
box(og,0,-.7,0,BW+.8,1.6,BD+.8,'#d9d2c3');box(og,0,BH/2,0,BW,BH,BD,'#f6ecd8');box(og,0,.25,0,BW+.06,.5,BD+.06,'#c9a77c');
for(const s of [-1,1])box(og,0,BH+.95,s*BD*.27,BW+.9,.22,BD*.66,'#cf4f39').rotation.x=s*.62;
box(og,0,BH+1.62,0,BW+.95,.2,.3,'#a63a28');
box(og,0,1.2,BD/2+.04,1.6,2.4,.1,'#3b5f86');box(og,0,1.5,BD/2+.1,.9,.9,.04,'#9fd3e0');
for(const sx of [-1,1])box(og,sx*2.5,2.0,BD/2+.04,1.5,1.2,.08,'#9fd3e0');
sign(og,'✉ DentPhoto 우체국',0,BH-.45,BD/2+.1,5.6,'#ffffff','#c8402f');
cyl(og,2.6,.65,BD/2+1.3,.34,.34,1.3,'#d23c2c',16);sphere(og,2.6,1.3,BD/2+1.3,.34,'#d23c2c',1);box(og,2.6,1.0,BD/2+1.64,.34,.06,.02,'#3a2a22');
{const pk=makeBike();pk.g.position.set(-2.7,0,BD/2+1.5);pk.g.rotation.y=.9;pk.g.scale.setScalar(.95);pk.rider.visible=false;og.add(pk.g)}
cyl(og,-4.6,1.1,BD/2+.6,.08,.08,2.2,'#7a5a3a',8);sign(og,'🏍 협곡 특급 우편 →',-4.6,1.95,BD/2+.66,3.2,'#3b2a1a','#f2c230');
obstacles.push({x:cx,z:cz,w:(fx?BD:BW)+.9,d:(fx?BW:BD)+.9,world:true});
const DOOR=nearestWalkable(cx+fx*(BD/2+2.6),cz+fz*(BD/2+2.6))||{x:cx+fx*(BD/2+2.6),z:cz+fz*(BD/2+2.6)};
const nearDoor=(r=3.6)=>Math.hypot(player.x-DOOR.x,player.z-DOOR.z)<r;

/* ═══ 3. 게임 세계 — 협곡 길 ═══ */
const PS=new THREE.Scene(),PC=new THREE.PerspectiveCamera(66,innerWidth/innerHeight,.3,3200);
const W=7,WALLX=W+3.3,OFF=200,POST=240,VMAX=70,ACC=21,BRK=44,GRAV=26,JV=9.4,FT=1.05;
// 'S' 직선(m) · 'A' 원호(도, 반지름 m — + 오른쪽). 90° · 150° 급커브가 번갈아 나온다
const SEG=[['S',150],['A',25,220],['S',120],['A',-90,36],['S',170],['A',150,30],['S',160],['A',-55,70],['A',55,70],['S',200],['A',-150,30],['S',140],['A',90,40],['S',130],['A',-35,160],['S',160],['A',-90,38],['S',170],['A',150,32],['S',150],['A',-60,90],['S',260]];
const ZONES=[[440,575],[690,815],[985,1150],[1260,1370],[1700,1820],[1910,2050],[2170,2290],[2410,2560]];   // 낙석 구간
let N=0,LEN=0,FIN=0,PX,PZ,PT,PK,PY;const CURVES=[];
function buildTrack(){
  const segs=[['S',OFF],...SEG,['S',POST]],lens=segs.map(g=>g[0]==='S'?g[1]:Math.round(Math.abs(g[1])*Math.PI/180*g[2]));
  N=lens.reduce((a,b)=>a+b,0)+1;LEN=lens.slice(1,-1).reduce((a,b)=>a+b,0);FIN=LEN-50;
  PX=new Float32Array(N);PZ=new Float32Array(N);PT=new Float32Array(N);PK=new Float32Array(N);PY=new Float32Array(N);
  let x=0,z=-OFF,th=0,i=0,acc=-OFF;PZ[0]=z;
  segs.forEach((g,gi)=>{const L=lens[gi],k=g[0]==='S'?0:(g[1]>0?1:-1)*Math.abs(g[1])*Math.PI/180/L;
    if(g[0]==='A'&&Math.abs(g[1])>=50)CURVES.push({s0:acc,s1:acc+L,ang:Math.abs(g[1]),dir:g[1]>0?1:-1,k:Math.abs(k),vs:Math.sqrt(52/Math.abs(k))});
    for(let n=0;n<L;n++){th-=k*.5;x+=Math.sin(th);z+=Math.cos(th);th-=k*.5;i++;PX[i]=x;PZ[i]=z;PT[i]=th;PK[i]=k}acc+=L});
  for(let j=0;j<N;j++){const s=j-OFF;PY[j]=7*Math.sin(s/230)+3.5*Math.sin(s/97+1.3)+s*.012}}
const _pa={x:0,y:0,z:0,th:0};
function trk(s){let f=s+OFF;if(f<0)f=0;if(f>N-1.001)f=N-1.001;const i=Math.floor(f),t=f-i;_pa.x=PX[i]+(PX[i+1]-PX[i])*t;_pa.z=PZ[i]+(PZ[i+1]-PZ[i])*t;_pa.y=PY[i]+(PY[i+1]-PY[i])*t;_pa.th=PT[i]+(PT[i+1]-PT[i])*t;return _pa}
function posAt(s,x,out,up=0){const p=trk(s);return out.set(p.x-Math.cos(p.th)*x,p.y+up,p.z+Math.sin(p.th)*x)}
const kAt=s=>PK[clamp(Math.round(s+OFF),0,N-1)];
const slopeAt=s=>{const i=clamp(Math.round(s+OFF),1,N-2);return (PY[i+1]-PY[i-1])/2};
function wallH(s,side){const base=34+30*vn(s*.006+side*13.7)+10*vn(s*.023+side*3),a=clamp((s+20)/140,0,1),b=clamp((LEN-70-s)/150,0,1),e=Math.min(a,b);return lerp(4.5,base,e*e*(3-2*e))}

const A={foot:[],ledge:[],top:[],plat:[],face:[]};   // 나무 · 덤불 놓을 자리
function buildWalls(){
  const RS=2.5,rings=[];for(let s=-OFF;s<=LEN+POST-1;s+=RS)rings.push(s);
  const R=rings.length,col=new THREE.Color(),ROCK=['#efc99a','#d4945f','#f5dfbd','#c27f52','#e5b47f'];
  for(const side of [-1,1]){
    // 1) 이 옆으로 쓸 수 있는 폭: 다른 길(앞뒤 30m 밖)과의 중간선까지 — 머리핀 사이는 능선이 된다
    const av=new Float32Array(R);
    for(let r=0;r<R;r++){const i=Math.round(rings[r]+OFF),rx=-Math.cos(PT[i])*side,rz=Math.sin(PT[i])*side;let lim=240;
      for(let j=0;j<N;j+=4){if(Math.abs(j-i)<30)continue;const qx=PX[j]-PX[i],qz=PZ[j]-PZ[i],a=qx*rx+qz*rz;if(a<=0)continue;const d=(qx*qx+qz*qz)/(2*a);if(d<lim)lim=d}
      av[r]=Math.max(W+6,lim-2)}
    {const t=new Float32Array(R);for(let r=0;r<R;r++){let m=1e9;for(let k=-3;k<=3;k++)m=Math.min(m,av[clamp(r+k,0,R-1)]);t[r]=m}for(let r=0;r<R;r++){let s=0;for(let k=-2;k<=2;k++)s+=t[clamp(r+k,0,R-1)];av[r]=s/5}}
    // 2) 단면: 길가 흙 → 풀 → 벽 밑 → 사암 절벽(중간 턱) → 꼭대기 풀밭 → 먼 고원
    const M=17,pos=new Float32Array(R*M*3),cols=new Float32Array(R*M*3);
    for(let r=0;r<R;r++){const s=rings[r],i=Math.round(s+OFF),rx=-Math.cos(PT[i])*side,rz=Math.sin(PT[i])*side,y0=PY[i],H=wallH(s,side),rel=av[r]-W;
      const j=k=>(vn(s*.11+k*3.1+side*50)-.5)*1.7+(vn(s*.031+k*1.3+side*7)-.5);
      const P=[[-.6,-.1,0],[1,.04,1],[2.6,.16,2],[4.2+j(0)*1.2,.32,3],[4.6+j(1)*1.6,.13,4],[5.4+j(2)*2,.27,4],[5.9+j(3)*2,.41,4],[8.4+j(4)*1.5,.43,5],[8.9+j(5)*2,.57,4],[10+j(6)*2.4,.73,4],[10.8+j(7)*2.2,.88,4],[11.6+j(8)*2,1,6],[14,1.03,7],[40,1.12,7],[90,1.28,7],[160,1.55,8],[240,1.8,8]];
      P.forEach((p,m)=>{let o=p[0];if(rel>=26){if(o>14)o=14+(o-14)*(rel-14)/226}else if(o>4.5)o=4.5+(o-4.5)*(rel-4.5)/235.5;
        const ty=p[2],h=ty<=3?p[1]:p[1]*H+(ty>=7?(vn(s*.012+o*.03+side*9)-.5)*H*.3*Math.min(1,o/60):0);
        const k=(r*M+m)*3;pos[k]=PX[i]+rx*(W+o);pos[k+1]=y0+h;pos[k+2]=PZ[i]+rz*(W+o);
        const nz=vn(s*.07+m*1.7+side*5);
        if(ty===0)col.set('#b5875a');else if(ty===1)col.set('#a3985c');else if(ty===2)col.set(nz>.5?'#7ea457':'#8fa85a');else if(ty===3)col.set('#6e8f4b');
        else if(ty===4||ty===6){const b=Math.floor((h+vn(s*.03+side*20)*4)/3.3);col.set(ROCK[((b%5)+5)%5]);if(h<3)col.multiplyScalar(.8);if(ty===6&&nz>.55)col.lerp(new THREE.Color('#7f9a52'),.6)}
        else if(ty===5)col.set('#7a9a50');else if(ty===7)col.set(nz>.62?'#b3a86a':'#86a35a');else col.set('#9fb088');
        cols[k]=col.r;cols[k+1]=col.g;cols[k+2]=col.b;
        const a=[pos[k],pos[k+1],pos[k+2],s,side,H];
        if(m===3&&rel>=10&&r%2===0)A.foot.push(a);if(m===7&&rel>=26&&H>14)A.ledge.push(a);if(m===12&&rel>=20&&H>10)A.top.push(a);if(m===13&&rel>=40)A.plat.push(a);if((m===5||m===9||m===10)&&rel>=26&&H>16&&nz>.72)A.face.push(a)})}
    const idx=[];for(let r=0;r<R-1;r++)for(let m=0;m<M-1;m++){const a=r*M+m,b=a+M;idx.push(a,b,a+1,a+1,b,b+1)}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(cols,3));geo.setIndex(idx);geo.computeVertexNormals();
    const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,flatShading:true,side:THREE.DoubleSide}));m.receiveShadow=true;m.castShadow=true;m.frustumCulled=false;PS.add(m)}}

function buildRoad(){
  const tex=canvasTex(512,(x,S)=>{const R=rng(7);x.fillStyle='#b88d5d';x.fillRect(0,0,S,S);
    for(let i=0;i<5000;i++){const c=R();x.fillStyle=c<.5?'rgba(120,85,50,.18)':c<.8?'rgba(225,190,140,.2)':'rgba(90,70,45,.25)';const w=1+R()*4;x.fillRect(R()*S,R()*S,w,w*(.5+R()))}
    for(const u of [.32,.68]){const g=x.createLinearGradient((u-.09)*S,0,(u+.09)*S,0);g.addColorStop(0,'rgba(105,74,42,0)');g.addColorStop(.5,'rgba(105,74,42,.4)');g.addColorStop(1,'rgba(105,74,42,0)');x.fillStyle=g;x.fillRect((u-.09)*S,0,.18*S,S)}
    for(let i=0;i<180;i++){x.fillStyle=R()<.5?'#8d7558':'#dcc7a4';x.beginPath();x.arc(R()*S,R()*S,1.5+R()*3,0,7);x.fill()}
    const e=x.createLinearGradient(0,0,S,0);e.addColorStop(0,'rgba(118,150,78,.6)');e.addColorStop(.07,'rgba(118,150,78,0)');e.addColorStop(.93,'rgba(118,150,78,0)');e.addColorStop(1,'rgba(118,150,78,.6)');x.fillStyle=e;x.fillRect(0,0,S,S)});
  const rs=[];for(let s=-OFF;s<=LEN+POST-1;s+=2)rs.push(s);const n=rs.length,pos=new Float32Array(n*6),uv=new Float32Array(n*4),idx=[],p=new V3();
  rs.forEach((s,k)=>{[-1,1].forEach((e,q)=>{posAt(s,e*(W+.4),p,.03);pos.set([p.x,p.y,p.z],(k*2+q)*3);uv.set([(e+1)/2,s/12],(k*2+q)*2)});if(k<n-1){const a=k*2;idx.push(a,a+2,a+1,a+1,a+2,a+3)}});
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
  const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({map:tex,roughness:1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));m.receiveShadow=true;m.frustumCulled=false;PS.add(m)}

// 나무 · 덤불 · 돌 — 같은 모양은 인스턴스로 한 번에
const _m4=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_sv=new V3(),_pv=new V3();
function instParts(parts,list){parts.forEach(([geo,mat])=>{const m=new THREE.InstancedMesh(geo,mat,Math.max(1,list.length));list.forEach((t,k)=>{_q.setFromEuler(_e.set(0,t.r,0));_m4.compose(_pv.set(t.x,t.y,t.z),_q,_sv.set(t.sx,t.sy,t.sz));m.setMatrixAt(k,_m4);if(t.c)m.setColorAt(k,t.c)});
  m.count=list.length;m.castShadow=true;m.receiveShadow=true;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;PS.add(m)})}
function tg(geo,x,y,z,sx=1,sy=1,sz=1){geo.scale(sx,sy,sz);geo.translate(x,y,z);return geo}
function buildPlants(){
  const R=rng(11),pine=[],cyp=[],round=[],bush=[],stone=[],c=()=>new THREE.Color().setHSL(.24+R()*.08,.32+R()*.15,.3+R()*.12);
  const put=(L,a,sc,dx=0,dz=0)=>L.push({x:a[0]+dx,y:a[1]-.2,z:a[2]+dz,r:R()*6.3,sx:sc,sy:sc*(.85+R()*.3),sz:sc});
  A.foot.forEach(a=>{const u=R();if(u<.3)bush.push({x:a[0],y:a[1]-.1,z:a[2],r:R()*6,sx:.8+R()*.9,sy:.6+R()*.5,sz:.8+R()*.9,c:c()});else if(u<.4)stone.push({x:a[0],y:a[1]-.2,z:a[2],r:R()*6,sx:.5+R(),sy:.4+R()*.6,sz:.5+R()});else if(u<.46&&a[5]>14)put(cyp,a,.8+R()*.5);else if(u<.5&&a[5]>14)put(pine,a,.7+R()*.3)});
  A.ledge.forEach(a=>{const u=R();if(u<.12)put(pine,a,.8+R()*.4);else if(u<.3)bush.push({x:a[0],y:a[1],z:a[2],r:R()*6,sx:1+R(),sy:.7,sz:1+R(),c:c()})});
  A.top.forEach(a=>{const u=R();if(u<.2)put(pine,a,1.1+R()*.6);else if(u<.3)put(cyp,a,1+R()*.6);else if(u<.38)put(round,a,1+R()*.5)});
  A.face.forEach(a=>{if(R()<.55)bush.push({x:a[0],y:a[1],z:a[2],r:R()*6,sx:1.4+R()*1.6,sy:.9+R(),sz:1.4+R()*1.6,c:c()})});
  A.plat.forEach(a=>{const u=R();if(u<.05)put(pine,a,1.2+R()*.6,(R()-.5)*20,(R()-.5)*20);else if(u<.1)put(round,a,1.2+R()*.5,(R()-.5)*20,(R()-.5)*20)});
  const trunk=SM('#6b4a32'),dkG=SM('#3e6838',{flatShading:true}),cyG=SM('#3a5c37',{flatShading:true}),rdG=SM('#6f8f45',{flatShading:true}),white=SM('#ffffff',{flatShading:true}),st=SM('#b49272',{flatShading:true});
  instParts([[tg(new THREE.CylinderGeometry(.22,.4,10.5,6),0,5.2,0),trunk],[tg(new THREE.IcosahedronGeometry(2.7,1),0,10.4,0,1,.42,1),dkG],[tg(new THREE.IcosahedronGeometry(2,1),1.4,8.9,.6,1,.45,1),dkG],[tg(new THREE.IcosahedronGeometry(1.6,1),-1.3,9.6,-.8,1,.45,1),dkG]],pine);
  instParts([[tg(new THREE.CylinderGeometry(.16,.24,1.8,6),0,.9,0),trunk],[tg(new THREE.IcosahedronGeometry(1,1),0,4.3,0,1,3.4,1),cyG]],cyp);
  instParts([[tg(new THREE.CylinderGeometry(.2,.3,3.2,6),0,1.6,0),trunk],[tg(new THREE.IcosahedronGeometry(2.2,1),0,4.2,0,1,.82,1),rdG]],round);
  instParts([[new THREE.IcosahedronGeometry(1,0),white]],bush);
  instParts([[new THREE.DodecahedronGeometry(1,0),st]],stone)}

// 양 · 소 몇 마리 (출발 · 도착 근처 풀밭)
function buildAnimals(){const R=rng(5),wool=SM('#f7f4ec',{flatShading:true}),face=SM('#3a332e'),cowW=SM('#f4f1ea'),cowB=SM('#2f2a28');
  const spots=A.foot.filter(a=>(a[3]>20&&a[3]<150)||(a[3]>LEN-200&&a[3]<LEN-60));
  for(let k=0;k<12&&spots.length;k++){const a=spots[Math.floor(R()*spots.length)],g=new THREE.Group();g.position.set(a[0]+(R()-.5)*3,a[1]-.1,a[2]+(R()-.5)*3);g.rotation.y=R()*6.3;PS.add(g);
    const S=(geo,m,x,y,z,sx=1,sy=1,sz=1)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;g.add(o);return o};
    if(k%4!==3){S(new THREE.IcosahedronGeometry(.62,1),wool,0,.8,0,1,.85,1.25);S(new THREE.BoxGeometry(.32,.36,.4),face,0,.95,.78);for(const x of [-.25,.25])for(const z of [-.4,.4])S(new THREE.BoxGeometry(.1,.45,.1),face,x,.25,z)}
    else{S(new THREE.BoxGeometry(.9,.8,1.7),cowW,0,1.1,0);S(new THREE.BoxGeometry(.5,.4,.5),cowB,.2,1.3,.2);S(new THREE.BoxGeometry(.5,.5,.6),cowW,0,1.25,1.05);S(new THREE.BoxGeometry(.32,.2,.2),cowB,0,1.1,1.36);for(const x of [-.3,.3])for(const z of [-.6,.6])S(new THREE.BoxGeometry(.18,.75,.18),cowB,x,.37,z)}}}

// 표지판 · 출발 · 도착 문 · 바위마을
function chevTex(dir){const c=document.createElement('canvas');c.width=128;c.height=64;const x=c.getContext('2d');x.fillStyle='#f2c230';x.fillRect(0,0,128,64);x.strokeStyle='#1e1a14';x.lineWidth=5;x.strokeRect(3,3,122,58);x.fillStyle='#1e1a14';
  for(const o of [-26,8]){x.beginPath();const b=64+o*dir;x.moveTo(b-12*dir,12);x.lineTo(b+12*dir,32);x.lineTo(b-12*dir,52);x.lineTo(b-24*dir,52);x.lineTo(b,32);x.lineTo(b-24*dir,12);x.closePath();x.fill()}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function faceBack(o,s){o.rotation.y=trk(s).th+Math.PI}   // 다가오는 오토바이를 바라보게
function buildSigns(){
  const post=SM('#5a4a3a'),chev={1:new THREE.MeshBasicMaterial({map:chevTex(1)}),[-1]:new THREE.MeshBasicMaterial({map:chevTex(-1)})},geo=new THREE.PlaneGeometry(1.5,.75),pg=new THREE.CylinderGeometry(.06,.06,1.4,6),p=new V3();
  CURVES.forEach(c=>{const side=-c.dir;for(let s=c.s0-8;s<=c.s1+2;s+=7){posAt(s,side*(W+2.4),p);const g=new THREE.Group();g.position.copy(p);faceBack(g,s);PS.add(g);const b=new THREE.Mesh(geo,chev[c.dir]);b.position.y=1.5;g.add(b);const q=new THREE.Mesh(pg,post);q.position.y=.7;g.add(q)}
    posAt(c.s0-140,(c.dir>0?1:-1)*-(W+2.2),p);const g=new THREE.Group();g.position.copy(p);faceBack(g,c.s0-140);PS.add(g);sign(g,`⚠ 급커브 ${c.dir>0?'↱':'↰'} ${c.ang}°`,0,2.2,0,4.4,'#1e1a14','#f2c230');const q=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,2.2,6),post);q.position.y=1.1;g.add(q)});
  for(let s=500;s<FIN-100;s+=500){posAt(s,W+2.3,p);const g=new THREE.Group();g.position.copy(p);faceBack(g,s);PS.add(g);sign(g,`✉ 바위마을 우체국 ${((FIN-s)/1000).toFixed(1)} km`,0,2.1,0,4.2,'#ffffff','#2f6b4f');const q=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,2,6),post);q.position.y=1;g.add(q)}
  ZONES.forEach(([a])=>{posAt(a-110,-(W+2.3),p);const g=new THREE.Group();g.position.copy(p);faceBack(g,a-110);PS.add(g);sign(g,'🪨 낙석 주의',0,2.1,0,3.4,'#1e1a14','#f2c230');const q=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,2,6),post);q.position.y=1;g.add(q)});
  arch(0,'🏍 CANYON EXPRESS · 출발!','#ffffff','#c8402f',false);arch(FIN,'🏁 도착! 바위마을 우체국 ✉','#ffffff','#2f6b4f',true);
  // 바위마을 — 도착선 앞뒤로 테라코타 지붕 집 · 돌탑 · 우체국 · 큰 우체통
  const R=rng(3),WALLC=['#f1e3c6','#e8b98a','#d9b48a','#e7a274','#f3d9b0'],roof=SM('#c9653f',{flatShading:true});
  for(let k=0;k<12;k++){const s=FIN-110+k*21+R()*6,side=k%2?1:-1,off=W+15+R()*9;posAt(s,side*off,p);const H=wallH(s,side);const g=new THREE.Group();g.position.set(p.x,p.y+H*1.03-.3,p.z);g.rotation.y=trk(s).th+(R()-.5)*.3;PS.add(g);
    const w=5+R()*4,h=3.5+R()*4,d=5+R()*2;const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),SM(WALLC[k%5]));b.position.y=h/2;b.castShadow=b.receiveShadow=true;g.add(b);
    for(const sd of [-1,1]){const r=new THREE.Mesh(new THREE.BoxGeometry(w+.6,.25,d*.62),roof);r.position.set(0,h+d*.17,sd*d*.25);r.rotation.x=sd*.55;r.castShadow=true;g.add(r)}
    for(let wi=-1;wi<=1;wi+=2){const win=new THREE.Mesh(new THREE.BoxGeometry(.8,1,.06),SM('#4c6a7c'));win.position.set(wi*w*.25,h*.6,-d/2-.02);g.add(win)}}
  {const s=FIN-30;posAt(s,W+13,p);const g=new THREE.Group();g.position.set(p.x,p.y+wallH(s,1)*1.03-.3,p.z);faceBack(g,s);PS.add(g);const t=new THREE.Mesh(new THREE.BoxGeometry(4.2,15,4.2),SM('#b9a68a',{flatShading:true}));t.position.y=7.5;t.castShadow=t.receiveShadow=true;g.add(t);
    for(let a=0;a<4;a++){const c=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),SM('#a8957a'));c.position.set((a%2?1:-1)*1.6,15.5,(a<2?1:-1)*1.6);g.add(c)}const win=new THREE.Mesh(new THREE.BoxGeometry(1,1.8,.1),SM('#2e2a26'));win.position.set(0,11,2.12);g.add(win)}
  {const s=FIN+18;posAt(s,W+12,p);const g=new THREE.Group();g.position.set(p.x,p.y+wallH(s,1)*1.03-.3,p.z);g.rotation.y=trk(s).th+Math.PI/2;PS.add(g);const b=new THREE.Mesh(new THREE.BoxGeometry(8,4.4,6),SM('#f6ecd8'));b.position.y=2.2;b.castShadow=b.receiveShadow=true;g.add(b);
    for(const sd of [-1,1]){const r=new THREE.Mesh(new THREE.BoxGeometry(8.8,.25,3.8),SM('#cf4f39'));r.position.set(0,5.4,sd*1.5);r.rotation.x=sd*.62;g.add(r)}sign(g,'✉ 바위마을 우체국',0,3.6,3.06,5.6,'#ffffff','#c8402f')}
  {posAt(FIN+4,W+2.6,p);const g=new THREE.Group();g.position.copy(p);PS.add(g);const c=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,1.6,16),SM('#d23c2c'));c.position.y=.8;c.castShadow=true;g.add(c);const t=new THREE.Mesh(new THREE.SphereGeometry(.45,16,8,0,6.3,0,1.6),SM('#d23c2c'));t.position.y=1.6;g.add(t)}}
function arch(s,text,fg,bg,checker){const p=new V3();posAt(s,0,p);const g=new THREE.Group();g.position.copy(p);g.rotation.y=trk(s).th;PS.add(g);const wood=SM('#8a5a34');
  for(const x of [-1,1]){const q=new THREE.Mesh(new THREE.BoxGeometry(.5,6.8,.5),wood);q.position.set(x*(W+1.4),3.4,0);q.castShadow=true;g.add(q)}
  const b=new THREE.Mesh(new THREE.BoxGeometry(2*W+3.6,.45,.45),wood);b.position.y=6.6;g.add(b);
  const sg=sign(g,text,0,5.6,-.3,11,fg,bg);sg.rotation.y=Math.PI;
  if(checker){const c=document.createElement('canvas');c.width=256;c.height=32;const x=c.getContext('2d');for(let i=0;i<16;i++)for(let j=0;j<2;j++){x.fillStyle=(i+j)%2?'#1e1e1e':'#f4f4f4';x.fillRect(i*16,j*16,16,16)}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
    const l=new THREE.Mesh(new THREE.PlaneGeometry(2*W,1.8),new THREE.MeshBasicMaterial({map:t,polygonOffset:true,polygonOffsetFactor:-2}));l.rotation.x=-Math.PI/2;l.position.y=.06;g.add(l)}}

// 하늘 · 해 · 빛
const SUN_DIR=new V3(-.42,.8,.42).normalize();let sky,sunSp,sun,BK;
function buildSky(){const geo=new THREE.SphereGeometry(2400,32,16),n=geo.attributes.position.count,c=new Float32Array(n*3),top=new THREE.Color('#3f8de6'),hor=new THREE.Color('#cfe4f2'),t=new THREE.Color();
  for(let i=0;i<n;i++){const y=geo.attributes.position.getY(i)/2400;t.copy(hor).lerp(top,Math.pow(clamp(y,0,1),.5));c.set([t.r,t.g,t.b],i*3)}geo.setAttribute('color',new THREE.BufferAttribute(c,3));
  sky=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false,depthWrite:false}));sky.renderOrder=-1;PS.add(sky);
  sunSp=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:'#fff4cf',fog:false,depthWrite:false,transparent:true,blending:THREE.AdditiveBlending}));sunSp.scale.setScalar(260);PS.add(sunSp);
  PS.fog=new THREE.Fog('#cfe4f2',170,1000);PS.background=new THREE.Color('#cfe4f2');
  PS.add(new THREE.HemisphereLight('#e4f2ff','#c9a072',1.7));
  sun=new THREE.DirectionalLight('#fff3dc',3.2);sun.castShadow=true;const sz=touch?1024:2048;sun.shadow.mapSize.set(sz,sz);const sc=sun.shadow.camera;sc.left=-48;sc.right=48;sc.top=48;sc.bottom=-48;sc.near=1;sc.far=300;sun.shadow.bias=-.0004;sun.shadow.normalBias=.05;PS.add(sun,sun.target)}

/* ═══ 4. 낙석 · 편지 · 먼지 ═══ */
const ROCKS=[],LETTERS=[],DUST=[],BITS=[];
function rockGeo(r,R){const g=new THREE.IcosahedronGeometry(r,0),p=g.attributes.position;for(let i=0;i<p.count;i++){const k=.78+R()*.4;p.setXYZ(i,p.getX(i)*k,p.getY(i)*k*.85,p.getZ(i)*k)}g.computeVertexNormals();return g}
function buildRocks(){const R=rng(42),mat=SM('#9d7f64',{flatShading:true}),ringG=new THREE.RingGeometry(.75,1,28),ringM=new THREE.MeshBasicMaterial({color:'#ff3b2a',transparent:true,opacity:.8,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-3});
  ZONES.forEach(([a,b],zi)=>{for(let s=a+R()*20;s<b;s+=40+R()*28-zi*1.5)ROCKS.push({s,x:(R()*2-1)*(W-1.4),r:.75+R()*.4,side:R()<.5?-1:1,fall:true,roll:R()<.3});
    for(let k=0;k<1+(zi>3?1:0);k++)ROCKS.push({s:a+(b-a)*(.25+R()*.5),x:(R()*2-1)*(W-1.6),r:.7+R()*.3,side:0,fall:false})});
  ROCKS.forEach(r=>{r.mesh=new THREE.Mesh(rockGeo(r.r,R),mat);r.mesh.castShadow=true;r.mesh.receiveShadow=true;r.mesh.visible=false;PS.add(r.mesh);
    if(r.fall){r.ring=new THREE.Mesh(ringG,ringM.clone());r.ring.rotation.x=-Math.PI/2;r.ring.visible=false;PS.add(r.ring)}r.a=new V3();r.b=new V3();r.st=0})}
function buildLetters(){const PAT=[[0,0,0],[-4,-2,0],[4,4,4],[0,0,0],[-3,3,-3]],HI=[3],G=[[200,0],[480,1],[740,2],[1020,3],[1300,4],[1490,2],[1720,1],[1960,3],[2210,4],[2470,0]];
  const env=SM('#fbf3dc',{emissive:'#6b5a2a',emissiveIntensity:.25}),stamp=SM('#e2483a'),flap=SM('#e9dcb8');
  G.forEach(([s0,pi],gi)=>PAT[pi].forEach((x,k)=>{const g=new THREE.Group();const b=new THREE.Mesh(new THREE.BoxGeometry(.9,.58,.06),env);g.add(b);const st=new THREE.Mesh(new THREE.BoxGeometry(.18,.2,.07),stamp);st.position.set(.28,.12,.01);g.add(st);
    const f=new THREE.Mesh(new THREE.BoxGeometry(.66,.05,.07),flap);f.position.set(-.12,.12,.012);f.rotation.z=-.42;g.add(f);const f2=f.clone();f2.position.x=.08;f2.rotation.z=.42;g.add(f2);
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:'#ffd86a',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.55}));glow.scale.setScalar(2.2);g.add(glow);
    PS.add(g);LETTERS.push({s:s0+k*7,x:x*(gi%2&&pi!==3?-1:1),y:HI.includes(pi)?3.0:1.3,g,got:false,pop:0})}))}
function buildDust(){const m=()=>new THREE.SpriteMaterial({map:dotTex,color:'#dcc095',transparent:true,depthWrite:false,opacity:0});for(let i=0;i<70;i++){const s=new THREE.Sprite(m());s.visible=false;PS.add(s);DUST.push({s,t:0,life:1,v:new V3()})}
  const bg=new THREE.IcosahedronGeometry(.18,0),bm=SM('#8d725a',{flatShading:true});for(let i=0;i<40;i++){const o=new THREE.Mesh(bg,bm);o.visible=false;o.castShadow=true;PS.add(o);BITS.push({o,t:0,v:new V3()})}}
let dustI=0,bitI=0;
function puff(p,size=1,life=.9,vy=1.2,spread=1){const d=DUST[dustI++%DUST.length];d.s.position.copy(p);d.s.visible=true;d.t=0;d.life=life;d.size=size;d.v.set((Math.random()-.5)*spread*2,vy*(.5+Math.random()),(Math.random()-.5)*spread*2)}
function chips(p,n,f=6){for(let k=0;k<n;k++){const b=BITS[bitI++%BITS.length];b.o.position.copy(p);b.o.visible=true;b.t=1.4;b.v.set((Math.random()-.5)*f,3+Math.random()*f,(Math.random()-.5)*f)}}

/* ═══ 5. 화면 (HUD · 시작 · 결과) ═══ */
const css=document.createElement('style');css.textContent=`
#postGame{position:fixed;inset:0;z-index:9000;display:none;font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:#3b2a1a;user-select:none;-webkit-user-select:none;touch-action:none;overflow:hidden}
body.post-on #postGame{display:block}
body.post-on>*:not(#world):not(#postGame):not(script):not(style){visibility:hidden!important}
#postGame .pg-wipe{position:absolute;inset:0;background:#1d130b;opacity:0;pointer-events:none}
#postGame.wipe .pg-wipe{animation:pgWipe .7s ease-out}
@keyframes pgWipe{0%{opacity:1}100%{opacity:0}}
#postGame .pg-fx{position:absolute;inset:0;pointer-events:none;opacity:0;background:repeating-conic-gradient(from var(--a,0deg) at 50% 54%,#fff0 0deg 3.1deg,#ffffff8c 3.3deg 3.55deg,#fff0 3.8deg 7deg);-webkit-mask:radial-gradient(ellipse 70% 65% at 50% 54%,transparent 38%,#000 92%);mask:radial-gradient(ellipse 70% 65% at 50% 54%,transparent 38%,#000 92%)}
#postGame .pg-hud{position:absolute;inset:0;pointer-events:none;display:none}
#postGame[data-mode=run] .pg-hud,#postGame[data-mode=pause] .pg-hud{display:block}
#postGame .pg-tl{position:absolute;left:max(18px,env(safe-area-inset-left));top:max(16px,env(safe-area-inset-top));display:flex;align-items:center;gap:10px}
#postGame .pg-ring{width:86px;height:86px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,#fbf6ea 0 58%,transparent 59%),conic-gradient(#3e2a1c var(--p,0%),#3e2a1c55 0);box-shadow:0 0 0 3px #3e2a1c inset,0 4px 14px #0004;position:relative}
#postGame .pg-ring span{font-size:34px;line-height:1;margin-top:-10px}#postGame .pg-ring b{position:absolute;bottom:13px;font:800 15px/1 Georgia,serif;color:#3e2a1c}
#postGame .pg-tr{position:absolute;right:max(18px,env(safe-area-inset-right));top:max(14px,env(safe-area-inset-top));display:flex;flex-direction:column;align-items:flex-end;gap:8px}
#postGame .pg-cal{display:flex;align-items:center;gap:10px}
#postGame .pg-cal small{font:700 italic 19px/1.05 Georgia,serif;color:#fff;text-shadow:0 2px 3px #0008;text-align:right}
#postGame .pg-card{background:#fbf7ec;border-radius:5px;box-shadow:0 3px 10px #0005;min-width:96px;text-align:center;overflow:hidden}
#postGame .pg-card i{display:block;background:#2b2520;color:#fbf7ec;font:800 12px/1 Georgia,serif;letter-spacing:.12em;padding:5px 8px;font-style:normal}
#postGame .pg-card b{display:block;font:800 40px/1.1 Georgia,serif;color:#2b2520;padding:2px 10px 4px;font-variant-numeric:tabular-nums}
#postGame .pg-bar{display:flex;align-items:center;gap:8px}#postGame .pg-bar span{font-size:22px;filter:drop-shadow(0 1px 2px #0007)}
#postGame .pg-bar div{width:170px;height:22px;border-radius:4px;background:#2b2520aa;box-shadow:0 0 0 2px #fbf7ec inset;padding:3px}#postGame .pg-bar i{display:block;height:100%;width:0;background:#fbf7ec;border-radius:2px}
#postGame .pg-warn{position:absolute;left:50%;top:max(18px,env(safe-area-inset-top));transform:translateX(-50%);padding:9px 18px;border-radius:10px;background:#f2c230;color:#1e1a14;font-weight:900;font-size:20px;box-shadow:0 0 0 3px #1e1a14 inset,0 6px 18px #0005;white-space:nowrap;display:none}
#postGame .pg-warn.on{display:block}#postGame .pg-warn.hot{background:#e8432f;color:#fff;box-shadow:0 0 0 3px #5c140c inset,0 6px 18px #0005;animation:pgShake .25s infinite}
#postGame .pg-warn small{font-weight:700;font-size:14px;margin-left:8px;opacity:.9}
@keyframes pgShake{50%{transform:translateX(-50%) scale(1.06)}}
#postGame .pg-bottom{position:absolute;left:50%;bottom:max(14px,env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;align-items:center;gap:12px}
#postGame .pg-gauge{width:68px;height:68px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,#fbf6ea 0 54%,#2f6b3e 55% 63%,transparent 64%),conic-gradient(#3fa05a var(--p,0%),#173d24 0);box-shadow:0 4px 12px #0005;font-size:26px;border:0;padding:0;pointer-events:auto;color:#2f6b3e}
#postGame .pg-speedo{position:relative;width:min(520px,52vw);padding-bottom:12px}
#postGame .pg-scale{display:flex;justify-content:space-between;background:#fbf7ec;border-radius:7px;padding:8px 14px 10px;font:800 26px/1 Georgia,serif;color:#3b2f24;box-shadow:0 0 0 2px #cdbb95 inset,0 4px 14px #0004;position:relative}
#postGame .pg-needle{position:absolute;bottom:10px;width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:30px solid #d2321f;transform:translateX(-50%);left:4%;filter:drop-shadow(0 1px 1px #0006)}
#postGame .pg-kmh{position:absolute;right:0;top:-24px;font:800 italic 18px/1 Georgia,serif;color:#fff;text-shadow:0 2px 3px #0008}
#postGame .pg-lives{position:absolute;left:3%;right:3%;bottom:0;display:flex;gap:10px}#postGame .pg-lives i{flex:1;height:7px;border-radius:4px;background:#3fa05a;box-shadow:0 0 0 1.5px #173d24}#postGame .pg-lives i.off{background:#5d5148;box-shadow:0 0 0 1.5px #2b2520;opacity:.7}
#postGame .pg-keys{position:absolute;right:16px;bottom:16px;font-size:12px;color:#fff;text-shadow:0 1px 3px #000a;opacity:.85}
#postGame .pg-big{position:absolute;left:0;right:0;top:34%;text-align:center;font:900 clamp(40px,8vw,96px)/1 -apple-system,"Apple SD Gothic Neo",sans-serif;color:#ffb43a;-webkit-text-stroke:3px #5a3414;text-shadow:0 6px 0 #5a3414,0 10px 24px #0007;opacity:0;pointer-events:none}
#postGame .pg-big.small{font-size:clamp(28px,4.5vw,52px);-webkit-text-stroke:2px #5a3414}
#postGame .pg-big.bad{color:#ff6a50}#postGame .pg-big.good{color:#7fe08a;-webkit-text-stroke-color:#1d4d2a;text-shadow:0 6px 0 #1d4d2a,0 10px 24px #0007}
#postGame .pg-big.show{animation:pgBig var(--d,1.1s) ease-out forwards}
@keyframes pgBig{0%{opacity:0;transform:scale(1.8)}12%{opacity:1;transform:scale(1)}75%{opacity:1}100%{opacity:0;transform:scale(.96)}}
#postGame .pg-touch{display:none}
#postGame .pg-touch button{position:absolute;pointer-events:auto;border:0;border-radius:50%;width:78px;height:78px;font:900 18px/1 inherit;color:#fff;background:#2b2520a6;box-shadow:0 0 0 3px #fbf7ecb0 inset,0 4px 12px #0005;touch-action:none}
#postGame .pg-touch button.on{background:#e98a2ad0}
#postGame .pg-touch #pgL{left:16px;bottom:96px}#postGame .pg-touch #pgR{left:104px;bottom:96px}#postGame .pg-touch #pgB{right:16px;bottom:184px;background:#b8311fb0;font-size:15px}#postGame .pg-touch #pgJ{right:16px;bottom:96px;background:#2f8a4ab0;font-size:15px}
#postGame.touch .pg-touch{display:block}#postGame.touch .pg-keys{display:none}
#postGame.touch .pg-speedo{width:min(330px,56vw)}#postGame.touch .pg-scale{font-size:16px;padding:6px 8px 8px}#postGame.touch .pg-gauge{width:50px;height:50px;font-size:19px}#postGame.touch .pg-needle{border-bottom-width:22px}
#postGame.touch .pg-ring{width:62px;height:62px}#postGame.touch .pg-ring span{font-size:24px}#postGame.touch .pg-ring b{font-size:12px;bottom:9px}
#postGame.touch .pg-card b{font-size:28px}#postGame.touch .pg-bar div{width:110px;height:18px}#postGame.touch .pg-cal small{font-size:14px}#postGame.touch .pg-warn{font-size:15px;top:96px}
#postGame .pg-scr{position:absolute;inset:0;display:none;pointer-events:auto}
#postGame[data-mode=title] #pgTitle,#postGame[data-mode=result] #pgResult,#postGame[data-mode=pause] #pgPauseScr{display:flex}
#pgTitle{background:linear-gradient(90deg,#24160cdd 0,#24160c99 38%,#24160c00 70%);align-items:center;padding:24px max(28px,6vw)}
#pgTitle .pg-col{max-width:520px;color:#fbf2e0}
#postGame .pg-logo small{display:block;font:800 14px/1 Georgia,serif;letter-spacing:.32em;color:#ffd58a;margin-bottom:8px}
#postGame .pg-logo h1{margin:0;font:900 clamp(46px,8.5vw,100px)/.9 -apple-system,"Apple SD Gothic Neo",sans-serif;letter-spacing:-.01em}
#postGame .pg-logo h1 span{display:block;background-image:linear-gradient(#ffd56a,#f39a2c 60%,#e2761e);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:3px #5a3414;filter:drop-shadow(0 5px 0 #5a3414) drop-shadow(0 10px 16px #0008)}
#postGame .pg-logo h1 span+span{background-image:linear-gradient(#a6ec8a,#55b65a 60%,#3a9246);-webkit-text-stroke-color:#1d4d2a;filter:drop-shadow(0 5px 0 #1d4d2a) drop-shadow(0 10px 16px #0008)}
#postGame .pg-ribbon{display:inline-block;margin:16px 0 4px;padding:7px 16px;border-radius:6px;background:#efd9ae;color:#4b2f15;font-weight:900;font-size:19px;box-shadow:0 0 0 3px #8a5a2c inset,0 4px 10px #0006}
#postGame .pg-story{font-size:15px;line-height:1.65;margin:14px 0 10px;color:#fbf2e0;text-shadow:0 1px 3px #000a}
#postGame .pg-how{list-style:none;padding:0;margin:0 0 12px;display:grid;gap:6px;font-size:14px}
#postGame .pg-how kbd{display:inline-block;min-width:22px;padding:3px 8px;margin-right:8px;border-radius:5px;background:#fbf2e0;color:#3b2a1a;font:800 13px/1.2 inherit;box-shadow:0 2px 0 #8a5a2c}
#postGame .pg-rec{font-size:14px;color:#ffd58a;margin-bottom:16px;min-height:1em}
#postGame .pg-btns{display:flex;gap:12px;flex-wrap:wrap}
#postGame .pg-btn{pointer-events:auto;cursor:pointer;font:inherit;font-weight:900;font-size:18px;padding:13px 22px;border-radius:999px;border:3px solid #6a3d1d;background:#fbf2e0;color:#4b2f15;box-shadow:0 5px 0 #6a3d1d;touch-action:manipulation}
#postGame .pg-btn.main{font-size:23px;padding:13px 34px;color:#fff;background:linear-gradient(#ffd56a,#f6a23a 55%,#e8862a);text-shadow:0 2px 0 #8a4b17}
#postGame .pg-btn:active{transform:translateY(4px);box-shadow:0 1px 0 #6a3d1d}#postGame .pg-btn:focus-visible{outline:3px solid #fff;outline-offset:3px}
#pgResult,#pgPauseScr{align-items:center;justify-content:center;background:#24160c88;padding:16px}
#postGame .pg-res{background:#fbf3e2;border-radius:18px;box-shadow:0 0 0 4px #8a5a2c inset,0 20px 60px #0008;padding:26px 30px 24px;text-align:center;width:min(440px,100%);color:#3b2a1a}
#postGame .pg-res h2{margin:0 0 6px;font-size:30px;font-weight:900}#postGame .pg-res .pg-stars{font-size:46px;letter-spacing:6px;color:#f2b632;text-shadow:0 3px 0 #8a5a2c;margin:4px 0 10px}#postGame .pg-res .pg-stars i{color:#d7c9ad;font-style:normal;text-shadow:none}
#postGame .pg-res dl{display:grid;grid-template-columns:1fr auto;gap:6px 14px;margin:0 auto 18px;max-width:280px;text-align:left;font-size:16px}#postGame .pg-res dd{margin:0;font-weight:800;text-align:right}
#postGame .pg-res .pg-new{display:inline-block;background:#e8432f;color:#fff;font-weight:900;font-size:13px;padding:3px 10px;border-radius:999px;margin-bottom:8px}
#postGame .pg-res .pg-btns{justify-content:center}
@media (max-width:700px){#pgTitle{align-items:flex-end;background:linear-gradient(0deg,#24160cee 0,#24160cbb 55%,#24160c00 100%);padding:16px 18px 22px}#postGame .pg-story{font-size:13.5px}#postGame .pg-how{font-size:13px}#postGame .pg-btn.main{font-size:20px}}
`;document.head.appendChild(css);
const root=document.createElement('div');root.id='postGame';root.dataset.mode='off';if(touch)root.classList.add('touch');
const TICKS=[0,50,100,150,200,250,300];
root.innerHTML=`<div class="pg-fx" id="pgFx"></div><div class="pg-hud">
<div class="pg-tl"><div class="pg-ring" id="pgRing"><span>👜</span><b id="pgLet">0</b></div></div>
<div class="pg-tr"><div class="pg-cal"><small id="pgBestTxt">BEST<br>-</small><div class="pg-card"><i>TIME</i><b id="pgTime">0.0</b></div></div><div class="pg-bar"><span>✉</span><div><i id="pgProg"></i></div></div></div>
<div class="pg-warn" id="pgWarn"></div>
<div class="pg-bottom"><div class="pg-gauge" id="pgDist" title="남은 거리">🏁</div><div class="pg-speedo"><span class="pg-kmh" id="pgKmh">0 km/h</span><div class="pg-scale">${TICKS.map(t=>`<span>${t}</span>`).join('')}</div><i class="pg-needle" id="pgNeedle"></i><div class="pg-lives" id="pgLives"><i></i><i></i><i></i></div></div><button class="pg-gauge" id="pgPause" aria-label="잠깐 멈춤">⏸</button></div>
<div class="pg-keys">← → 핸들 · ↓ 브레이크 · Space 점프 · Esc 멈춤</div>
<div class="pg-touch"><button id="pgL" aria-label="왼쪽">◀</button><button id="pgR" aria-label="오른쪽">▶</button><button id="pgB">브레이크</button><button id="pgJ">점프</button></div>
<div class="pg-big" id="pgBig"></div></div>
<div class="pg-scr" id="pgTitle"><div class="pg-col"><div class="pg-logo"><small>THE SPEEDY POSTMAN</small><h1><span>CANYON</span><span>EXPRESS</span></h1></div><div class="pg-ribbon">협곡 특급 우편 ✉</div>
<p class="pg-story">오늘 안에 바위마을 우체국까지 편지를 배달해야 해요! 배달 오토바이로 <b>250km/h</b> 협곡 길을 내달려 <b>급커브</b>와 <b>떨어지는 돌</b>을 피해 도착하세요.</p>
<ul class="pg-how">${touch?'<li><kbd>◀ ▶</kbd>핸들 — 커브 안쪽으로 꺾어요</li><li><kbd>브레이크</kbd>90° · 150° 급커브 앞에서 꼭!</li><li><kbd>점프</kbd>길에 떨어진 돌 넘기 · 하늘의 편지 줍기</li>':'<li><kbd>← →</kbd>핸들 — 커브 안쪽으로 꺾어요</li><li><kbd>↓</kbd>브레이크 — 90° · 150° 급커브 앞에서 꼭!</li><li><kbd>Space</kbd>점프 — 떨어진 돌 넘기 · 하늘의 편지 줍기</li>'}</ul>
<div class="pg-rec" id="pgRec"></div><div class="pg-btns"><button class="pg-btn main" id="pgGo">🏍 출발!</button><button class="pg-btn" id="pgHome">마을로 돌아가기</button></div></div></div>
<div class="pg-scr" id="pgResult"><div class="pg-res" id="pgResBox"></div></div>
<div class="pg-scr" id="pgPauseScr"><div class="pg-res"><h2>⏸ 잠깐 멈춤</h2><p style="margin:4px 0 16px">배달은 기다려 줄게요.</p><div class="pg-btns" style="flex-direction:column"><button class="pg-btn main" id="pgResume">계속 달리기</button><button class="pg-btn" id="pgRestart">처음부터 다시</button><button class="pg-btn" id="pgQuit">마을로 돌아가기</button></div></div></div>
<div class="pg-wipe"></div>`;
document.body.appendChild(root);
const blocker=document.createElement('i');blocker.className='game-modal';blocker.style.cssText='display:none!important';document.body.appendChild(blocker);   // 이야기 퀘스트가 게임 중에 끼어들지 않게
const $p=id=>root.querySelector('#'+id),el={fx:$p('pgFx'),ring:$p('pgRing'),let:$p('pgLet'),time:$p('pgTime'),best:$p('pgBestTxt'),prog:$p('pgProg'),warn:$p('pgWarn'),dist:$p('pgDist'),needle:$p('pgNeedle'),kmh:$p('pgKmh'),lives:[...root.querySelectorAll('#pgLives i')],big:$p('pgBig'),rec:$p('pgRec'),res:$p('pgResBox')};
function big(t,cls='',d=1.1){el.big.className='pg-big';void el.big.offsetWidth;el.big.textContent=t;if(!t)return;el.big.className='pg-big show '+cls;el.big.style.setProperty('--d',d+'s')}
const fmt=t=>t==null?'-':t.toFixed(1)+'초';

/* ═══ 6. 상태 · 조작 ═══ */
const ST={mode:'off',s:0,x:0,v:0,y:0,vy:0,slide:0,steer:0,lean:0,lives:3,t:0,letters:0,inv:0,crashT:0,finT:0,shake:0,cnt:0,ts:0,camS:0,spin:0,jb:0,over:0,auto:false,crashes:0};
const K={l:0,r:0,b:0};
let T3=55,T2=68;   // 별 3개 · 2개 기록 (자동 운전 기록을 보고 맞춤)
const PG={on:false,built:false,cleared:false,fxLock:false};
function setMode(m){ST.mode=m;root.dataset.mode=m==='count'||m==='crash'||m==='finish'?'run':m}
function buildWorld(){buildTrack();buildSky();buildWalls();buildRoad();buildPlants();buildAnimals();buildSigns();buildRocks();buildLetters();buildDust();BK=makeBike();PS.add(BK.g);PG.built=true}
function resetRun(){Object.assign(ST,{s:0,x:0,v:0,y:0,vy:0,slide:0,steer:0,lean:0,lives:3,t:0,letters:0,inv:0,crashT:0,finT:0,shake:0,spin:0,jb:0,over:0,crashes:0});ST.camS=-8;K.l=K.r=K.b=0;
  ROCKS.forEach(r=>{r.st=0;r.mesh.visible=false;if(r.ring)r.ring.visible=false});LETTERS.forEach(l=>{l.got=false;l.pop=0;l.g.visible=true;l.g.scale.setScalar(1)});DUST.forEach(d=>d.s.visible=false);BITS.forEach(b=>b.o.visible=false);
  el.lives.forEach(i=>i.classList.remove('off'));big('')}
function titleRec(){el.rec.textContent=SAVE.best!=null?`최고 기록 ${fmt(SAVE.best)} · ${'★'.repeat(SAVE.stars)}${'☆'.repeat(3-SAVE.stars)} · 편지 최고 ${SAVE.letters}/${LETTERS.length}`:'첫 배달이에요 — 별 3개는 '+T3+'초 안에!';el.best.innerHTML=`BEST<br>${SAVE.best!=null?SAVE.best.toFixed(1):'-'}`}
function open(){if(PG.on)return;try{if(PLAY.mode)endPlay();if(riding)toggleBike(false)}catch{}route=[];target=null;try{drawRoute()}catch{}keys={};
  if(!PG.built){try{buildWorld()}catch(e){console.error(e);toast('🏍 협곡 길을 만들지 못했어요');return}}
  PG.on=true;PG.fxLock=FX.locked;FX.locked=true;document.body.classList.add('post-on');blocker.classList.add('on');root.classList.remove('wipe');void root.offsetWidth;root.classList.add('wipe');
  lastNow=0;resetRun();ST.ts=0;setMode('title');titleRec();placeBike(0);beep(523,0,.1);beep(784,.1,.14);setTimeout(()=>{const b=$p('pgGo');b&&b.focus()},60)}
function close(){if(!PG.on)return;PG.on=false;engineOff();document.body.classList.remove('post-on');blocker.classList.remove('on');setMode('off');FX.locked=PG.fxLock;armed=false;keys={};
  try{$('#world').focus()}catch{}if(PG.cleared){PG.cleared=false;try{celebrate()}catch{}toast('✉ 배달 완료! 바위마을에 편지가 도착했어요','gem')}}
function start(){if(!PG.built)return;resetRun();setMode('count');ST.cnt=3.6;ST.lastC=4;root.classList.remove('wipe');void root.offsetWidth;root.classList.add('wipe');engineOn();SAVE.runs++;save()}
function pause(){if(ST.mode==='run'||ST.mode==='count'){ST.prev=ST.mode;setMode('pause');engineSet(true);setTimeout(()=>$p('pgResume').focus(),30)}}
function resume(){if(ST.mode==='pause'){setMode(ST.prev||'run');lastNow=0}}
$p('pgGo').onclick=start;$p('pgHome').onclick=close;$p('pgPause').onclick=pause;$p('pgResume').onclick=resume;$p('pgRestart').onclick=start;$p('pgQuit').onclick=close;
// 키보드 — 게임 중에는 마을 키를 모두 막는다
const KL=['arrowleft','a'],KR=['arrowright','d'],KB=['arrowdown','s'];
addEventListener('keydown',e=>{if(!PG.on)return;const k=(e.key||'').toLowerCase();if(k==='tab')return;
  if(ST.mode==='run'||ST.mode==='count'||ST.mode==='crash'||ST.mode==='finish'){if(KL.includes(k))K.l=1;else if(KR.includes(k))K.r=1;else if(KB.includes(k))K.b=1;else if(k===' '||k==='spacebar'||k==='arrowup'||k==='w'){if(!e.repeat)ST.jb=.16}else if(k==='escape'||k==='p')pause();e.preventDefault()}
  else if(ST.mode==='pause'){if(k==='escape'||k==='p'){resume();e.preventDefault()}}
  else if(ST.mode==='title'){if(k==='escape'){close();e.preventDefault()}else if((k==='enter'||k===' ')&&!(e.target&&e.target.id==='pgHome')){start();e.preventDefault()}}
  else if(ST.mode==='result'){if(k==='escape'){close();e.preventDefault()}}
  e.stopImmediatePropagation()},true);
addEventListener('keyup',e=>{if(!PG.on)return;const k=(e.key||'').toLowerCase();if(KL.includes(k))K.l=0;else if(KR.includes(k))K.r=0;else if(KB.includes(k))K.b=0;e.stopImmediatePropagation()},true);
addEventListener('blur',()=>{K.l=K.r=K.b=0;if(PG.on)pause()});
[['pgL','l'],['pgR','r'],['pgB','b']].forEach(([id,k])=>{const b=$p(id),on=e=>{e.preventDefault();K[k]=1;b.classList.add('on')},off=e=>{K[k]=0;b.classList.remove('on')};b.addEventListener('pointerdown',on);['pointerup','pointercancel','pointerleave'].forEach(t=>b.addEventListener(t,off))});
$p('pgJ').addEventListener('pointerdown',e=>{e.preventDefault();ST.jb=.16});
const _ib=inputBusy;inputBusy=function(){return _ib()||PG.on};

// 엔진 소리 — 속도에 따라 높아진다 (소리 설정이 꺼져 있으면 조용히)
let eng=null;
function engineOn(){if(eng)return;try{if(!playLoud())return;const a=audio();if(!a)return;const o=a.createOscillator(),o2=a.createOscillator(),f=a.createBiquadFilter(),g=a.createGain();o.type='sawtooth';o2.type='square';f.type='lowpass';f.frequency.value=650;g.gain.value=0;o.connect(f);o2.connect(f);f.connect(g).connect(a.destination);o.start();o2.start();eng={a,o,o2,f,g}}catch{}}
function engineSet(mute){if(!eng)return;const t=eng.a.currentTime,fq=48+ST.v*2.4+(ST.mode==='count'?40*Math.sin(ST.cnt*9)**2:0);eng.o.frequency.setTargetAtTime(fq,t,.05);eng.o2.frequency.setTargetAtTime(fq*.5,t,.05);eng.g.gain.setTargetAtTime(mute||ST.mode==='result'||ST.mode==='crash'?0:.02+ST.v/VMAX*.015,t,.08)}
function engineOff(){if(!eng)return;const e=eng;eng=null;try{e.g.gain.setTargetAtTime(0,e.a.currentTime,.04);setTimeout(()=>{try{e.o.stop();e.o2.stop()}catch{}},300)}catch{}}

/* ═══ 7. 물리 ═══ */
function autopilot(){let brake=false;for(let d=0;d<=190;d+=5){const k=Math.abs(kAt(ST.s+d));if(!k)continue;const vs=Math.sqrt(50/k)*.96;if(ST.v*ST.v>vs*vs+2*BRK*d*.8){brake=true;break}}
  const k=kAt(ST.s);let tx=0;
  for(const r of ROCKS){if(r.st===0||r.s<ST.s+1||r.s>ST.s+45)continue;if(Math.abs(r.x-ST.x)<r.r+1.4){tx=r.x>ST.x?r.x-r.r-2.6:r.x+r.r+2.6;if(r.st===2&&r.s-ST.s<ST.v*.3+2&&ST.y<=0)ST.jb=.1}}
  const want=clamp((tx-ST.x)*.4-ST.slide*.08+(Math.abs(ST.v*ST.v*k)>22?Math.sign(k):0),-1,1);K.l=want<-.2?1:0;K.r=want>.2?1:0;K.b=brake?1:0}
function physics(h){
  if(ST.mode==='run'||ST.mode==='finish'){
    if(ST.mode==='run'){ST.t+=h;if(ST.inv>0)ST.inv-=h;if(ST.auto)autopilot()}
    const tgt=ST.mode==='finish'?clamp(-ST.x*.3,-1,1):(K.r?1:0)-(K.l?1:0);ST.steer+=(tgt-ST.steer)*Math.min(1,h*9);
    if(ST.mode==='finish')ST.v=Math.max(0,ST.v-30*h);else if(K.b)ST.v=Math.max(0,ST.v-BRK*h);else ST.v=Math.min(VMAX,ST.v+ACC*(1-ST.v/VMAX*.5)*h);
    if(Math.abs(ST.x)>W-.2&&ST.y<.05){ST.v-=ST.v*.9*h;ST.shake=Math.max(ST.shake,.22)}
    const k=kAt(ST.s),need=ST.v*ST.v*k,lean=Math.max(0,ST.steer*Math.sign(k)),grip=24+30*lean,over=Math.max(0,Math.abs(need)-grip);ST.over=over;
    if(ST.y<.05)ST.slide+=-Math.sign(k)*over*.9*h;
    ST.slide*=Math.exp(-(over>0?1.4:5)*h);
    ST.x+=(ST.steer*(6+.17*ST.v)*(ST.y>.05?.6:1)+ST.slide)*h;ST.s+=ST.v*h;
    if(ST.jb>0){ST.jb-=h;if(ST.y<=0&&ST.mode==='run'){ST.jb=0;ST.vy=JV;beep(520,0,.08,'square',.03);beep(780,.05,.1,'square',.03)}}
    if(ST.y>0||ST.vy>0){ST.y+=ST.vy*h;ST.vy-=GRAV*h;if(ST.y<=0){ST.y=0;ST.vy=0;ST.shake=Math.max(ST.shake,.4);const p=posAt(ST.s,ST.x,new V3(),.2);for(let i=0;i<5;i++)puff(p,1.3,.8,1,2)}}
    if(ST.mode==='run'){if(Math.abs(ST.x)>WALLX)return crash('wall');if(ST.s>=FIN)finish()}
    else if((ST.finT-=h)<=0)result(true)}
  else if(ST.mode==='crash'){ST.t+=h;ST.v*=Math.exp(-3.2*h);ST.s+=ST.v*h;ST.x=clamp(ST.x+ST.slide*h*.3,-WALLX+.4,WALLX-.4);ST.slide*=Math.exp(-4*h);ST.spin+=h*10*Math.max(0,ST.crashT/1.3);
    if(ST.y>0||ST.vy>0){ST.y+=ST.vy*h;ST.vy-=GRAV*h;if(ST.y<0){ST.y=0;ST.vy=0}}
    if((ST.crashT-=h)<=0){if(ST.lives<=0)result(false);else respawn()}}}
function crash(why){if(why==='rock'&&ST.inv>0)return;setMode('crash');ST.crashT=1.3;ST.lives--;ST.crashes++;ST.shake=1.1;ST.spin=0;ST.vy=why==='rock'?6:2;ST.cause=why;
  el.lives.forEach((i,k)=>i.classList.toggle('off',k>=ST.lives));const p=posAt(ST.s,ST.x,new V3(),.5);chips(p,10,7);for(let i=0;i<8;i++)puff(p,1.6,1.1,1.6,2.5);
  try{if(playLoud()){noise(.35,.22);tone(110,0,.35,'sawtooth',.06,40)}}catch{}big(why==='wall'?'쾅! 절벽에 부딪혔어요':'쿵! 돌에 걸렸어요','small bad',1.25)}
function respawn(){setMode('run');ST.x=clamp(ST.x*.3,-2,2);ST.slide=0;ST.v=14;ST.y=0;ST.vy=0;ST.inv=2;ST.spin=0;ST.steer=0;
  ROCKS.forEach(r=>{if(r.st>0&&r.s>ST.s-3&&r.s<ST.s+45){r.st=3;r.mesh.visible=false;if(r.ring)r.ring.visible=false}});big(ST.lives===1?'마지막 기회!':'다시 출발!','small',1)}
function finish(){setMode('finish');ST.finT=2;big('도착! ✉','good',1.8);[784,988,1175,1568].forEach((n,i)=>beep(n,i*.1,.16,'triangle',.05))}
function result(ok){setMode('result');engineSet(true);engineOff();const t=ST.t,stars=ok?(t<=T3?3:t<=T2?2:1):0;let isNew=false;
  if(ok){SAVE.clears++;if(SAVE.best==null||t<SAVE.best){SAVE.best=t;isNew=true}SAVE.stars=Math.max(SAVE.stars,stars);SAVE.letters=Math.max(SAVE.letters,ST.letters);PG.cleared=true}save();
  el.res.innerHTML=ok?`<h2>✉ 배달 완료!</h2>${isNew?'<div class="pg-new">새 기록!</div>':''}<div class="pg-stars">${'★'.repeat(stars)}<i>${'★'.repeat(3-stars)}</i></div>
    <dl><dt>⏱ 걸린 시간</dt><dd>${fmt(t)}</dd><dt>✉ 주운 편지</dt><dd>${ST.letters} / ${LETTERS.length}</dd><dt>💥 넘어짐</dt><dd>${ST.crashes}번</dd><dt>🏆 최고 기록</dt><dd>${fmt(SAVE.best)}</dd></dl>
    <p style="margin:-6px 0 16px;font-size:13px;color:#7a6346">${stars<3?`★★★ 은 ${T3}초 안에 — 급커브 앞에서만 브레이크!`:'최고의 우편배달부예요! 🏅'}</p><div class="pg-btns"><button class="pg-btn main" id="pgAgain">다시 달리기</button><button class="pg-btn" id="pgBack">마을로</button></div>`
   :`<h2>😵 배달 실패…</h2><div class="pg-stars"><i>★★★</i></div><dl><dt>📍 달린 거리</dt><dd>${(ST.s/1000).toFixed(2)} / ${(FIN/1000).toFixed(2)} km</dd><dt>✉ 주운 편지</dt><dd>${ST.letters} / ${LETTERS.length}</dd></dl>
    <p style="margin:-6px 0 16px;font-size:13px;color:#7a6346">급커브 표지판이 보이면 ↓ 브레이크, 커브 안쪽으로 핸들! 길 위의 돌은 Space 로 넘어요.</p><div class="pg-btns"><button class="pg-btn main" id="pgAgain">다시 도전</button><button class="pg-btn" id="pgBack">마을로</button></div>`;
  el.res.querySelector('#pgAgain').onclick=start;el.res.querySelector('#pgBack').onclick=close;setTimeout(()=>{const b=el.res.querySelector('#pgAgain');b&&b.focus()},40);
  if(ok)[523,659,784,1047].forEach((n,i)=>beep(n,.2+i*.12,.18,'triangle',.05));else beep(300,0,.3,'sine',.05)}

/* ═══ 8. 낙석 · 편지 · 먼지 움직이기 ═══ */
const _r=new V3(),_b=new V3(),_c=new V3(),_l=new V3();
function rocksTick(dt){const look=clamp(ST.v*1.6,45,112);
  for(const r of ROCKS){
    if(r.st===0&&ST.mode==='run'){if(r.fall&&r.s-ST.s<look&&r.s>ST.s+8){r.st=1;r.t=0;posAt(r.s+6,r.side*(W+10),r.a,wallH(r.s,r.side)*.75);posAt(r.s,r.x,r.b,r.r*.6);r.mesh.visible=true;r.ring.visible=true;posAt(r.s,r.x,r.ring.position,.08);r.ring.scale.setScalar(r.r*1.2);r.ring.rotation.z=0;
        const k=trk(r.s);r.ring.rotation.set(-Math.PI/2+slopeAt(r.s)*0,0,0);beep(220,0,.18,'sawtooth',.02)}
      else if(!r.fall&&r.s-ST.s<300&&r.s>ST.s-10){r.st=2;posAt(r.s,r.x,r.mesh.position,r.r*.55);r.mesh.rotation.set(r.r*3,r.s,0);r.mesh.visible=true}}
    if(r.st===1){r.t+=dt;const u=Math.min(1,r.t/FT),e=1-(1-u)*(1-u);r.mesh.position.set(lerp(r.a.x,r.b.x,e),r.a.y+(r.b.y-r.a.y)*u*u,lerp(r.a.z,r.b.z,e));r.mesh.rotation.x+=dt*7;r.mesh.rotation.z+=dt*5;
      r.ring.material.opacity=.45+.45*Math.abs(Math.sin(r.t*14));r.ring.scale.setScalar(r.r*(1.5-.4*u));
      if(u>=1){r.st=2;r.ring.visible=false;const d=Math.abs(r.s-ST.s);if(d<70)ST.shake=Math.max(ST.shake,.55*(1-d/70));for(let i=0;i<6;i++)puff(r.b,1.8,1.2,1.5,2.4);chips(r.b,6,5);
        try{if(playLoud()&&d<120){tone(80,0,.3,'sine',.09,35);noise(.15,.12)}}catch{}if(r.roll)r.vx=(r.x>0?-1:1)*(2+Math.random()*2)}}
    if(r.st===2&&r.vx){r.x+=r.vx*dt;r.vx*=Math.exp(-.9*dt);if(Math.abs(r.vx)<.2)r.vx=0;posAt(r.s,r.x,r.mesh.position,r.r*.55);r.mesh.rotation.z-=r.vx*dt/r.r}
    if(ST.mode==='run'&&(r.st===2||(r.st===1&&r.t/FT>.82))){const ds=r.s-ST.s,dx=r.x-ST.x;if(Math.abs(ds)<r.r+.9&&Math.abs(dx)<r.r+.45&&ST.y<r.r*1.5-.35){crash('rock');r.st=3;r.mesh.visible=false;if(r.ring)r.ring.visible=false}}}}
function lettersTick(dt){for(const L of LETTERS){if(L.got){if(L.pop>0){L.pop-=dt;L.g.scale.setScalar(1+(.5-L.pop)*3);L.g.position.y+=dt*6;if(L.pop<=0)L.g.visible=false}continue}
    if(Math.abs(L.s-ST.s)>260){L.g.visible=false;continue}L.g.visible=true;posAt(L.s,L.x,L.g.position,L.y+Math.sin(time*3+L.s)*.12);L.g.rotation.y=time*2.5+L.s;
    if(ST.mode==='run'&&Math.abs(L.s-ST.s)<1.8&&Math.abs(L.x-ST.x)<1.4&&Math.abs(ST.y+1.1-L.y)<1.4){L.got=true;L.pop=.5;ST.letters++;beep(988,0,.08,'square',.03);beep(1319,.06,.12,'square',.03)}}}
function dustTick(dt){
  if((ST.mode==='run'||ST.mode==='finish')&&ST.y<.05&&ST.v>8){const rate=ST.v/VMAX*(ST.over>0?2.2:1)*(Math.abs(ST.x)>W-.2?2:1);if(Math.random()<rate*dt*30){posAt(ST.s-1,ST.x,_r,.3);puff(_r,.9+ST.v/VMAX,.7,.8,.6)}}
  for(const d of DUST){if(!d.s.visible)continue;d.t+=dt;const u=d.t/d.life;if(u>=1){d.s.visible=false;continue}d.s.position.addScaledVector(d.v,dt);d.v.multiplyScalar(Math.exp(-2*dt));d.s.scale.setScalar(d.size*(.6+u*2.4));d.s.material.opacity=.5*(1-u)}
  for(const b of BITS){if(!b.o.visible)continue;b.t-=dt;if(b.t<=0){b.o.visible=false;continue}b.o.position.addScaledVector(b.v,dt);b.v.y-=22*dt;b.o.rotation.x+=dt*8;b.o.rotation.y+=dt*6}}

/* ═══ 9. 오토바이 · 카메라 ═══ */
function placeBike(dt){if(!BK)return;const p=trk(ST.s),th=p.th;posAt(ST.s,ST.x,_b);BK.g.position.set(_b.x,_b.y+ST.y,_b.z);
  const lat=ST.steer*(6+.17*ST.v)*.6+ST.slide,yaw=Math.atan2(lat,Math.max(8,ST.v))*.9;
  const want=clamp(Math.atan(ST.v*ST.v*kAt(ST.s)/26)*.75+ST.steer*.22,-.8,.8);ST.lean+=(want-ST.lean)*Math.min(1,dt*7);
  BK.g.rotation.set(-Math.atan(slopeAt(ST.s))+(ST.y>0?-.12:0),th-yaw+(ST.mode==='crash'?ST.spin:0),0,'YXZ');
  BK.lean.rotation.z=ST.mode==='crash'?clamp(ST.spin*.25,0,1.35)*(ST.cause==='wall'?-Math.sign(ST.x||1):1):ST.lean;
  BK.wheels.forEach(w=>w.rotation.x+=ST.v*dt/.39);BK.scarf.rotation.x=.25+Math.sin(time*32)*.18*ST.v/VMAX;
  BK.g.visible=ST.inv>0&&ST.mode==='run'?Math.floor(ST.inv*12)%2===0:true;
  sun.position.copy(_b).addScaledVector(SUN_DIR,140);sun.target.position.copy(_b)}
function chaseCam(dt){const back=6.4+ST.v*.03;ST.camS+=(ST.s-back-ST.camS)*Math.min(1,dt*22);if(ST.camS>ST.s-4.5)ST.camS=ST.s-4.5;
  posAt(ST.camS,ST.x*.6,_c,2.7+ST.y*.5);const gy=trk(ST.camS).y+1.2;if(_c.y<gy)_c.y=gy;posAt(ST.s+11,ST.x*.4,_l,1.35+ST.y*.4);
  const sh=ST.shake+(ST.v>45?(ST.v-45)*.0032:0);ST.shake=Math.max(0,ST.shake-dt*1.6);
  _c.x+=(Math.random()-.5)*sh*.5;_c.y+=(Math.random()-.5)*sh*.4;_c.z+=(Math.random()-.5)*sh*.5;
  PC.position.copy(_c);PC.lookAt(_l);PC.rotateZ(-ST.lean*.16);
  const fov=60+ST.v*.19;PC.fov+=(fov-PC.fov)*Math.min(1,dt*3)}
function titleCam(){const s=ST.ts;posAt(s,-3+Math.sin(s*.01)*3,_c,9+Math.sin(s*.013)*3);posAt(s+48,0,_l,4);PC.position.copy(_c);PC.lookAt(_l);PC.fov=58}
let orb=0;function resultCam(dt){orb+=dt*.5;posAt(ST.s,ST.x,_l,1.1);posAt(ST.s-7.5,clamp(ST.x*.4+Math.sin(orb)*3,-W,W),_c,3.4);PC.position.copy(_c);PC.lookAt(_l);PC.fov=55}   // 길 위 뒤쪽에서 좌우로 천천히 — 벽 속으로 들어가지 않게

/* ═══ 10. HUD ═══ */
let warnTxt='';
function hud(){const kmh=ST.v*3.6;el.needle.style.left=(4+clamp(kmh/300,0,1)*92)+'%';el.kmh.textContent=Math.round(kmh)+' km/h';el.time.textContent=ST.t.toFixed(1);
  const pr=clamp(ST.s/FIN,0,1);el.prog.style.width=(pr*100)+'%';el.dist.style.setProperty('--p',(pr*100)+'%');el.let.textContent=ST.letters;el.ring.style.setProperty('--p',(ST.letters/LETTERS.length*100)+'%');
  el.fx.style.opacity=clamp((ST.v-38)/32,0,1)*.55;el.fx.style.setProperty('--a',(Math.random()*7)+'deg');
  let t='',hot=false;const c=CURVES.find(c=>c.s1>ST.s&&c.s0-ST.s<210);
  if(c){const ar=c.dir>0?'↱':'↰';if(ST.s<c.s0){hot=ST.v>c.vs*1.04;t=`⚠ 급커브 ${ar} ${c.ang}° <small>${hot?'감속! ↓ 브레이크':'안쪽으로 핸들'}</small>`}else{hot=ST.over>8;t=`${ar} 안쪽으로 꺾어요! <small>${hot?'미끄러져요 — 브레이크!':'좋아요'}</small>`}}
  else if(ZONES.some(([a,b])=>ST.s>a-90&&ST.s<b))t='🪨 낙석 주의 <small>빨간 원을 피하고 · 길 위 돌은 점프</small>';
  if(t!==warnTxt){warnTxt=t;el.warn.innerHTML=t}el.warn.classList.toggle('on',!!t&&ST.mode!=='finish');el.warn.classList.toggle('hot',hot)}

/* ═══ 11. 한 프레임 ═══ */
function step(dt){PC.aspect=innerWidth/innerHeight;
  if(ST.mode==='title'){ST.ts+=dt*16;if(ST.ts>FIN-300)ST.ts=0;titleCam();ST.s=0;ST.x=0;placeBike(dt);lettersTick(dt)}
  else if(ST.mode==='pause'){}
  else if(ST.mode==='result'){resultCam(dt);placeBike(0);dustTick(dt);lettersTick(dt)}
  else if(ST.mode==='count'){ST.cnt-=dt;const n=Math.ceil(ST.cnt-.6);if(n!==ST.lastC&&n>=0){ST.lastC=n;if(n>0){big(String(n),'',.9);beep(440,0,.15,'square',.04)}else{big('출발!','good',1);beep(880,0,.3,'square',.05)}}
    if(ST.cnt<=.6){setMode('run')}chaseCam(dt);placeBike(dt);lettersTick(dt);hud()}
  else{const n=dt>.02?3:dt>.01?2:1;for(let k=0;k<n;k++)physics(dt/n);rocksTick(dt);lettersTick(dt);dustTick(dt);placeBike(dt);chaseCam(dt);hud()}
  engineSet(ST.mode==='pause');
  sky.position.copy(PC.position);sunSp.position.copy(PC.position).addScaledVector(SUN_DIR,2000);PC.updateProjectionMatrix()}
let lastNow=0;
const _rs=renderScene;renderScene=function(){if(!PG.on)return _rs.apply(this,arguments);const now=performance.now(),dt=lastNow?Math.min(.05,Math.max(0,(now-lastNow)/1000)):1/60;lastNow=now;
  try{step(dt)}catch(e){console.error(e)}renderer.shadowMap.needsUpdate=true;renderer.render(PS,PC)};

/* ═══ 12. 마을 쪽 — 문 앞에 오면 열기 · F · 미니게임판 ═══ */
let armed=true;
const _fp=findPlay;findPlay=function(){if(!PG.on&&nearDoor()){PLAY_TXT.post='🏍 협곡 특급 우편 배달하기';return {kind:'post'}}return _fp()};
const _da=doAction;doAction=function(){if(!inputBusy()&&!PLAY.mode&&walkish()&&nearDoor()){open();return}return _da()};
$('#ghTip').insertAdjacentHTML('beforebegin','<div class="gh-row" id="ghPostRow"><span><b>🏍 협곡 특급 우편</b><small id="ghPost"></small></span><button class="gh-btn" id="ghPostBtn">우체국으로</button></div>');
$('#ghPostBtn').onclick=()=>{if(nearDoor(7))return open();if(PLAY.mode)endPlay();armed=true;beginWalk(true);travelTo(DOOR,null)};
function rowHud(){const e=$('#ghPost');if(!e)return;e.textContent=SAVE.best!=null?`최고 ${fmt(SAVE.best)} · ${'★'.repeat(SAVE.stars)}${'☆'.repeat(3-SAVE.stars)}`:'250km/h 협곡 질주 배달';$('#ghPostBtn').textContent=nearDoor(7)?'출발':'우체국으로'}
let rowT=0;
const _ue=updateExtras;updateExtras=function(dt){_ue(dt);try{if((rowT-=dt)<=0){rowT=1;rowHud()}
  if(!PG.on){const d=Math.hypot(player.x-DOOR.x,player.z-DOOR.z);if(d>8)armed=true;if(armed&&d<3.2&&cameraMode==='walking'&&!inputBusy()&&!PLAY.mode&&!document.querySelector('.game-modal.on,#heroPick.on,#splash')){armed=false;open()}}}catch(e){console.error(e)}};
rowHud();
window.dpPost={open,close,start,pause,resume,ST,K,ROCKS,LETTERS,CURVES,DOOR,spot,get LEN(){return LEN},get FIN(){return FIN},PS,PC,
  sim(sec,dt=1/60){for(let t=0;t<sec&&(ST.mode!=='result');t+=dt)step(dt);return {mode:ST.mode,s:+ST.s.toFixed(1),t:+ST.t.toFixed(2),lives:ST.lives,crashes:ST.crashes,letters:ST.letters}},
  setPar(a,b){T3=a;T2=b}};
})();
