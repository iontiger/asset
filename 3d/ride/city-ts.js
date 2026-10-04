/* 타임스스퀘어: BROADWAY 와 W 42 ST 가 만나는 모서리(C.V[1]) 둘레 빌딩 앞면을 움직이는 대형 전광판으로 덮는다.
   - 전광판 그림은 캔버스로 직접 그리고(브랜드 없음: DENTPHOTO · 마을 증시 시세 · 뮤지컬 '바람을 따라' · I ♥ NY · 속보), 가까이 올 때만 1초에 8번 다시 그린다.
   - 빌딩 허리를 두르는 시세 띠는 텍스처를 흘려 움직인다. 밤에는 1 넘게 밝혀 블룸으로 번지고, 물웅덩이에도 비친다.
   city-scene.js 가 빌딩 목록(blds)과 좌표 함수를 넘겨 준다. */
(function(root){
const FONT='"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",Arial,sans-serif';
const STOCKS=[['DENTPHOTO',3.2],['바람을따라',5.1],['우체국',1.4],['편지물류',-2.3],['목표봉건설',.8],['개울수산',-1.1],['요트레저',2.7],['포롱굿즈',6.4],['꾸르륵식품',-3.5],['치과사진',1.9]];
// 그림들: (x,w,h,t) — t 초
const DRAW={
 logo(x,w,h,t){x.fillStyle='#0b1026';x.fillRect(0,0,w,h);const hue=(t*40)%360,gr=x.createLinearGradient(0,0,w,0);gr.addColorStop(0,`hsl(${hue},90%,55%)`);gr.addColorStop(1,`hsl(${(hue+80)%360},90%,55%)`);
  x.fillStyle=gr;x.textAlign='center';x.textBaseline='middle';x.font=`900 ${Math.round(h*.3)}px ${FONT}`;x.fillText('DENTPHOTO',w/2,h*.44);x.fillStyle='#fff';x.font=`700 ${Math.round(h*.1)}px ${FONT}`;x.fillText('치과 사진관 · TIMES SQUARE',w/2,h*.74);
  const sx=((t*.6)%1.6-.3)*w;const sh=x.createLinearGradient(sx-60,0,sx+60,0);sh.addColorStop(0,'rgba(255,255,255,0)');sh.addColorStop(.5,'rgba(255,255,255,.35)');sh.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=sh;x.fillRect(0,0,w,h)},
 stocks(x,w,h,t){x.fillStyle='#05070c';x.fillRect(0,0,w,h);x.fillStyle='#ffd400';x.textAlign='left';x.textBaseline='middle';x.font=`900 ${Math.round(h*.085)}px ${FONT}`;x.fillText('DENTPHOTO 마을 증시',w*.05,h*.08);
  const row=h*.11,off=(t*18)%(row*STOCKS.length);x.save();x.beginPath();x.rect(0,h*.16,w,h*.84);x.clip();
  for(let k=0;k<STOCKS.length*2;k++){const [n,b]=STOCKS[k%STOCKS.length],y=h*.16+row*.6+k*row-off;if(y<h*.1||y>h+row)continue;const ch=b+Math.sin(t*.7+k)*.6,up=ch>=0;
   x.fillStyle='#e8ecf2';x.font=`700 ${Math.round(row*.55)}px ${FONT}`;x.fillText(n,w*.05,y);x.textAlign='right';x.fillStyle=up?'#ff4b4b':'#4ba3ff';x.fillText((up?'▲ ':'▼ ')+Math.abs(ch).toFixed(1)+'%',w*.95,y);x.textAlign='left'}
  x.restore()},
 musical(x,w,h,t){const gr=x.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#3a0ca3');gr.addColorStop(1,'#f72585');x.fillStyle=gr;x.fillRect(0,0,w,h);
  for(let i=0;i<40;i++){const a=i*2.39996,r=(i*37)%100/100,tw=.5+.5*Math.sin(t*3+i);x.fillStyle=`rgba(255,240,180,${tw})`;x.beginPath();x.arc((Math.cos(a)*.45+.5)*w,(r*.95)*h,1.5+tw*2.5,0,7);x.fill()}
  x.fillStyle='#ffd166';x.textAlign='center';x.textBaseline='middle';x.font=`800 ${Math.round(w*.07)}px ${FONT}`;x.fillText('BROADWAY',w/2,h*.2);x.font=`900 ${Math.round(w*.15)}px ${FONT}`;x.fillStyle='#fff';x.fillText('바람을',w/2,h*.45);x.fillText('따라',w/2,h*.6);
  x.font=`700 ${Math.round(w*.055)}px ${FONT}`;x.fillStyle='#ffd166';x.fillText('THE MUSICAL',w/2,h*.78);x.fillText('NOW PLAYING',w/2,h*.86)},
 iny(x,w,h,t){x.fillStyle='#fff';x.fillRect(0,0,w,h);x.fillStyle='#111';x.textAlign='center';x.textBaseline='middle';x.font=`900 ${Math.round(h*.55)}px ${FONT}`;x.fillText('I',w*.2,h*.55);x.fillText('NY',w*.76,h*.55);
  const s=1+.12*Math.max(0,Math.sin(t*6))**4;x.save();x.translate(w*.45,h*.53);x.scale(s,s);x.fillStyle='#e0282e';x.font=`900 ${Math.round(h*.55)}px ${FONT}`;x.fillText('♥',0,0);x.restore()},
 news(x,w,h,t){x.fillStyle='#0d1b2a';x.fillRect(0,0,w,h);x.fillStyle='#e63946';x.fillRect(0,0,w,h*.28);x.fillStyle='#fff';x.textAlign='left';x.textBaseline='middle';x.font=`900 ${Math.round(h*.16)}px ${FONT}`;x.fillText('BREAKING',w*.04,h*.14);
  const msgs=['편지 80통 배달 대작전 진행 중','W 42 ST 꽉 막힘 · 우회 없음','오늘 밤 별빛 밤길 개장','목표봉 정상에 다이아몬드 발견?'],i=Math.floor(t/4)%msgs.length,k=(t%4)/4;
  x.globalAlpha=Math.min(1,k*6,(1-k)*6);x.font=`800 ${Math.round(h*.15)}px ${FONT}`;x.fillText(msgs[i],w*.04,h*.6);x.globalAlpha=1;x.fillStyle='#ffd400';x.fillRect(0,h*.9,w*k,h*.04)},
 wave(x,w,h,t){for(let i=0;i<24;i++){x.fillStyle=`hsl(${(i*15+t*90)%360},85%,${45+10*Math.sin(t*2+i*.5)}%)`;x.fillRect(i*w/24,0,w/24+1,h)}
  x.fillStyle='rgba(0,0,0,.35)';x.fillRect(0,h*.32,w,h*.36);x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.font=`900 ${Math.round(h*.24)}px ${FONT}`;x.fillText('TIMES SQ',w/2,h*.5)},
 ride(x,w,h,t){x.fillStyle='#111';x.fillRect(0,0,w,h);for(let i=-2;i<12;i++){x.fillStyle=i%2?'#f4a261':'#e76f51';const o=(t*120)%(w/5);x.beginPath();x.moveTo(i*w/5+o,0);x.lineTo(i*w/5+o+w/10,0);x.lineTo(i*w/5+o-w/10,h);x.lineTo(i*w/5+o-w/5,h);x.fill()}
  x.fillStyle='rgba(10,10,20,.72)';x.fillRect(w*.06,h*.24,w*.88,h*.52);x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.font=`900 ${Math.round(h*.16)}px ${FONT}`;x.fillText('WIND RIDE',w/2,h*.42);x.font=`700 ${Math.round(h*.09)}px ${FONT}`;x.fillStyle='#ffd166';x.fillText('21.6 km · 편지 80통',w/2,h*.6)}};
const WIDE=['logo','stocks','news','wave','ride','iny'],TALL=['musical','stocks','logo'];
function build({T,g,C,blds,P,WV,dirW,YC,WALK}){
 const V1=C.V[1],R=78;
 const mk=(name,w,h)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;
  const m=new T.MeshBasicMaterial({map:t,toneMapped:false});return {name,cv,x:cv.getContext('2d'),t,m}};
 const wide=WIDE.map(n=>mk(n,512,288)),tall=TALL.map(n=>mk(n,288,512)),all=wide.concat(tall);
 // 시세 띠: 빌딩 허리를 두르는 긴 줄 (텍스처만 흘린다)
 const band=(()=>{const cv=document.createElement('canvas');cv.width=2048;cv.height=96;const x=cv.getContext('2d');x.fillStyle='#04060a';x.fillRect(0,0,2048,96);x.font=`800 54px ${FONT}`;x.textBaseline='middle';let px=20;
  for(const [n,b] of STOCKS.concat(STOCKS)){const up=b>=0;x.fillStyle='#e8ecf2';x.fillText(n,px,50);px+=x.measureText(n).width+14;x.fillStyle=up?'#ff4b4b':'#4ba3ff';const s=(up?'▲':'▼')+Math.abs(b).toFixed(1)+'%';x.fillText(s,px,50);px+=x.measureText(s).width+40;if(px>2000)break}
  const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;t.wrapS=T.RepeatWrapping;return {t,m:new T.MeshBasicMaterial({map:t,toneMapped:false})}})();
 const screens=[],grp=new T.Group(),frameMat=new T.MeshStandardMaterial({color:'#15171a',roughness:.5,metalness:.4});g.add(grp);
 // 바라보는 곳(브로드웨이로 다가오는 길 · W 42 ST 체증 줄)을 향한 빌딩 면마다 전광판을 붙인다
 const VIEWS=[[V1[0],V1[1]-30],[V1[0]-55,V1[1]],[V1[0],V1[1]-8]],faces=[];
 for(const b of blds){if(b.h<20)continue;const cx=(b.r0+b.r1)/2,cz=(b.f0+b.f1)/2;if(Math.hypot(cx-V1[0],cz-V1[1])>R)continue;
  for(const [nx,nz] of [[1,0],[-1,0],[0,1],[0,-1]]){const fx=nx?(nx>0?b.r1:b.r0):cx,fz=nz?(nz>0?b.f1:b.f0):cz,w=nx?b.f1-b.f0:b.r1-b.r0;
   if(Math.hypot(fx-V1[0],fz-V1[1])>R||w<9)continue;let best=0;for(const v of VIEWS){const dx=v[0]-fx,dz=v[1]-fz,l=Math.hypot(dx,dz)||1;best=Math.max(best,(dx*nx+dz*nz)/l)}
   if(best>.45)faces.push({b,nx,nz,fx,fz,w,score:best-Math.hypot(fx-V1[0],fz-V1[1])/R*.5})}}
 faces.sort((a,b)=>b.score-a.score);
 let k=0;
 for(const f of faces.slice(0,16)){const b=f.b,dw=dirW(f.nx,f.nz),ry=Math.atan2(dw.x,dw.z),ax=[f.nz?1:0,f.nx?1:0],top=Math.min(b.h-3,66),cols=f.w>21?2:1;
  const at=(off,y)=>{const R0=f.fx+f.nx*.25+ax[0]*off,F0=f.fz+f.nz*.25+ax[1]*off;return WV(R0,F0,YC+y)};
  let y=8.5;
  while(y<top-6&&k<48){const tallOne=(k%3===2)&&top-y>22,hgt=tallOne?Math.min(24,top-y):Math.min(12+(k%2)*4,top-y);
   for(let c=0;c<cols;c++){const sw=(f.w-1.2)/cols-.6,off=-f.w/2+.6+(c+.5)*(f.w-1.2)/cols,mat=(tallOne?tall[k%tall.length]:wide[k%wide.length]).m,ww=tallOne?Math.min(sw,hgt*.56):sw;
    const m=new T.Mesh(new T.PlaneGeometry(ww,hgt),mat);m.position.copy(at(off,y+hgt/2));m.rotation.y=ry;grp.add(m);
    const fr=new T.Mesh(new T.BoxGeometry(ww+.5,hgt+.5,.3),frameMat);fr.position.copy(m.position).addScaledVector(new T.Vector3(dw.x,0,dw.z),-.18);fr.rotation.y=ry;grp.add(fr);screens.push(m);k++}
   y+=hgt+1.4;
   if(y<top-4&&k%4===1){const bm=new T.Mesh(new T.PlaneGeometry(f.w-.6,2),band.m);bm.position.copy(at(0,y+1));bm.rotation.y=ry;const uv=bm.geometry.attributes.uv.array;for(let i=0;i<uv.length;i+=2)uv[i]*=f.w/18;grp.add(bm);y+=3.4}}}
 const near=faces.length;
 let acc=0,time=0;
 function update(dt,u,E){const d=Math.abs(C.uAt(1,0)-u);grp.visible=true;if(d>420)return;time+=dt;acc+=dt;band.t.offset.x=(band.t.offset.x+dt*.05)%1;
  const glow=1+.5*(E?E.dark:0);for(const s of all)s.m.color.setScalar(glow);band.m.color.setScalar(glow);
  if(acc<.125)return;acc=0;for(const s of all){DRAW[s.name](s.x,s.cv.width,s.cv.height,time);s.t.needsUpdate=true}}
 for(const s of all)DRAW[s.name](s.x,s.cv.width,s.cv.height,0);
 return {update,screens,group:grp,near}}
root.CITY_TS={build,DRAW,STOCKS};if(typeof module!=='undefined')module.exports={build,DRAW,STOCKS};
})(typeof window!=='undefined'?window:globalThis);
