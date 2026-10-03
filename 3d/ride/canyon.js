/* 협곡 특급 우편(CANYON EXPRESS)에서 만든 협곡 디자인 — 갈림길의 기본 길(협곡 헤어핀) 양옆.
   길가 흙 → 풀 → 벽 밑 덤불 → 띠 무늬 사암 절벽(중간 턱) → 꼭대기 풀밭 → 먼 고원, 소나무 · 사이프러스 · 덤불 · 돌.
   - 벽은 '다른 길과의 중간선'까지만 뻗는다. 헤어핀 사이는 바위 능선이 되고,
     마을길 쪽은 능선을 넘어 마을길 가장자리로 내려간다(두 길이 붙어 있는 갈림목에서는 낮아져 사라진다).
   - 협곡 특급 쪽 1m = 이 게임의 7/9 단위(길 반폭 7m ↔ 9). */
(function(root){
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
function hash(n){const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s)}
function vn(x){const i=Math.floor(x),f=x-i,u=f*f*(3-2*f);return hash(i)*(1-u)+hash(i+1)*u}
function rng(seed){let a=seed>>>0;return ()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const K=9/7,W=9;
const ROCK=['#efc99a','#d4945f','#f5dfbd','#c27f52','#e5b47f'];

// 흙길 무늬 — 바퀴 자국 두 줄 · 자갈 · 가장자리 풀빛
function roadTexture(T){
  const S=512,cv=document.createElement('canvas');cv.width=cv.height=S;const x=cv.getContext('2d'),R=rng(7);
  x.fillStyle='#b88d5d';x.fillRect(0,0,S,S);
  for(let i=0;i<5000;i++){const c=R();x.fillStyle=c<.5?'rgba(120,85,50,.18)':c<.8?'rgba(225,190,140,.2)':'rgba(90,70,45,.25)';const w=1+R()*4;x.fillRect(R()*S,R()*S,w,w*(.5+R()))}
  for(const u of [.32,.68]){const g=x.createLinearGradient((u-.09)*S,0,(u+.09)*S,0);g.addColorStop(0,'rgba(105,74,42,0)');g.addColorStop(.5,'rgba(105,74,42,.4)');g.addColorStop(1,'rgba(105,74,42,0)');x.fillStyle=g;x.fillRect((u-.09)*S,0,.18*S,S)}
  for(let i=0;i<180;i++){x.fillStyle=R()<.5?'#8d7558':'#dcc7a4';x.beginPath();x.arc(R()*S,R()*S,1.5+R()*3,0,7);x.fill()}
  const e=x.createLinearGradient(0,0,S,0);e.addColorStop(0,'rgba(118,150,78,.6)');e.addColorStop(.07,'rgba(118,150,78,0)');e.addColorStop(.93,'rgba(118,150,78,0)');e.addColorStop(1,'rgba(118,150,78,.6)');x.fillStyle=e;x.fillRect(0,0,S,S);
  const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;return t}

function boardTexture(T,draw,w=256,h=128){const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;return t}

function build({T,scene,drivePoint,ride,fork,landmarks,turns}){
  const s0=fork.start-800,s1=fork.end+200,RS=40,rings=[];for(let s=s0;s<=s1;s+=RS)rings.push(s);const R=rings.length;
  // 다른 길 표본: 협곡 벽이 있는 길(C) — 서로 중간선에서 만나 능선이 된다.
  // 벽이 없는 길(V: 갈림길 앞뒤 공용 길 · 갈라진 마을길) — 그쪽으로는 능선을 넘어 내려간다.
  const C=[],Sf=[];
  for(let s=-600;s<=ride.length+600;s+=40){const p=drivePoint(s,0,'cliff');(s>=s0&&s<=s1?C:Sf).push([p.x,p.z,s,1])}
  for(let s=fork.start;s<=fork.end;s+=40){const p=drivePoint(s,0,'safe'),q=drivePoint(s,0,'cliff');if(Math.hypot(p.x-q.x,p.z-q.z)>.5)Sf.push([p.x,p.z,s,0])}
  const ring=rings.map(s=>{const p=drivePoint(s,0,'cliff'),a=drivePoint(s-20,0,'cliff'),b=drivePoint(s+20,0,'cliff');let fx=b.x-a.x,fz=b.z-a.z;const l=Math.hypot(fx,fz)||1;fx/=l;fz/=l;return {s,x:p.x,y:p.y,z:p.z,rx:-fz,rz:fx}});
  const lim=(list,r,side)=>{let m=420;const rx=r.rx*side,rz=r.rz*side;for(const q of list){if(q[3]&&Math.abs(q[2]-r.s)<600)continue;const qx=q[0]-r.x,qz=q[1]-r.z,a=qx*rx+qz*rz;if(a<=.01)continue;const d=(qx*qx+qz*qz)/(2*a);if(d<m)m=d}return m};
  const smooth=av=>{const t=new Float32Array(R),o=new Float32Array(R);for(let r=0;r<R;r++){let m=1e9;for(let k=-3;k<=3;k++)m=Math.min(m,av[clamp(r+k,0,R-1)]);t[r]=m}for(let r=0;r<R;r++){let s=0;for(let k=-2;k<=2;k++)s+=t[clamp(r+k,0,R-1)];o[r]=s/5}return o};
  const wallH=(s,side)=>{const m=s/20/K,base=(34+30*vn(m*.006+side*13.7)+10*vn(m*.023+side*3))*K,e=Math.min(sstep(s0,fork.start+800,s),sstep(s1,fork.end-1600,s));return lerp(.6,base,e)};
  // 길 오른쪽 명소(보물 창고)는 절벽을 뒤로 물려 자리를 비운다
  const push=(s,side)=>{let p=0;if(side>0)for(const l of landmarks){if(l.x<=0||l.z<s0||l.z>s1)continue;const u=(s-l.z)/420;if(Math.abs(u)<1)p=Math.max(p,(Math.cos(u*Math.PI)+1)/2)}return p*16};
  const P=[[-.6,-.3,0],[1,.04,1],[2.6,.16,2],[4.2,.32,3],[4.6,.13,4],[5.4,.27,4],[5.9,.41,4],[8.4,.43,5],[8.9,.57,4],[10,.73,4],[10.8,.88,4],[11.6,1,6],[14,1.03,7],[40,1.12,7],[90,1.28,7],[160,1.55,8],[240,1.8,8]];
  const JM=[0,0,0,1.2,1.6,2,2,1.5,2,2.4,2.2,2,0,0,0,0,0];   // 절벽 들쭉날쭉
  const RID=[[.8,1.02,7],[1,.72,4],[1.2,.4,4],[1.4,.12,3],[1.6,-.3,1]];   // 마을길 쪽으로 내려가는 능선 (g 배수, 높이 배수, 종류)
  const M=P.length,A={foot:[],ledge:[],top:[],plat:[],face:[]},col=new T.Color(),col2=new T.Color(),green=new T.Color('#7f9a52');
  const colorOf=(c,ty,h,s,side,m)=>{const nz=vn(s*.0035+m*1.7+side*5);
    if(ty===0)c.set('#b5875a');else if(ty===1)c.set('#a3985c');else if(ty===2)c.set(nz>.5?'#7ea457':'#8fa85a');else if(ty===3)c.set('#6e8f4b');
    else if(ty===4||ty===6){const b=Math.floor((h/K+vn(s*.0015+side*20)*4)/3.3);c.set(ROCK[((b%5)+5)%5]);if(h<3*K)c.multiplyScalar(.8);if(ty===6&&nz>.55)c.lerp(green,.6)}
    else if(ty===5)c.set('#7a9a50');else if(ty===7)c.set(nz>.62?'#b3a86a':'#86a35a');else c.set('#9fb088');return nz};
  const walls=[];
  for(const side of [-1,1]){
    const avC=new Float32Array(R),avS=new Float32Array(R);
    for(let r=0;r<R;r++){avC[r]=lim(C,ring[r],side);avS[r]=lim(Sf,ring[r],side)}
    const aC=smooth(avC),aS=smooth(avS);
    const pos=new Float32Array(R*M*3),cols=new Float32Array(R*M*3);
    for(let r=0;r<R;r++){const g0=ring[r],s=g0.s,H=wallH(s,side),avA=Math.min(aC[r],aS[r]),rel=Math.max(6*K,avA-W),pu=push(s,side),
      b=Math.max(sstep(1,1.35,aS[r]/Math.max(1,avA)),sstep(140,260,aS[r])),g=clamp(aS[r]-W-1.5,0,90),Hr=Math.min(H,g*2.4),fr=Math.min(1,.6*g/(11.6*K)),lo=Math.min(1,g/6);
      const ee=Math.min(sstep(s0,fork.start+800,s),sstep(s1,fork.end-1600,s)),fall=sstep(110*K,200*K,rel),ms=s/20/K,j=k=>(vn(ms*.11+k*3.1+side*50)-.5)*1.7+(vn(ms*.031+k*1.3+side*7)-.5);
      for(let m=0;m<M;m++){const p=P[m],jt=JM[m]?j(m-3)*JM[m]:0;
        // 고원(다른 협곡 다리와 중간선까지)
        let o=(p[0]+jt)*K;if(o>14*K)o=14*K+(o-14*K)*Math.max(.12,ee);if(rel>=26*K){if(o>14*K)o=14*K+(o-14*K)*(rel-14*K)/(226*K)}else if(o>4.5*K)o=4.5*K+(o-4.5*K)*(rel-4.5*K)/(235.5*K);
        const ty=p[2];let h=ty<=3?p[1]*K:p[1]*H+(ty>=7?(vn(ms*.012+o/K*.03+side*9)-.5)*H*.3*Math.min(1,o/K/60):0);if(m>=15)h*=1-fall*(m===16?1.08:.45);
        // 능선(마을길과의 중간선을 넘어 마을길 쪽으로 내려간다)
        let o2,h2,ty2;if(m<12){o2=m===0?o:(p[0]+jt)*K*fr;ty2=ty;h2=ty<=3?p[1]*K*lo:p[1]*Hr}else{const q=RID[m-12];o2=Math.max(.6*g,q[0]*g);h2=q[1]*Hr;ty2=q[2]}
        if(m>=3){o+=pu;o2+=pu}
        const oo=lerp(o2,o,b),hh=lerp(h2,h,b),k3=(r*M+m)*3,w=W+oo;
        pos[k3]=g0.x+g0.rx*side*w;pos[k3+1]=g0.y+hh;pos[k3+2]=g0.z+g0.rz*side*w;
        const nz=colorOf(col,ty,h,s,side,m);colorOf(col2,ty2,h2,s,side,m);col2.lerp(col,b);cols[k3]=col2.r;cols[k3+1]=col2.g;cols[k3+2]=col2.b;
        const a=[pos[k3],pos[k3+1],pos[k3+2],s,side,b>.5?H:Hr];
        if(b>.5){if(m===3&&rel>=10*K&&r%2===0)A.foot.push(a);if(m===7&&rel>=26*K&&H>14*K)A.ledge.push(a);if(m===12&&rel>=20*K&&H>10*K)A.top.push(a);if(m===13&&rel>=40*K)A.plat.push(a);if((m===5||m===9||m===10)&&rel>=26*K&&H>16*K&&nz>.72)A.face.push(a)}
        else{if(m===3&&g>=8&&r%2===0)A.foot.push(a);if(m===12&&Hr>10)A.top.push(a)}}}
    const idx=[];for(let r=0;r<R-1;r++)for(let m=0;m<M-1;m++){const a=r*M+m,c=a+M;idx.push(a,c,a+1,a+1,c,c+1)}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('color',new T.BufferAttribute(cols,3));geo.setIndex(idx);geo.computeVertexNormals();
    const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:.95,flatShading:true,side:T.DoubleSide}));mesh.receiveShadow=true;mesh.castShadow=true;mesh.frustumCulled=false;scene.add(mesh);walls.push(mesh)}

  // 나무 · 덤불 · 돌 — 같은 모양은 인스턴스로 한 번에
  const m4=new T.Matrix4(),qt=new T.Quaternion(),eu=new T.Euler(),sv=new T.Vector3(),pv=new T.Vector3();
  const SM=(c,o)=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:.85},o||{}));
  const inst=(parts,list)=>{if(!list.length)return;parts.forEach(([geo,mat])=>{const m=new T.InstancedMesh(geo,mat,list.length);list.forEach((t,k)=>{qt.setFromEuler(eu.set(0,t.r,0));m4.compose(pv.set(t.x,t.y,t.z),qt,sv.set(t.sx,t.sy,t.sz));m.setMatrixAt(k,m4);if(t.c)m.setColorAt(k,t.c)});
    m.castShadow=true;m.receiveShadow=true;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;scene.add(m)})};
  const tg=(geo,x,y,z,sx=1,sy=1,sz=1)=>{geo.scale(sx*K,sy*K,sz*K);geo.translate(x*K,y*K,z*K);return geo};
  const Rn=rng(11),pine=[],cyp=[],round=[],bush=[],stone=[],gc=()=>new T.Color().setHSL(.24+Rn()*.08,.32+Rn()*.15,.3+Rn()*.12);
  const put=(L,a,sc,dx=0,dz=0)=>L.push({x:a[0]+dx,y:a[1]-.25,z:a[2]+dz,r:Rn()*6.3,sx:sc,sy:sc*(.85+Rn()*.3),sz:sc});
  const kb=(x,y,z,sx,sy,sz)=>({x,y,z,r:Rn()*6,sx:sx*K,sy:sy*K,sz:sz*K,c:gc()});
  A.foot.forEach(a=>{const u=Rn();if(u<.3)bush.push(kb(a[0],a[1]-.1,a[2],.8+Rn()*.9,.6+Rn()*.5,.8+Rn()*.9));else if(u<.4)stone.push({x:a[0],y:a[1]-.2,z:a[2],r:Rn()*6,sx:(.5+Rn())*K,sy:(.4+Rn()*.6)*K,sz:(.5+Rn())*K});else if(u<.46&&a[5]>14*K)put(cyp,a,.8+Rn()*.5);else if(u<.5&&a[5]>14*K)put(pine,a,.7+Rn()*.3)});
  A.ledge.forEach(a=>{const u=Rn();if(u<.12)put(pine,a,.8+Rn()*.4);else if(u<.3)bush.push(kb(a[0],a[1],a[2],1+Rn(),.7,1+Rn()))});
  A.top.forEach(a=>{const u=Rn();if(u<.2)put(pine,a,1.1+Rn()*.6);else if(u<.3)put(cyp,a,1+Rn()*.6);else if(u<.38)put(round,a,1+Rn()*.5)});
  A.face.forEach(a=>{if(Rn()<.55)bush.push(kb(a[0],a[1],a[2],1.4+Rn()*1.6,.9+Rn(),1.4+Rn()*1.6))});
  A.plat.forEach(a=>{const u=Rn();if(u<.05)put(pine,a,1.2+Rn()*.6,(Rn()-.5)*26,(Rn()-.5)*26);else if(u<.1)put(round,a,1.2+Rn()*.5,(Rn()-.5)*26,(Rn()-.5)*26)});
  const trunk=SM('#6b4a32'),dkG=SM('#3e6838',{flatShading:true}),cyG=SM('#3a5c37',{flatShading:true}),rdG=SM('#6f8f45',{flatShading:true}),white=SM('#ffffff',{flatShading:true}),st=SM('#b49272',{flatShading:true});
  inst([[tg(new T.CylinderGeometry(.22,.4,10.5,6),0,5.2,0),trunk],[tg(new T.IcosahedronGeometry(2.7,1),0,10.4,0,1,.42,1),dkG],[tg(new T.IcosahedronGeometry(2,1),1.4,8.9,.6,1,.45,1),dkG],[tg(new T.IcosahedronGeometry(1.6,1),-1.3,9.6,-.8,1,.45,1),dkG]],pine);
  inst([[tg(new T.CylinderGeometry(.16,.24,1.8,6),0,.9,0),trunk],[tg(new T.IcosahedronGeometry(1,1),0,4.3,0,1,3.4,1),cyG]],cyp);
  inst([[tg(new T.CylinderGeometry(.2,.3,3.2,6),0,1.6,0),trunk],[tg(new T.IcosahedronGeometry(2.2,1),0,4.2,0,1,.82,1),rdG]],round);
  inst([[new T.IcosahedronGeometry(1,0),white]],bush);
  inst([[new T.DodecahedronGeometry(1,0),st]],stone);

  // 표지판 — 헤어핀 바깥쪽 노란 갈매기 표지 · 헤어핀 주의
  const gap=s=>{const a=drivePoint(s,0,'safe'),b=drivePoint(s,0,'cliff');return Math.hypot(a.x-b.x,a.z-b.z)};
  const wood=SM('#7a5a3a');
  const chev=dir=>boardTexture(T,(c,w,h)=>{c.fillStyle='#f2c230';c.fillRect(0,0,w,h);c.strokeStyle='#3b2a1a';c.lineWidth=10;c.strokeRect(5,5,w-10,h-10);c.fillStyle='#2b2520';
    for(const cx of [w*.36,w*.64]){c.beginPath();c.moveTo(cx-dir*26,22);c.lineTo(cx+dir*22,h/2);c.lineTo(cx-dir*26,h-22);c.lineTo(cx-dir*6,h-22);c.lineTo(cx+dir*42,h/2);c.lineTo(cx-dir*6,22);c.closePath();c.fill()}});
  const chevMat={1:new T.MeshStandardMaterial({map:chev(1),side:T.DoubleSide,roughness:.6}),'-1':new T.MeshStandardMaterial({map:chev(-1),side:T.DoubleSide,roughness:.6})};
  const post=(p,h)=>{const m=new T.Mesh(new T.CylinderGeometry(.12,.14,h,8),wood);m.position.set(p.x,p.y+h/2,p.z);m.castShadow=true;scene.add(m)};
  for(const t of turns){const out=-t.side;
    for(let s=t.start-120;s<=t.end;s+=120){let lat=out*11.5;if(out<0){const gp=gap(s);if(gp>.5&&gp<26)lat=-(gp+11.5)}
      const p=drivePoint(s,lat,'cliff'),aim=drivePoint(s-80,out*4,'cliff');post(p,1.6);
      const b=new T.Mesh(new T.PlaneGeometry(2.3,1.15),chevMat[t.side]);b.position.set(p.x,p.y+2.05,p.z);b.lookAt(aim.x,p.y+2.05,aim.z);b.castShadow=true;scene.add(b)}}
  const rockTex=boardTexture(T,(c,w,h)=>{c.fillStyle='#fff6dc';c.fillRect(0,0,w,h);c.strokeStyle='#d0402c';c.lineWidth=12;c.strokeRect(6,6,w-12,h-12);c.fillStyle='#2b2520';c.font='bold 54px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('⚠ 헤어핀 주의',w/2,h/2+2)},384,128);
  for(const s of [fork.start+500,turns[1]?turns[1].start-700:fork.start+6000]){const p=drivePoint(s,12.5,'cliff'),aim=drivePoint(s-80,4,'cliff');post(p,2.2);
    const b=new T.Mesh(new T.PlaneGeometry(3.6,1.2),new T.MeshStandardMaterial({map:rockTex,side:T.DoubleSide,roughness:.6}));b.position.set(p.x,p.y+2.7,p.z);b.lookAt(aim.x,p.y+2.7,aim.z);b.castShadow=true;scene.add(b)}

  return {walls,anchors:A,inCanyon:(s,choice)=>choice==='cliff'&&s>fork.start&&s<fork.end}}

root.CANYON={build,roadTexture};
})(typeof window!=='undefined'?window:globalThis);
