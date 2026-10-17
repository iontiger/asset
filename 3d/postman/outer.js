/* 골목 배달부 — 마을 바깥 세 곳 (DentPhoto Village · Alley Postman)
   - 남쪽 큰길 상가: 남쪽 골목 출구들이 닿는 2차선 큰길 · 보도 · 줄무늬 차양 가게들 · 흰 경트럭 · 꼬깔 · 횡단보도 · 꽃삽 화원
   - 동쪽 언덕길: 가드레일 두른 굽은 오르막 → 돌계단 → 언덕 위 빨간 집과 빨간 우체통
   - 북서쪽 숲속 개울: 흙길 → 숲속 빈터 → 개울 위 나무 아치 다리 → 건너편 빈터
   마을 격자 밖 땅은 길 · 빈터 띠로 고르고(띠 가장자리는 원래 언덕으로 이어지며 깎인 비탈은 모래빛) 개울 자리는 판다.
   걸을 수 있는 곳 = 마을 네모 + 길 · 빈터 띠 − 물(다리 위는 빼고). 마을 출구가 바뀌어도 가장 가까운 출구에 길을 잇는다.
   PM_OUTER.plan(ctx) → {mod, groundY, walkFix, camBlock, free, paint, build(kit), update, spots, map} */
'use strict';
(function(root){
const sm=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
function seg(px,pz,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,L2=dx*dx+dz*dz;let t=L2?((px-ax)*dx+(pz-az)*dz)/L2:0;t=t<0?0:t>1?1:t;const qx=ax+dx*t,qz=az+dz*t;return {d:Math.hypot(px-qx,pz-qz),t,qx,qz}}
function arc(pts){const s=[0];for(let k=1;k<pts.length;k++)s.push(s[k-1]+Math.hypot(pts[k][0]-pts[k-1][0],pts[k][1]-pts[k-1][1]));return s}
// 조절점을 지나는 부드러운 곡선(Catmull-Rom) → 촘촘한 점
function spline(ctrl,step=1.2){const out=[];for(let i=0;i<ctrl.length-1;i++){const p0=ctrl[Math.max(0,i-1)],p1=ctrl[i],p2=ctrl[i+1],p3=ctrl[Math.min(ctrl.length-1,i+2)],n=Math.max(1,Math.ceil(Math.hypot(p2[0]-p1[0],p2[1]-p1[1])/step));
 for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t,f=(a,b,c,d)=>.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);out.push([f(p0[0],p1[0],p2[0],p3[0]),f(p0[1],p1[1],p2[1],p3[1])])}}
 out.push(ctrl[ctrl.length-1].slice());return out}

function plan(C){
 const {N,HW,cx,at,road,baseH}=C,R=C.rng(4242),ri=n=>Math.floor(R()*n),pick=a=>a[ri(a.length)];
 /* ── 마을 출구: 마을 가장자리에 닿은 골목 칸 ── */
 const exits=[];for(let k=0;k<N;k++){if(road(at(k,N-1)))exits.push({side:'S',x:cx(k),z:HW});if(road(at(k,0)))exits.push({side:'N',x:cx(k),z:-HW});if(road(at(N-1,k)))exits.push({side:'E',x:HW,z:cx(k)});if(road(at(0,k)))exits.push({side:'W',x:-HW,z:cx(k)})}
 exits.forEach(e=>e.h=baseH(e.x,e.z));
 const nearest=(side,x,z)=>{let b=null,bd=Infinity;for(const e of exits){if(e.side!==side)continue;const d=Math.hypot(e.x-x,e.z-z);if(d<bd){bd=d;b=e}}return b};

 /* ── 띠 · 빈터 · 물 — 8m 칸 바구니로 찾는다 ── */
 const CELL=8,grid=new Map(),paths=[],pads=[],waters=[],bridges=[],stairs=[],boxes=[],spots={},labels=[];
 const kk=(i,j)=>(i+512)*4096+j+512;
 function put(it,x0,z0,x1,z1){for(let i=Math.floor(x0/CELL);i<=Math.floor(x1/CELL);i++)for(let j=Math.floor(z0/CELL);j<=Math.floor(z1/CELL);j++){const k=kk(i,j);let a=grid.get(k);if(!a)grid.set(k,a=[]);a.push(it)}}
 const bucket=(x,z)=>grid.get(kk(Math.floor(x/CELL),Math.floor(z/CELL)));
 function addPath(p){p.s=arc(p.pts);p.len=p.s[p.s.length-1];paths.push(p);const m=p.hw+p.sh;
  for(let k=0;k<p.pts.length-1;k++){const [ax,az]=p.pts[k],[bx,bz]=p.pts[k+1];put({t:'seg',p,ax,az,bx,bz,h0:p.h[k],h1:p.h[k+1],hw:p.hw,sh:p.sh,walk:p.walk!==false},Math.min(ax,bx)-m,Math.min(az,bz)-m,Math.max(ax,bx)+m,Math.max(az,bz)+m)}return p}
 function addPad(o){pads.push(o);const m=o.r+o.sh;put(Object.assign({t:'pad',walk:o.walk!==false},o),o.x-m,o.z-m,o.x+m,o.z+m);return o}
 function addWater(w){w.s=arc(w.pts);waters.push(w);const m=w.hw+3.2;for(let k=0;k<w.pts.length-1;k++){const [ax,az]=w.pts[k],[bx,bz]=w.pts[k+1];put({t:'w',w,ax,az,bx,bz,b0:w.bed[k],b1:w.bed[k+1],hw:w.hw*Math.min(w.wf[k],w.wf[k+1])},Math.min(ax,bx)-m,Math.min(az,bz)-m,Math.max(ax,bx)+m,Math.max(az,bz)+m)}}
 // 자연 땅을 따라 부드럽게, 출발 높이에서 기울기 maxS 를 넘지 않게
 function profile(pts,h0,maxS,win=12){const s=arc(pts),nat=pts.map(p=>baseH(p[0],p[1]));
  const smo=nat.map((_,k)=>{let a=0,w=0;for(let m=0;m<pts.length;m++){const d=Math.abs(s[m]-s[k]);if(d<win){const ww=1-d/win;a+=nat[m]*ww;w+=ww}}return a/w});
  const h=[h0];for(let k=1;k<pts.length;k++){const ds=s[k]-s[k-1];h.push(Math.max(h[k-1]-maxS*ds,Math.min(h[k-1]+maxS*ds,smo[k])))}return h}
 const tangent=(pts,k)=>{const a=pts[Math.max(0,k-1)],b=pts[Math.min(pts.length-1,k+1)],L=Math.hypot(b[0]-a[0],b[1]-a[1])||1;return [(b[0]-a[0])/L,(b[1]-a[1])/L]};

 /* ═══ A. 남쪽 큰길 상가 ═══ */
 let street=null;
 {const sEx=exits.filter(e=>e.side==='S').sort((a,b)=>a.x-b.x);
  if(sEx.length){const z0=HW+8.5,xa=sEx[0].x-14,xb=sEx[sEx.length-1].x+14;
   const hAt=x=>{if(x<=sEx[0].x)return sEx[0].h;for(let k=0;k<sEx.length-1;k++){const a=sEx[k],b=sEx[k+1];if(x<=b.x)return a.h+(b.h-a.h)*sm((x-a.x)/(b.x-a.x))}return sEx[sEx.length-1].h};
   const pts=[],h=[];for(let x=xa;x<=xb+.01;x+=1.5){pts.push([x,z0+1]);h.push(hAt(x))}
   street={z0,xa,xb,hAt,ex:sEx,pts:pts.map(p=>[p[0],z0])};
   addPath({pts,h,hw:5.5,sh:5,kind:'street'});
   for(const e of sEx)addPath({pts:[[e.x,HW-.5],[e.x,z0-3.6]],h:[e.h,e.h],hw:1.5,sh:3,kind:'conn'});
   labels.push(['큰길 상가',(xa+xb)/2,z0+11])}}

 /* ═══ B. 동쪽 언덕길 → 돌계단 → 빨간 집 ═══ */
 let hill=null;
 {const e=nearest('E',HW,-20);if(e){const x0=HW,ze=e.z;
   const pts=spline([[x0-.5,ze],[x0+8,ze],[x0+17,ze-3],[x0+25,ze-10],[x0+31,ze-19],[x0+39,ze-25],[x0+48,ze-27],[x0+58,ze-25]],1.2);
   const h=profile(pts,e.h,.13);addPath({pts,h,hw:3.2,sh:6,kind:'hill'});
   const end=pts[pts.length-1];addPad({x:end[0],z:end[1],r:4.6,h:h[h.length-1],sh:5,kind:'turn'});
   // 계단 갈림: 조절점 (x0+44, ze-26.5) 에 가장 가까운 곳에서 북쪽으로
   let kb=0,bd=Infinity;pts.forEach((p,k)=>{const d=Math.hypot(p[0]-(x0+44),p[1]-(ze-26.5));if(d<bd){bd=d;kb=k}});
   const [tx,tz]=tangent(pts,kb);let nx=-tz,nz=tx;if(nz>0){nx=-nx;nz=-nz}
   const hb=h[kb],sx0=pts[kb][0]+nx*2.6,sz0=pts[kb][1]+nz*2.6;let rise=4.8,L=7.6;
   // 빈터 높이는 원래 언덕 높이에 가깝게(너무 깊이 파지 않게) — 계단 길이도 거기에 맞춘다
   for(let it=0;it<3;it++){const px=sx0+nx*(L+5.6),pz=sz0+nz*(L+5.6);rise=Math.max(3.6,Math.min(8.4,baseH(px,pz)-hb-1.2));L=rise/.6}
   const sx1=sx0+nx*L,sz1=sz0+nz*L,st={ax:sx0,az:sz0,bx:sx1,bz:sz1,hw:1.15,h0:hb,h1:hb+rise,n:Math.round(rise/.3),nx,nz};stairs.push(st);
   addPath({pts:[[sx0-nx*.8,sz0-nz*.8],[sx0,sz0],[sx1,sz1],[sx1+nx*.6,sz1+nz*.6]],h:[hb,hb,hb+rise,hb+rise],hw:1.15,sh:3.5,kind:'stairs'});
   const pc={x:sx1+nx*5.6,z:sz1+nz*5.6};addPad({x:pc.x,z:pc.z,r:5.8,h:hb+rise,sh:5.5,kind:'yard',paint:'yard'});
   hill={pts,h,kb,nx,nz,st,pc,ph:hb+rise,ex:e};
   spots.hill={x:pc.x-nx*2.6-nz*1.3,z:pc.z-nz*2.6+nx*1.3,ry:Math.atan2(-nx,-nz),label:'동쪽 언덕길 끝 돌계단 위 · 빨간 지붕 집 우체통 옆'};
   labels.push(['언덕 빨간 집',pc.x,pc.z-9])}}

 /* ═══ C. 북서쪽 숲속 개울 · 나무다리 ═══ */
 let forest=null;
 {const e=nearest('N',-22,-HW);if(e){const xe=e.x,z0=-HW;
   const pts=spline([[xe,z0+.5],[xe-1,z0-9],[xe-7,z0-19],[xe-17,z0-27],[xe-27,z0-31],[xe-31.5,z0-33]],1.2);
   const h=profile(pts,e.h,.16);const hA=h[h.length-1];addPath({pts,h,hw:1.6,sh:3.5,kind:'dirt',paint:'dirt'});
   const A={x:xe-31.5,z:z0-33},ux=-12/Math.hypot(12,8),uz=-8/Math.hypot(12,8),vx=-uz,vz=ux,Bp={x:A.x+ux*14.4,z:A.z+uz*14.4},bc={x:(A.x+Bp.x)/2,z:(A.z+Bp.z)/2};
   addPad({x:A.x,z:A.z,r:6,h:hA,sh:4.5,kind:'glade',paint:'dirt'});addPad({x:Bp.x,z:Bp.z,r:5.6,h:hA,sh:4.5,kind:'glade',paint:'dirt'});
   addPath({pts:[[A.x,A.z],[Bp.x,Bp.z]],h:[hA,hA],hw:1.6,sh:3,kind:'dirt',paint:'dirt'});
   // 개울: 다리 한가운데를 가로질러 흐른다(아래쪽 = 땅이 낮은 쪽). 끝은 가늘어져 숲으로 사라진다
   const cw=[];for(let t=-44;t<=44.01;t+=2.5){const wig=Math.sin(t*.11)*3.2*sm(Math.abs(t)/10)+Math.sin(t*.27)*.8*sm(Math.abs(t)/6);cw.push([bc.x+vx*t+ux*wig,bc.z+vz*t+uz*wig])}
   const wp=spline(cw,1.5),ws=arc(wp),mid=ws[ws.length-1]/2,nat=wp.map(p=>baseH(p[0],p[1]));
   let bed=wp.map((p,k)=>{const w=1-sm((Math.abs(ws[k]-mid)-6)/14);return (nat[k]-1.4)*(1-w)+(hA-1.2)*w});
   const down=baseH(bc.x-vx*30,bc.z-vz*30)<baseH(bc.x+vx*30,bc.z+vz*30)?-1:1; // 낮은 쪽으로 흐른다
   const order=down<0?[...bed.keys()].reverse():[...bed.keys()];for(let m=1;m<order.length;m++){const k=order[m],p=order[m-1];bed[k]=Math.min(bed[k],bed[p]-.02)}
   const wf=wp.map((_,k)=>sm((ws[k]-0)/9)*sm((ws[ws.length-1]-ws[k])/9));
   addWater({pts:wp,bed,hw:1.5,wf,down});
   bridges.push({x:bc.x,z:bc.z,ux,uz,vx,vz,hl:3.7,hwid:1.15,h:hA,rise:.85});
   forest={pts,h,A,B:Bp,bc,ux,uz,vx,vz,hA,ex:e,wp};
   spots.forest={x:Bp.x+ux*1.6+vx*2.1,z:Bp.z+uz*1.6+vz*2.1,ry:Math.atan2(-ux,-uz),label:'북서쪽 숲속 흙길 끝 · 개울 나무다리 건너편 빈터'};
   labels.push(['숲속 개울',bc.x,bc.z+12])}}

 /* ── 땅 높이 고치기: 띠 · 빈터는 고르고, 개울은 판다 ── */
 function mod(x,z,y){const b=bucket(x,z);if(!b)return y;let best=0,bh=y;
  for(const it of b){let w,h;if(it.t==='seg'){const q=seg(x,z,it.ax,it.az,it.bx,it.bz);w=1-sm((q.d-it.hw)/it.sh);h=it.h0+(it.h1-it.h0)*q.t}else if(it.t==='pad'){const d=Math.hypot(x-it.x,z-it.z);w=1-sm((d-it.r)/it.sh);h=it.h}else continue;if(w>best+1e-4){best=w;bh=h}}
  y+=(bh-y)*best;
  for(const it of b){if(it.t!=='w')continue;const q=seg(x,z,it.ax,it.az,it.bx,it.bz),w=1-sm((q.d-it.hw*.6)/2.6);if(w<=0)continue;const yy=y+(it.b0+(it.b1-it.b0)*q.t-y)*w;if(yy<y)y=yy}
  return y}
 function bridgeAt(x,z,pad=.25){for(const br of bridges){const rx=x-br.x,rz=z-br.z,al=rx*br.ux+rz*br.uz,lat=rx*br.vx+rz*br.vz;if(Math.abs(al)<=br.hl&&Math.abs(lat)<=br.hwid+pad)return {br,al,lat}}return null}
 // 발 디딜 높이: 다리 위 · 돌계단 한 칸 · 큰길 보도 턱
 function groundY(x,z,base){
  const bq=bridgeAt(x,z);if(bq){const br=bq.br;return br.h+br.rise*Math.sin(Math.PI*(bq.al+br.hl)/(2*br.hl))}
  for(const st of stairs){const q=seg(x,z,st.ax,st.az,st.bx,st.bz);if(q.d<=st.hw+.05&&q.t>0&&q.t<1){const k=Math.min(st.n-1,Math.floor(q.t*st.n));return st.h0+(st.h1-st.h0)*(k+1)/st.n}}
  if(street&&x>=street.xa&&x<=street.xb){const dz=z-street.z0;if((dz>=3.5&&dz<=6.7)||(dz<=-3.5&&dz>=-4.7))return base+.19}
  return base}
 function inWalk(x,z,r){if(Math.abs(x)<=HW&&Math.abs(z)<=HW)return true;const b=bucket(x,z);if(!b)return false;
  for(const it of b){if(!it.walk)continue;if(it.t==='seg'){if(seg(x,z,it.ax,it.az,it.bx,it.bz).d<=it.hw-r)return true}else if(it.t==='pad'&&Math.hypot(x-it.x,z-it.z)<=it.r-r)return true}return false}
 // 걸을 수 없는 곳이면 가장 가까운 띠 · 빈터 · 마을 네모 안으로 밀어 넣고, 물에 빠지면 둑으로(다리 위면 다리 폭 안으로)
 function walkFix(x,z,r){for(let pass=0;pass<2;pass++){
   if(!inWalk(x,z,r)){let bd=Infinity,nx=x,nz=z;{const qx=Math.max(-HW,Math.min(HW,x)),qz=Math.max(-HW,Math.min(HW,z)),d=Math.hypot(x-qx,z-qz);bd=d;nx=qx;nz=qz}
    const b=bucket(x,z);if(b)for(const it of b){if(!it.walk)continue;let px,pz,d,lim;if(it.t==='seg'){const q=seg(x,z,it.ax,it.az,it.bx,it.bz);d=q.d;px=q.qx;pz=q.qz;lim=it.hw-r}else if(it.t==='pad'){d=Math.hypot(x-it.x,z-it.z);px=it.x;pz=it.z;lim=it.r-r}else continue;
     const over=d-lim;if(over<bd){bd=over;const k=d>1e-6?lim/d:0;nx=px+(x-px)*k;nz=pz+(z-pz)*k}}
    x=nx;z=nz}
   {const bq=bridgeAt(x,z,.7);if(bq){const br=bq.br,lim=br.hwid-r;if(Math.abs(bq.lat)>lim){const lat=Math.sign(bq.lat)*lim;x=br.x+br.ux*bq.al+br.vx*lat;z=br.z+br.uz*bq.al+br.vz*lat}}}
   const b=bucket(x,z);if(!b)break;let moved=false;
   for(const it of b){if(it.t!=='w')continue;const q=seg(x,z,it.ax,it.az,it.bx,it.bz);if(q.d>=it.hw+r||it.hw<.2)continue;
    const bq=bridgeAt(x,z,.7);if(bq){const br=bq.br,lim=br.hwid-r;if(Math.abs(bq.lat)>lim){const lat=Math.sign(bq.lat)*lim;x=br.x+br.ux*bq.al+br.vx*lat;z=br.z+br.uz*bq.al+br.vz*lat}continue}
    let dx=x-q.qx,dz=z-q.qz,d=q.d;if(d<1e-6){dx=-(it.bz-it.az);dz=it.bx-it.ax;d=Math.hypot(dx,dz)||1}x=q.qx+dx/d*(it.hw+r);z=q.qz+dz/d*(it.hw+r);moved=true}
   if(!moved)break}
  return [x,z]}
 function camBlock(x,y,z){for(const b of boxes)if(x>b.x0&&x<b.x1&&z>b.z0&&z<b.z1&&y<b.top+.6)return true;return false}
 // 나무 · 소품을 놓아도 되는 빈 땅인가(길 · 빈터 · 물 · 건물에서 m 만큼 떨어진 곳)
 function free(x,z,m=1.5){if(Math.abs(x)<HW+m+2&&Math.abs(z)<HW+m+2)return false;for(const b of boxes)if(x>b.x0-m&&x<b.x1+m&&z>b.z0-m&&z<b.z1+m)return false;const b=bucket(x,z);if(!b)return true;
  for(const it of b){if(it.t==='seg'){if(seg(x,z,it.ax,it.az,it.bx,it.bz).d<it.hw+m)return false}else if(it.t==='pad'){if(Math.hypot(x-it.x,z-it.z)<it.r+m)return false}else if(it.t==='w'){if(seg(x,z,it.ax,it.az,it.bx,it.bz).d<it.hw+m)return false}}return true}
 // 포장 길 밑 풀밭은 조금 내려 아스팔트 위로 삐져나오지 않게
 function sink(x,z){const b=bucket(x,z);if(!b)return 0;let k=0;for(const it of b){if(it.t!=='seg'&&it.t!=='pad')continue;const kind=it.t==='seg'?it.p.kind:it.kind;if(kind!=='street'&&kind!=='hill'&&kind!=='turn'&&kind!=='conn')continue;const d=it.t==='seg'?seg(x,z,it.ax,it.az,it.bx,it.bz).d:Math.hypot(x-it.x,z-it.z),hw=it.t==='seg'?it.hw:it.r;k=Math.max(k,1-sm((d-hw-.2)/.9))}return k*.55}
 // 풀밭 칠하기: 흙길 · 빈터는 흙빛, 언덕 집 마당은 짧은 풀
 function paint(x,z){const b=bucket(x,z);if(!b)return null;let dirt=0,yard=0;
  for(const it of b){const pt=it.t==='seg'?it.p.paint:it.paint;if(!pt)continue;let d,hw;if(it.t==='seg'){d=seg(x,z,it.ax,it.az,it.bx,it.bz).d;hw=it.hw}else if(it.t==='pad'){d=Math.hypot(x-it.x,z-it.z);hw=it.r}else continue;
   const w=1-sm((d-(hw-.9))/1.6);if(pt==='dirt')dirt=Math.max(dirt,w);else yard=Math.max(yard,w)}
  return dirt||yard?{dirt,yard}:null}

 /* ═══ 짓기 ═══ */
 let water=null;
 function build(K){const T=K.T,{B,BR,M,BOX,CYL,CYL6,BLOB,CONE4,colliders,groundH}=K,V=(x,y,z)=>new T.Vector3(x,y,z);
  const TR=K.Builder(),TRO=K.Builder();   // 나무 · 바위 + 두꺼운 외곽선 껍데기
  const CONE=new T.ConeGeometry(.5,1,8),CYLT=new T.CylinderGeometry(.1,.5,1,10);
  // 띠 모양 바닥(아스팔트 · 보도 · 물) — 땅 높이를 따라 깐다
  function strip(pts,o0,o1,yf,mat,vrep,across=4){const n=pts.length,pos=[],uv=[],idx=[],s=arc(pts);
   for(let k=0;k<n;k++){const [tx,tz]=tangent(pts,k),nx=-tz,nz=tx;for(let m=0;m<=across;m++){const o=o0+(o1-o0)*m/across,x=pts[k][0]+nx*o,z=pts[k][1]+nz*o;pos.push(x,yf(x,z,k,m/across),z);uv.push(m/across,s[k]/vrep)}}
   for(let k=0;k<n-1;k++)for(let m=0;m<across;m++){const a=k*(across+1)+m,b=a+1,c=a+across+1,d=c+1;idx.push(a,b,c,b,d,c)}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
   const me=new T.Mesh(g,mat);me.receiveShadow=true;me.frustumCulled=false;K.scene.add(me);return me}
  function wall(pts,o,y0f,hgt,mat){const n=pts.length,pos=[],idx=[];for(let k=0;k<n;k++){const [tx,tz]=tangent(pts,k),x=pts[k][0]-tz*o,z=pts[k][1]+tx*o,y=y0f(x,z);pos.push(x,y-.05,z,x,y+hgt,z)}
   for(let k=0;k<n-1;k++){const a=k*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();const me=new T.Mesh(g,mat);me.frustumCulled=false;K.scene.add(me)}
  const flat=o=>K.toon(Object.assign({color:'#ffffff',polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2},o));
  const roadTex=(edge,dash)=>{const t=K.canvasTex(128,256,(c,w,h)=>{c.fillStyle='#7c8582';c.fillRect(0,0,w,h);const r=C.rng(3);for(let k=0;k<260;k++){c.fillStyle=r()<.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.06)';c.fillRect(r()*w,r()*h,2+r()*5,1+r()*3)}
    c.fillStyle='rgba(60,66,64,.35)';c.fillRect(w*.3,h*.55,w*.25,h*.12);c.fillStyle='#f4f2ea';c.fillRect(w*edge-2,0,3,h);c.fillRect(w*(1-edge)-1,0,3,h);if(dash)c.fillRect(w/2-1.5,0,3,h*.45)});t.wrapT=T.RepeatWrapping;return t};
  const walkTex=K.canvasTex(64,64,(c,w,h)=>{c.fillStyle='#d3cfc3';c.fillRect(0,0,w,h);c.fillStyle='rgba(90,85,75,.28)';c.fillRect(0,0,w,2);c.fillRect(0,0,2,h);c.fillStyle='rgba(255,255,255,.18)';c.fillRect(8,10,14,6)});walkTex.wrapS=walkTex.wrapT=T.RepeatWrapping;
  const concTex=K.canvasTex(64,64,(c,w,h)=>{c.fillStyle='#b9bbb3';c.fillRect(0,0,w,h);c.fillStyle='rgba(60,60,55,.15)';c.fillRect(0,0,w,1);c.fillStyle='rgba(250,250,240,.85)';c.fillRect(3,0,2,h);c.fillRect(w-5,0,2,h)});concTex.wrapT=T.RepeatWrapping;
  const darker=(c,k)=>{const o=new T.Color(c);o.offsetHSL(0,-.02,-k);return '#'+o.getHexString()};
  // 막대(두 점 사이 상자) — 난간 · 다리 널빤지
  function beam(a,b,w,h,col,bld=B,edge=true){const m=new T.Matrix4().lookAt(a,b,V(0,1,0));m.setPosition(a.clone().add(b).multiplyScalar(.5));m.scale(V(w,h,a.distanceTo(b)));bld.add(BOX,m,col,edge)}
  function pipe(a,b,r,col,bld=B){const m=new T.Matrix4().lookAt(a,b,V(0,1,0));m.multiply(new T.Matrix4().makeRotationX(Math.PI/2));m.setPosition(a.clone().add(b).multiplyScalar(.5));m.scale(V(r,a.distanceTo(b),r));bld.add(CYL6,m,col)}
  // 원판(두께 th, 앞면이 ry 방향)
  const disc=(x,y,z,ry,r,th,col,edge,bld=B)=>bld.add(CYL,M(x,y,z,ry+Math.PI/2,r,th,r,0,Math.PI/2),col,edge);
  const greens=['#5f8f5c','#6f9f62','#4f7f55','#7fae6c','#5a8a63'];
  function tree(x,z,s,kind,y=groundH(x,z)-.1){const tc=pick(['#6d5a4a','#6a6058','#5e5048']);
   if(kind===0){TR.add(CYL,M(x,y+1.6*s,z,0,.26*s,3.2*s,.26*s),tc);TRO.add(CYL,M(x,y+1.6*s,z,0,.36*s,3.2*s,.36*s),'#2f302c');const gc=pick(['#4f7f5f','#5d8f68','#466f55']);
    for(let k=0;k<3;k++){const m=M(x,y+(2.4+k*1.25)*s,z,R()*3,(2.5-k*.6)*s,2.3*s,(2.5-k*.6)*s);TR.add(CONE,m,gc);TRO.add(CONE,M(x,y+(2.4+k*1.25)*s-.04,z,0,(2.5-k*.6)*s+.16,2.3*s+.18,(2.5-k*.6)*s+.16),'#2f302c')}}
   else{const th=(3.4+R()*2.4)*s;TR.add(CYL,M(x,y+th/2,z,0,.28*s,th,.28*s),tc);TRO.add(CYL,M(x,y+th/2,z,0,.38*s,th,.38*s),'#2f302c');
    if(R()<.6){const a=R()*6.3;pipe(V(x,y+th*.55,z),V(x+Math.cos(a)*.9*s,y+th*.8,z+Math.sin(a)*.9*s),.12*s,tc,TR)}
    const n=3+ri(3),gc=pick(greens);for(let k=0;k<n;k++){const bx=x+(R()-.5)*1.8*s,by=y+th+(R()-.2)*1.3*s,bz=z+(R()-.5)*1.8*s,sx=(1.05+R()*.6)*s,sy=(.85+R()*.4)*s,sz=(1.05+R()*.6)*s;
     TR.add(BLOB,M(bx,by,bz,R()*3,sx,sy,sz),k%2?gc:darker(gc,-.05));TRO.add(BLOB,M(bx,by,bz,0,sx+.13,sy+.13,sz+.13),'#2f302c')}}
   colliders.push({x,z,r:.32*s})}
  function rock(x,z,s,col='#d6c9a4'){const y=groundH(x,z);const m=M(x,y+.25*s,z,R()*3,1.2*s,.75*s,s);TR.add(BLOB,m,col);TRO.add(BLOB,M(x,y+.25*s,z,0,1.2*s+.06,.75*s+.06,s+.06),'#2f302c')}
  function tuft(x,z){const y=groundH(x,z);for(let k=0;k<3;k++)BR.add(CONE4,M(x+(R()-.5)*.4,y+.18,z+(R()-.5)*.4,R()*3,.12,.4+R()*.25,.12,(R()-.5)*.5),pick(['#6f9f62','#83b26f','#5a8a5a']))}
  function scatter(cx0,cz0,rad,n,fn,m=1.6){let placed=0;for(let k=0;k<n*6&&placed<n;k++){const a=R()*6.283,d=Math.sqrt(R())*rad,x=cx0+Math.cos(a)*d,z=cz0+Math.sin(a)*d;if(!free(x,z,m))continue;fn(x,z);placed++}}
  // 전봇대(가로대 방향 ry) · 전깃줄
  function pole(x,z,ry=0,tr=false){const g=groundH(x,z),h=8.4,c=Math.cos(ry),s=-Math.sin(ry);B.add(CYL,M(x,g+h/2,z,0,.3,h,.3),'#7f8a82',true);B.add(BOX,M(x,g+.6,z,0,.34,1.2,.34),'#e3c13c');for(let k=0;k<3;k++)B.add(BOX,M(x,g+.25+k*.35,z,0,.36,.12,.36),'#2f302c');
   B.add(BOX,M(x,g+h-.5,z,ry,1.6,.12,.14),'#6a726c',true);B.add(BOX,M(x,g+h-1.1,z,ry,1.2,.1,.12),'#6a726c',true);for(const o of [-.7,0,.7])B.add(CYL6,M(x+c*o,g+h-.38,z+s*o,0,.08,.16,.08),'#e6e2d6');
   if(tr){B.add(CYL,M(x-s*.38,g+h-2.2,z+c*.38,0,.62,1,.62),'#8e958c',true)}colliders.push({x,z,r:.22});return {x,z,g,h,c,s}}
  function wires(list){for(let m=0;m<list.length-1;m++){const p=list[m],q=list[m+1];for(const [dy,o] of [[-.4,-.7],[-.4,.7],[-.4,0],[-1.05,.5]]){K.WIRE.line(K.sag(V(p.x+p.c*o,p.g+p.h+dy,p.z+p.s*o),V(q.x+q.c*o,q.g+q.h+dy,q.z+q.s*o),.55+R()*.35))}}}
  const signPost=(x,z,ry,text,sub)=>{const y=groundH(x,z);B.add(BOX,M(x,y+.9,z,0,.12,1.8,.12),'#7d6249',true);const s=K.signMesh(text,sub,'#fffaf0','#5a4636',1.5,.62);s.material.side=T.DoubleSide;s.position.set(x,y+1.65,z);s.rotation.y=ry;K.scene.add(s)};

  /* ── A. 큰길 상가 ── */
  if(street){const {z0,xa,xb,hAt}=street,L=street.pts,gy=(x,z)=>groundH(x,z);
   strip(L,-3.5,3.5,(x,z)=>gy(x,z)+.04,flat({map:roadTex(.05,true)}),9,6);
   strip(L,3.5,6.7,(x,z)=>gy(x,z)+.19,flat({map:walkTex,polygonOffsetFactor:-3}),1.1,2).material.map.repeat.set(3,1);
   strip(L,-4.7,-3.5,(x,z)=>gy(x,z)+.19,flat({map:walkTex,polygonOffsetFactor:-3}),1.1,1);
   const curbM=K.toon({color:'#bdb8aa',side:T.DoubleSide});wall(L,3.5,gy,.19,curbM);wall(L,-3.5,gy,.19,curbM);
   for(const e of street.ex)strip([[e.x,HW-.2],[e.x,(HW+z0-4.7)/2],[e.x,z0-4.7]],-1.5,1.5,(x,z)=>gy(x,z)+.05,flat({map:concTex}),3,2);
   // 북쪽 보도 뒤 낮은 블록 담(골목 입구는 터 둔다)
   for(let x=xa;x<xb-.5;x+=2){const xm=x+1;if(street.ex.some(e=>Math.abs(e.x-xm)<2.6))continue;const g=gy(xm,z0-4.85);B.add(BOX,M(xm,g+.45,z0-4.95,0,2.02,1.3,.28),'#c9c4b6',true)}
   // 횡단보도 · 맨홀
   const cw=street.ex.reduce((a,e)=>Math.abs(e.x)<Math.abs(a.x)?e:a,street.ex[0]);for(let k=0;k<7;k++){const z=z0-3+.45+k*.9;B.add(BOX,M(cw.x,gy(cw.x,z)+.06,z,0,3,.03,.45),'#f2f0e8')}
   for(const mx of [cw.x-6,cw.x+15]){const y=Math.max(gy(mx-.55,z0+1.4),gy(mx+.55,z0+1.4))+.05;B.add(CYL,M(mx,y,z0+1.4,0,1.1,.04,1.1),'#3d4442');B.add(CYL,M(mx,y+.02,z0+1.4,0,.62,.02,.62),'#56605d')}
   // 가게들
   const SHOPS=[['골목 마트','MART','#f2c94c','#2f302c','#3f7fb0'],['큰길 철물점','HARDWARE','#e8e4d6','#2f4f7f','#5f8380'],['분식 한입','SNACK','#e05a47','#fffaf0','#e05a47'],['꽃삽 화원','FLOWERS','#7fb37a','#fffaf0','#4f9a5a'],['동네 세탁소','LAUNDRY','#9cc7e0','#2f302c','#3f7fb0'],
    ['빵 굽는 집','BAKERY','#f3d9a8','#6b4630','#c4875c'],['문구 완구','STATIONERY','#f7b6c5','#2f302c','#d0603f'],['사진 인화','PHOTO','#fffaf0','#3f6e9e','#3f6e9e'],['국수 한그릇','NOODLE','#ecd89a','#5a3b2a','#b84b45'],['자전거포','BIKE','#bcd3bf','#2f302c','#5f8380']];
   const awTex={};const awMat=c=>{if(!awTex[c]){const t=K.canvasTex(64,16,(x,w,h)=>{x.fillStyle=c;x.fillRect(0,0,w/2,h);x.fillStyle='#f6f3ea';x.fillRect(w/2,0,w/2,h)});t.wrapS=T.RepeatWrapping;awTex[c]=K.toon({color:'#ffffff',map:t,side:T.DoubleSide})}return awTex[c]};
   const quad=(p,mat,urep)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p.flat(),3));g.setAttribute('uv',new T.Float32BufferAttribute([0,1,urep,1,0,0,urep,0],2));g.setIndex([0,2,1,1,2,3]);g.computeVertexNormals();const me=new T.Mesh(g,mat);me.castShadow=true;me.receiveShadow=true;me.frustumCulled=false;K.scene.add(me)};
   const WALLC=['#d8d4ca','#c9c6bd','#e6dfcf','#cfd3cc','#ddd0bd','#c4c9c4'];
   let x=xa+1.2,si=0;street.shops=[];
   while(x<xb-5){const w=Math.min(xb-x-.4,7+R()*2.6),xc=x+w/2,sh=SHOPS[si%SHOPS.length],floors=R()<.7?2:3,g0=hAt(xc)+.15,zf=z0+6.75,D=7.5,H=floors===2?6.4:9.1,top=g0+H,bot=g0-2.6,wc=pick(WALLC);
    B.add(BOX,M(xc,(bot+top)/2,zf+D/2,0,w,top-bot,D),wc,true);B.add(BOX,M(xc,top+.22,zf+D/2,0,w+.12,.44,D+.12),darker(wc,.08),true);
    B.add(BOX,M(xc,g0+.25,zf-.02,0,w,.5,.06),darker(wc,.15));
    // 1층 통유리 · 문 · 기둥
    B.add(BOX,M(xc,g0+1.55,zf-.04,0,w-1,2.3,.06),'#34444a');for(let k=0;k<=Math.floor((w-1)/1.4);k++){const px=xc-(w-1)/2+k*((w-1)/Math.floor((w-1)/1.4));B.add(BOX,M(px,g0+1.55,zf-.08,0,.08,2.3,.06),'#d9d6cc')}
    B.add(BOX,M(xc,g0+2.75,zf-.08,0,w-1,.1,.08),'#d9d6cc');for(const s of [-1,1])B.add(BOX,M(xc+s*(w/2-.25),g0+1.4,zf-.1,0,.5,2.8,.2),darker(wc,.05),true);
    // 줄무늬 차양 · 간판
    const yA=g0+3.05,yB=g0+2.5,zo=zf-1.55;quad([[xc-w/2+.4,yA,zf-.05],[xc+w/2-.4,yA,zf-.05],[xc-w/2+.4,yB,zo],[xc+w/2-.4,yB,zo]],awMat(sh[4]),(w-.8)/.9);quad([[xc-w/2+.4,yB,zo],[xc+w/2-.4,yB,zo],[xc-w/2+.4,yB-.32,zo],[xc+w/2-.4,yB-.32,zo]],awMat(sh[4]),(w-.8)/.9);
    const sg=K.signMesh(sh[0],sh[1],sh[2],sh[3],Math.min(5,w-1.2),1.05);sg.position.set(xc,g0+3.75,zf-.07);sg.rotation.y=Math.PI;K.scene.add(sg);B.add(BOX,M(xc,g0+3.75,zf-.03,0,Math.min(5,w-1.2)+.16,1.2,.06),'#2f302c');
    // 위층 창 · 실외기 · 물탱크
    for(let f=2;f<=floors;f++){const y=g0+3.4+(f-2)*2.7+1.5,nw=Math.max(1,Math.floor((w-1)/2.2));for(let k=0;k<nw;k++){const px=xc-(w-1)/2+(k+.5)*(w-1)/nw,m=M(px,y,zf-.02,Math.PI);K.frames.push({m,c:'#f3f0e8'});(R()<.5?K.glassLit:K.glassDark).push(m)}}
    if(R()<.7){const ax=xc+(R()<.5?-1:1)*(w/2-.9);B.add(BOX,M(ax,g0+4.35,zf-.25,0,.85,.6,.42),'#e6e4dc',true);disc(ax+.12,g0+4.35,zf-.47,Math.PI,.42,.03,'#b7b4aa')}
    if(R()<.5){B.add(CYL,M(xc+w*.2,top+.95,zf+D*.6,0,1.1,1.5,1.1),'#d6d3c8',true)}
    boxes.push({x0:xc-w/2,x1:xc+w/2,z0:zf,z1:zf+D,top:top+1.6});street.shops.push({x:xc,w,name:sh[0],col:wc,zf,D});
    if(sh[0]==='꽃삽 화원'){street.flower={x:xc,zf};const pots=[[-1.6,.5],[-1,.9],[1.2,.6],[1.7,1.1],[-2.1,1],[.6,1.2]];for(const [ox,oz] of pots){const px=xc+ox,pz=zf-oz,y=gy(px,pz)+.15,s=.7+R()*.5;BR.add(CYL,M(px,y+.2*s,pz,0,.44*s,.4*s,.44*s),pick(['#b86f4c','#a96646','#d6c8aa']));BR.add(BLOB,M(px,y+.55*s,pz,0,.32*s,.3*s,.32*s),pick(['#6f9f62','#e98a9c','#f0cf68','#83b26f']));colliders.push({x:px,z:pz,r:.3*s})}
     spots.shop={x:xc+.2,z:zf-1.9,ry:Math.PI,label:"남쪽 큰길 상가 · 초록 줄무늬 차양 '꽃삽 화원' 앞"}}
    x+=w+.35;si++}
   if(!spots.shop){const s=street.shops[Math.floor(street.shops.length/2)];spots.shop={x:s.x,z:s.zf-1.9,ry:Math.PI,label:`남쪽 큰길 상가 · '${s.name}' 앞`}}
   // 흰 경트럭 · 꼬깔 · 쓰레기통 · 자판기 · 버스 정류장 · 세모 표지판
   const van=(x,z,ry)=>{const y=gy(x,z),c='#eceae2',s=Math.sin(ry),co=Math.cos(ry),P=(f,u,h)=>[x+s*f+co*u,y+h,z+co*f-s*u];
    B.add(BOX,M(...P(.95,0,1.02),ry,1.45,1.5,1.3),c,true);B.add(BOX,M(...P(-.75,0,1.08),ry,1.45,1.62,2.1),c,true);B.add(BOX,M(...P(1.62,0,1.32),ry,1.22,.6,.05),'#9fc7cf');for(const u of [-.73,.73])B.add(BOX,M(...P(1.05,u,1.35),ry,.04,.5,.8),'#9fc7cf');
    B.add(BOX,M(...P(1.62,0,.45),ry,1.5,.28,.08),'#3c4448');for(const u of [-.5,.5]){disc(...P(1.64,u,.82),ry,.26,.06,'#f7f4ea');disc(...P(1.66,u,.82),ry,.14,.06,'#3c4448')}
    for(const f of [1,-1.2])for(const u of [-.7,.7])B.add(CYL,M(...P(f,u,.3),ry,.56,.24,.56,0,Math.PI/2),'#2f302c');const bx=[x-Math.abs(co)*.8-Math.abs(s)*1.9,z-Math.abs(s)*.8-Math.abs(co)*1.9,x+Math.abs(co)*.8+Math.abs(s)*1.9,z+Math.abs(s)*.8+Math.abs(co)*1.9];colliders.push({box:bx});boxes.push({x0:bx[0],z0:bx[1],x1:bx[2],z1:bx[3],top:y+1.9})};
   const cone=(x,z)=>{const y=groundY(x,z,gy(x,z));BR.add(BOX,M(x,y+.03,z,0,.5,.06,.5),'#3c3c38');BR.add(CYLT,M(x,y+.4,z,0,.3,.75,.3),'#e8743a');BR.add(CYLT,M(x,y+.45,z,0,.24,.14,.24),'#f6f3ea');colliders.push({x,z,r:.25})};
   const vx=cw.x+9.5;van(vx,z0+2.3,Math.PI/2);cone(vx-2.6,z0+3);cone(vx+2.8,z0+2.9);
   const sp=street.shops;if(sp[1]){const tx=sp[1].x-sp[1].w/2+.6,tz=z0+6.1,y=gy(tx,tz)+.15;B.add(BOX,M(tx,y+.48,tz,0,.6,.96,.55),'#d4dccb',true);B.add(BOX,M(tx,y+1.0,tz,0,.66,.1,.6),'#bcc4b3');colliders.push({x:tx,z:tz,r:.4});cone(tx+1,tz)}
   if(sp[4]){const tx=sp[4].x+sp[4].w/2-.7,tz=z0+6.2,y=gy(tx,tz)+.15;B.add(BOX,M(tx,y+.95,tz,Math.PI,.95,1.9,.7),'#d8463d',true);B.add(BOX,M(tx,y+1.25,tz-.36,Math.PI,.75,.7,.02),'#cfe6ef');colliders.push({x:tx,z:tz,r:.55})}
   {const bx=cw.x-4,bz=z0-4.1,y=gy(bx,bz)+.15;B.add(CYL6,M(bx,y+1.3,bz,0,.07,2.6,.07),'#8a8f88');B.add(CYL,M(bx,y+2.55,bz,0,.62,.62,.06,Math.PI/2),'#3f7fb0',true);B.add(CYL,M(bx,y+2.55,bz-.04,0,.44,.44,.07,Math.PI/2),'#f4f2ea');B.add(BOX,M(bx,y+1.5,bz-.06,0,.3,.5,.06),'#f4f2ea');colliders.push({x:bx,z:bz,r:.15})}
   {const bx=cw.x+2.1,bz=z0+4.2,y=gy(bx,bz)+.15;B.add(CYL6,M(bx,y+1.25,bz,0,.07,2.5,.07),'#8a8f88');B.add(new T.CylinderGeometry(.62,.62,.07,3),M(bx,y+2.65,bz,0,1,1,1,Math.PI/2),'#3d4442');colliders.push({x:bx,z:bz,r:.15})}
   // 북쪽 보도 전봇대
   const pl=[];for(let x=xa+4;x<xb-2;x+=12.5){if(street.ex.some(e=>Math.abs(e.x-x)<2.2))x+=3;pl.push(pole(x,z0-4.25,Math.PI/2,R()<.3))}wires(pl);
   // 길 끝 바리케이드
   for(const ex of [xa-.3,xb+.3]){const y=gy(ex,z0);colliders.push({box:[ex-.15,z0-5,ex+.15,z0+7]});for(const dz of [-3,3])B.add(BOX,M(ex,y+.45,z0+1+dz,0,.12,.9,.12),'#f2f0ea');B.add(BOX,M(ex,y+.8,z0+1,0,.1,.28,6.6),'#e8743a',true);B.add(BOX,M(ex,y+.5,z0+1,0,.1,.2,6.6),'#f6f3ea')}
   for(const e of street.ex)if(e===street.ex[0]||e===street.ex[street.ex.length-1])signPost(e.x+1.9,HW+1.6,Math.PI,'큰길 상가','SHOPPING STREET')}

  /* ── B. 언덕길 · 돌계단 · 빨간 집 ── */
  if(hill){const {pts,kb,nx,nz,st,pc,ph}=hill,gy=(x,z)=>groundH(x,z);
   strip(pts,-3.2,3.2,(x,z)=>gy(x,z)+.04,flat({map:roadTex(.11,true)}),9,6);
   {const p=pts[pts.length-1];const g=new T.CircleGeometry(4.6,28).rotateX(-Math.PI/2);const pa=g.attributes.position;for(let k=0;k<pa.count;k++)pa.setY(k,gy(pa.getX(k)+p[0],pa.getZ(k)+p[1])+.035);g.computeVertexNormals();const me=new T.Mesh(g,flat({color:'#7c8582'}));me.position.set(p[0],0,p[1]);me.receiveShadow=true;me.frustumCulled=false;K.scene.add(me)}
   // 가드레일 — 양쪽(마을 쪽 시작 · 계단 갈림 · 끝 빈터는 터 둔다)
   const s=arc(pts),sb=s[kb];
   for(const side of [-1,1]){let prev=null;for(let k=0;k<pts.length;k+=2){const [tx,tz]=tangent(pts,k),ox=-tz*side*3.42,oz=tx*side*3.42,x=pts[k][0]+ox,z=pts[k][1]+oz;
     const north=(-tz*side)*nx+(tx*side)*nz>0,skip=s[k]<7||s[k]>s[s.length-1]-2.5||(north&&Math.abs(s[k]-sb)<2.4);if(skip){prev=null;continue}
     const y=gy(x,z),top=V(x,y+.62,z);B.add(BOX,M(x,y+.38,z,Math.atan2(tx,tz),.1,.78,.1),'#f2f0ea',true);if(k%6===0)B.add(BOX,M(x,y+.62,z,Math.atan2(tx,tz),.12,.18,.12),'#d8463d');
     if(prev){beam(prev,top,.06,.3,'#f4f2ec')}prev=top}}
   // 돌계단 + 손잡이
   {const n=st.n,L=Math.hypot(st.bx-st.ax,st.bz-st.az),ry=Math.atan2(nx,nz);for(let m=0;m<n;m++){const t=(m+.5)/n,x=st.ax+nx*L*t,z=st.az+nz*L*t,top=st.h0+(st.h1-st.h0)*(m+1)/n,bot=st.h0-.8+(st.h1-st.h0)*m/n-.6;B.add(BOX,M(x,(top+bot)/2,z,ry,2.3,top-bot,L/n+.01),m%2?'#d9d4c6':'#cfc9ba',true)}
    for(const sd of [-1,1]){const ox=-nz*sd*1.2,oz=nx*sd*1.2,a=V(st.ax+ox,st.h0+.95,st.az+oz),b=V(st.bx+ox,st.h1+.95,st.bz+oz);pipe(a,b,.06,'#8a8f88');for(const p of [a,b])B.add(CYL6,M(p.x,p.y-.47,p.z,0,.07,.95,.07),'#8a8f88')}}
   // 빨간 집
   {const ry=Math.atan2(-nx,-nz),hx=pc.x+nx*1.6,hz=pc.z+nz*1.6,W=6.6,D=5.4,Hh=3.5,bot=ph-1.4,top=ph+Hh,lx=Math.cos(ry),lz=-Math.sin(ry);
    B.add(BOX,M(hx,(bot+top)/2,hz,ry,W,top-bot,D),'#b9483f',true);B.add(BOX,M(hx,ph+.2,hz,ry,W+.1,.4,D+.1),'#8f3a33');
    for(const sd of [-1,1])B.add(BOX,M(hx+lx*sd*W/2,(ph+top)/2,hz+lz*sd*W/2,ry,.2,Hh,D+.06),'#f4f0e6');
    B.add(K.prism(W+.9,2.2,D+.7),M(hx,top,hz,ry),'#6f6c6a',true);B.add(BOX,M(hx,top+.02,hz,ry,W+.75,.14,D+.95),'#f4f0e6');
    const fx=hx-nx*(D/2+.03),fz=hz-nz*(D/2+.03);
    for(const o of [-1.9,1.9]){const m=M(fx+lx*o,ph+1.75,fz+lz*o,ry);const big=M(fx+lx*o,ph+1.75,fz+lz*o,ry,1.5,1.15,1);K.frames.push({m:big,c:'#f4f0e6'});K.glassDark.push(big)}
    K.doorsI.push({m:M(fx,ph+1.1,fz,ry),c:'#f4f0e6'});K.lampsI.push(M(fx+lx*.8,ph+2.35,fz+lz*.8,ry));B.add(BOX,M(hx-nx*(D/2+.35),ph+.07,hz-nz*(D/2+.35),ry,1.4,.14,.7),'#cfc8b8');
    // 박공 둥근 창 · 안테나
    {const gx=hx-nx*(D/2+.37),gz=hz-nz*(D/2+.37);disc(gx,top+.85,gz,ry,.75,.08,'#f4f0e6');disc(gx-nx*.03,top+.85,gz-nz*.03,ry,.55,.08,'#36454c')}
    B.add(CYL6,M(hx+lx*1.6,top+2.6,hz+lz*1.6,0,.05,1.8,.05),'#5a605b');for(const k of [0,1])B.add(BOX,M(hx+lx*1.6,top+3+k*.35,hz+lz*1.6,ry,.9-k*.3,.04,.04),'#5a605b');
    boxes.push({x0:hx-4.4,x1:hx+4.4,z0:hz-4.4,z1:hz+4.4,top:top+2.2});colliders.push({box:[Math.min(hx-lx*W/2-nx*D/2,hx+lx*W/2+nx*D/2,hx-lx*W/2+nx*D/2,hx+lx*W/2-nx*D/2),Math.min(hz-lz*W/2-nz*D/2,hz+lz*W/2+nz*D/2,hz-lz*W/2+nz*D/2,hz+lz*W/2-nz*D/2),Math.max(hx-lx*W/2-nx*D/2,hx+lx*W/2+nx*D/2,hx-lx*W/2+nx*D/2,hx+lx*W/2-nx*D/2),Math.max(hz-lz*W/2-nz*D/2,hz+lz*W/2+nz*D/2,hz-lz*W/2+nz*D/2,hz+lz*W/2-nz*D/2)]});
    // 빨간 우체통(기둥 위 작은 집 모양)
    const mx=pc.x-nx*3.4+lx*2.6,mz=pc.z-nz*3.4+lz*2.6;B.add(BOX,M(mx,ph+.55,mz,0,.1,1.1,.1),'#7d6249',true);B.add(BOX,M(mx,ph+1.28,mz,ry,.62,.5,.42),'#c8423a',true);B.add(K.prism(.5,.22,.72),M(mx,ph+1.53,mz,ry),'#f4f0e6');B.add(BOX,M(mx-nx*.22,ph+1.32,mz-nz*.22,ry,.3,.05,.02),'#2f302c');colliders.push({x:mx,z:mz,r:.3});
    hill.mail={x:mx,z:mz};
    // 마당 꽃 · 장작
    for(let k=0;k<6;k++){const a=R()*6.28,d=3+R()*2.2,px=pc.x+Math.cos(a)*d,pz=pc.z+Math.sin(a)*d;if(Math.hypot(px-hx,pz-hz)<4.4)continue;BR.add(BLOB,M(px,ph+.3,pz,0,.4,.32,.4),pick(['#e8a0b4','#f0cf68','#fbf6ea','#7fb06f']))}}
   // 표지판 · 전봇대 · 나무
   {const p=pts[Math.max(0,kb-4)],[tx,tz]=tangent(pts,kb-4),x=p[0]+nx*3.9,z=p[1]+nz*3.9,y=gy(x,z);B.add(CYL6,M(x,y+1.3,z,0,.07,2.6,.07),'#8a8f88');disc(x,y+2.5,z,Math.atan2(tx,tz),.8,.06,'#3d4442',true);B.add(BOX,M(x,y+1.75,z,Math.atan2(tx,tz)+Math.PI/2,.6,.3,.05),'#3d4442');colliders.push({x,z,r:.15})}
   {const list=[];for(let k=8;k<pts.length;k+=12){const [tx,tz]=tangent(pts,k),sd=(-tz*nx+tx*nz)>0?-1:1;list.push(pole(pts[k][0]-tz*sd*3.9,pts[k][1]+tx*sd*3.9,Math.atan2(tx,tz),R()<.3))}wires(list)}
   signPost(hill.ex.x+2,hill.ex.z+3.4,-Math.PI/2,'언덕 빨간 집','HILL HOUSE');
   scatter((pts[0][0]+pc.x)/2,(pts[0][1]+pc.z)/2,40,34,(x,z)=>tree(x,z,.9+R()*.5,R()<.45?0:1),2.2);scatter(pc.x,pc.z,12,6,(x,z)=>tree(x,z,1+R()*.4,1),1.8);
   scatter((pts[0][0]+pc.x)/2,(pts[0][1]+pc.z)/2,34,14,(x,z)=>rock(x,z,.5+R()*.7),.8)}

  /* ── C. 숲속 개울 · 나무다리 ── */
  if(forest){const {A,B:Bp,bc,ux,uz,vx,vz,hA}=forest,w=waters[0];
   // 물 — 결 무늬가 흐른다
   const wt=K.canvasTex(64,128,(c,W,H)=>{c.fillStyle='#4f8ea6';c.fillRect(0,0,W,H);const r=C.rng(12);for(let k=0;k<26;k++){c.fillStyle=r()<.6?'rgba(190,230,240,.55)':'rgba(40,90,110,.35)';c.fillRect(r()*W,r()*H,6+r()*18,1.5)}});wt.wrapS=wt.wrapT=T.RepeatWrapping;
   const wm=strip(w.pts,-w.hw,w.hw,(x,z,k,u)=>w.bed[k]+.62-Math.abs(u-.5)*.1,K.toon({color:'#ffffff',map:wt,emissive:'#1d4c5c',emissiveIntensity:.25}),6,3);
   {const pa=wm.geometry.attributes.position;for(let k=0;k<w.pts.length;k++){const [tx,tz]=tangent(w.pts,k);for(let m=0;m<=3;m++){const i=k*4+m,o=(-w.hw+2*w.hw*m/3)*(1-w.wf[k]);pa.setX(i,pa.getX(i)+tz*o);pa.setZ(i,pa.getZ(i)-tx*o)}}pa.needsUpdate=true}
   water={tex:wt,dir:w.down};
   // 나무 아치 다리
   {const br=bridges[0],n=11,deck=al=>br.h+br.rise*Math.sin(Math.PI*(al+br.hl)/(2*br.hl)),P=(al,lat,y)=>V(br.x+br.ux*al+br.vx*lat,y,br.z+br.uz*al+br.vz*lat);
    for(let m=0;m<n;m++){const a0=-br.hl+m*2*br.hl/n,a1=a0+2*br.hl/n*.9;beam(P(a0,0,deck(a0)-.05),P(a1,0,deck(a1)-.05),2.35,.1,m%2?'#a89b85':'#9d907a')}
    for(const sd of [-1,1]){let pv=null,pm=null;for(let m=0;m<=8;m++){const al=-br.hl+m*br.hl/4,y=deck(al);
      const top=P(al,sd*1.12,y+.95),bot=P(al,sd*1.12,y-.05);B.add(BOX,M(bot.x,(top.y+bot.y)/2,bot.z,Math.atan2(br.ux,br.uz),.12,top.y-bot.y,.12),'#8a7660',true);
      if(pv){beam(pv,top,.1,.1,'#9a8670');beam(pm,P(al,sd*1.12,y+.5),.07,.07,'#9a8670')}pv=top;pm=P(al,sd*1.12,y+.5)}
     let pb=null;for(let m=0;m<=10;m++){const al=-br.hl-.3+m*(2*br.hl+.6)/10,y=deck(Math.max(-br.hl,Math.min(br.hl,al)))-.22,p=P(al,sd*.95,y);if(pb)beam(pb,p,.16,.24,'#6f5d4a',B,false);pb=p}}}
   // 숲 — 키 큰 나무 · 바위 · 풀 · 통나무 의자
   scatter(bc.x,bc.z,46,95,(x,z)=>tree(x,z,1+R()*.55,R()<.25?0:1),1.8);
   scatter((forest.pts[0][0]+A.x)/2,(forest.pts[0][1]+A.z)/2,20,30,(x,z)=>tree(x,z,.9+R()*.5,R()<.3?0:1),1.6);
   for(let k=0;k<w.pts.length;k+=3){const [tx,tz]=tangent(w.pts,k),sd=R()<.5?-1:1,d=w.hw+.6+R()*1.4,x=w.pts[k][0]-tz*sd*d,z=w.pts[k][1]+tx*sd*d;if(w.wf[k]>.3&&free(x,z,.3)||R()<.3)rock(x,z,.35+R()*.6)}
   scatter(bc.x,bc.z,30,26,(x,z)=>rock(x,z,.5+R()*.9),.6);
   for(let k=0;k<70;k++){const a=R()*6.28,d=Math.sqrt(R())*24,x=bc.x+Math.cos(a)*d,z=bc.z+Math.sin(a)*d;if(free(x,z,.2)||R()<.25)tuft(x,z)}
   {const lx=Bp.x-ux*1.8-vx*2.6,lz=Bp.z-uz*1.8-vz*2.6,y=groundH(lx,lz);B.add(CYL,M(lx,y+.32,lz,Math.atan2(ux,uz),.62,1.9,.62,0,Math.PI/2),'#8a7258',true);colliders.push({x:lx,z:lz,r:.6})}
   signPost(forest.ex.x+2.2,forest.ex.z-1.8,0,'숲속 개울','FOREST CREEK')}

  // 나무 · 바위 메시
  {const tm=TR.mesh(K.toon({color:'#ffffff',vertexColors:true}));tm&&K.scene.add(tm);const om=TRO.mesh(K.curve(new T.MeshBasicMaterial({color:'#2f302c',side:T.BackSide})),false);if(om){om.receiveShadow=false;K.scene.add(om)}}}
 function update(t,dt){if(water){water.tex.offset.y-=dt*.35*water.dir}}

 /* 지도에 그릴 것 */
 function mapData(){const roads=[];for(const p of paths){const col=p.kind==='street'?'#dcd7ca':p.kind==='hill'||p.kind==='turn'?'#c9cbc4':p.kind==='stairs'?'#e8dfc9':p.kind==='conn'?'#fffaf0':'#d2b98f';roads.push({pts:p.pts,w:p.hw*2,col})}
  const pd=pads.map(o=>({x:o.x,z:o.z,r:o.r,col:o.kind==='turn'?'#c9cbc4':o.kind==='yard'?'#b5d69c':'#d2b98f'}));
  const xs=[-HW,HW],zs=[-HW,HW];for(const p of paths)for(const q of p.pts){xs.push(q[0]);zs.push(q[1])}for(const b of boxes){xs.push(b.x0,b.x1);zs.push(b.z0,b.z1)}
  return {roads,pads:pd,water:waters.map(w=>({pts:w.pts,w:w.hw*2,wf:w.wf})),boxes:boxes.map(b=>({x0:b.x0,z0:b.z0,x1:b.x1,z1:b.z1})),labels,bounds:[Math.min(...xs)-8,Math.min(...zs)-8,Math.max(...xs)+8,Math.max(...zs)+8]}}
 return {exits,sink,mod,groundY,walkFix,inWalk,camBlock,free,paint,build,update,spots,mapData,street:()=>street,hill:()=>hill,forest:()=>forest,bridges,stairs}}
root.PM_OUTER={plan};
})(typeof window!=='undefined'?window:globalThis);
