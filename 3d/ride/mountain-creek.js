/* 목표봉(오르막 · 정상 · 내리막)과 개울가(물줄기 · 여울 세 곳 · 둑의 돌 · 갈대).
   - 산 모양은 ADVENTURE.mountainField 하나로 길 높이 · 들판 · 산 메시가 모두 맞물린다.
   - 개울은 ADVENTURE.creekX(s) 를 따라 길 옆을 흐르다 여울에서 길을 가로지른다. */
(function(root){
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
function hash(n){const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s)}
function vn2(x,z){const xi=Math.floor(x),zi=Math.floor(z),fx=x-xi,fz=z-zi,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz),h=(i,j)=>hash(i*57.3+j*131.7);return lerp(lerp(h(xi,zi),h(xi+1,zi),u),lerp(h(xi,zi+1),h(xi+1,zi+1),u),v)}
function rng(seed){let a=seed>>>0;return ()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function canvasTexture(T,size,draw){const cv=document.createElement('canvas');cv.width=cv.height=size;draw(cv.getContext('2d'),size);const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;return t}

function build({T,scene,point,height,heading,groundAt,ride}){
  const A=ADVENTURE,M=A.mountain,R=rng(23),updates=[];
  /* ── 목표봉 ── */
  const dir=(()=>{const a=point(M.peak-200),b=point(M.peak+200);return new T.Vector3(b.x-a.x,0,b.z-a.z).normalize()})();
  const offRoad=(x,z)=>Math.abs((x-M.x)*dir.z-(z-M.z)*dir.x);   // distance from the straight mountain road
  const rough=(x,z)=>{const d=offRoad(x,z),f=A.mountainField(x,z);return f<=0?0:(vn2(x*.035,z*.035)-.45)*7*sstep(22,60,d)*Math.min(1,f/8)};
  const meshY=(x,z)=>{const dist=Math.hypot(x-M.x,z-M.z);return A.mountainField(x,z)+rough(x,z)-.45-11.5*sstep(M.radius,M.radius+80,dist)};
  {const NR=80,NS=140,RMAX=M.radius+90,pos=[],col=[],idx=[],c=new T.Color();
    const C=['#86a660','#7a9d57','#6f9450','#5f8a4a','#a49a88','#b8ae9c','#d8d2c6'];
    for(let k=0;k<=NR;k++){const r=RMAX*Math.pow(k/NR,1.1);for(let j=0;j<NS;j++){const a=j/NS*Math.PI*2,x=M.x+Math.cos(a)*r,z=M.z+Math.sin(a)*r,y=meshY(x,z);pos.push(x,y,z);
      const hr=clamp(y/M.height,0,1),n=vn2(x*.06,z*.06);let ci=hr<.3?(n>.5?0:1):hr<.55?(n>.45?2:3):hr<.8?(n>.6?3:4):hr<.93?5:6;if(hr>.62&&hr<.8&&n<.3)ci=4;
      c.set(C[ci]);c.multiplyScalar(.92+.12*vn2(x*.3,z*.3));col.push(c.r,c.g,c.b);
      if(k<NR){const a0=k*NS+j,a1=k*NS+(j+1)%NS,b0=a0+NS,b1=a1+NS;idx.push(a0,b0,a1,a1,b0,b1)}}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();
    const m=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:.95,flatShading:true}));m.receiveShadow=true;m.castShadow=true;scene.add(m)}
  // 산비탈 소나무 · 바위
  {const pines=[],rocks=[];for(let i=0;i<900&&pines.length<420;i++){const a=R()*Math.PI*2,r=Math.sqrt(R())*M.radius*.97,x=M.x+Math.cos(a)*r,z=M.z+Math.sin(a)*r;if(offRoad(x,z)<16)continue;const y=meshY(x,z),hr=y/M.height;
      if(hr<.72&&R()<.85)pines.push({x,y,z,s:.8+R()*.9});else if(hr>.45&&R()<.5)rocks.push({x,y,z,s:1+R()*2.6})}
    const m4=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),v=new T.Vector3(),sc=new T.Vector3();
    const inst=(geo,color,list,fn)=>{const m=new T.InstancedMesh(geo,new T.MeshStandardMaterial({color,roughness:.9,flatShading:true}),Math.max(1,list.length));list.forEach((p,i)=>{fn(p,i);m.setMatrixAt(i,m4)});m.count=list.length;m.castShadow=true;m.receiveShadow=true;scene.add(m)};
    const tg=(geo,y)=>{geo.translate(0,y,0);return geo};
    inst(tg(new T.CylinderGeometry(.18,.3,2.4,6),1.2),'#6b4a32',pines,p=>m4.compose(v.set(p.x,p.y-.2,p.z),q.identity(),sc.setScalar(p.s)));
    inst(tg(new T.ConeGeometry(1.9,4.6,7),4.2),'#3f6b3a',pines,(p,i)=>m4.compose(v.set(p.x,p.y-.2,p.z),q.setFromEuler(e.set(0,i,0)),sc.setScalar(p.s)));
    inst(tg(new T.ConeGeometry(1.4,3.4,7),6.2),'#4b7a42',pines,(p,i)=>m4.compose(v.set(p.x,p.y-.2,p.z),q.setFromEuler(e.set(0,i*1.7,0)),sc.setScalar(p.s)));
    inst(new T.DodecahedronGeometry(1,0),'#9d9385',rocks,(p,i)=>m4.compose(v.set(p.x,p.y+.1,p.z),q.setFromEuler(e.set(i,i*2.3,0)),sc.set(p.s,p.s*.6,p.s*.9)))}
  // 정상: 덴포토 바위 · 깃발 · 떠 있는 다이아몬드 · 안내판
  {const g=new T.Group(),p=point(M.peak,14.5);g.position.copy(p);g.rotation.y=heading(M.peak);scene.add(g);
    const stone=new T.Mesh(new T.DodecahedronGeometry(2.4,0),new T.MeshStandardMaterial({color:'#8f877a',roughness:.9,flatShading:true}));stone.scale.set(1.3,.9,.8);stone.position.y=1.6;stone.castShadow=true;g.add(stone);
    const tex=canvasTexture(T,512,(x,S)=>{x.fillStyle='#f6efe0';x.fillRect(0,0,S,S*.5);x.strokeStyle='#5b4a36';x.lineWidth=16;x.strokeRect(8,8,S-16,S*.5-16);x.fillStyle='#3b3226';x.textAlign='center';x.font='bold 70px sans-serif';x.fillText('⛰ 목표봉 정상',S/2,S*.2);x.font='bold 54px sans-serif';x.fillText('덴포토 · DentPhoto',S/2,S*.38)});
    tex.repeat.set(1,.5);tex.offset.set(0,.5);
    const board=new T.Mesh(new T.PlaneGeometry(5,2.5),new T.MeshStandardMaterial({map:tex,roughness:.7,side:T.DoubleSide}));board.position.set(0,4.4,-.2);board.rotation.y=Math.PI;g.add(board);
    for(const x of [-2.2,2.2]){const post=new T.Mesh(new T.CylinderGeometry(.13,.15,5,8),new T.MeshStandardMaterial({color:'#6b4a32'}));post.position.set(x,2.6,-.25);g.add(post)}
    const pole=new T.Mesh(new T.CylinderGeometry(.08,.1,9,8),new T.MeshStandardMaterial({color:'#d9d4c8'}));pole.position.set(4,4.5,1);g.add(pole);
    const flag=new T.Mesh(new T.PlaneGeometry(2.6,1.6,8,1),new T.MeshStandardMaterial({color:'#d8442f',side:T.DoubleSide}));flag.position.set(5.3,8,1);g.add(flag);
    const gem=new T.Mesh(new T.OctahedronGeometry(1.1,0),new T.MeshStandardMaterial({color:'#7fe0ff',emissive:'#2bb7e6',emissiveIntensity:.6,roughness:.15,metalness:.2,flatShading:true}));gem.position.set(0,7.2,0);g.add(gem);
    const fp=flag.geometry.attributes.position,base=fp.array.slice();
    updates.push((t)=>{gem.rotation.y=t*1.4;gem.position.y=7.2+Math.sin(t*2)*.3;for(let i=0;i<fp.count;i++){const x=base[i*3];fp.array[i*3+2]=base[i*3+2]+Math.sin(t*6+x*2.2)*.22*(x+1.3)/2.6}fp.needsUpdate=true})}
  // 오르막 · 내리막 안내판
  {const sign=(s,text,bg)=>{const tex=canvasTexture(T,256,(x,S)=>{x.fillStyle=bg;x.fillRect(0,0,S,S*.5);x.strokeStyle='#3b2a1a';x.lineWidth=10;x.strokeRect(5,5,S-10,S*.5-10);x.fillStyle='#2b2520';x.textAlign='center';x.font='bold 40px sans-serif';x.fillText(text,S/2,S*.32)});tex.repeat.set(1,.5);tex.offset.set(0,.5);
      const p=point(s,12.5),aim=point(s-80,4);const b=new T.Mesh(new T.PlaneGeometry(3.4,1.7),new T.MeshStandardMaterial({map:tex,side:T.DoubleSide}));b.position.set(p.x,p.y+2.6,p.z);b.lookAt(aim.x,p.y+2.6,aim.z);scene.add(b);
      const post=new T.Mesh(new T.CylinderGeometry(.12,.14,2.2,8),new T.MeshStandardMaterial({color:'#7a5a3a'}));post.position.set(p.x,p.y+1.1,p.z);scene.add(post)};
    sign(M.start-600,'⛰ 목표봉 오르막','#f2d27a');sign(M.peak+700,'⬇ 내리막 · 감속','#f2c230')}

  /* ── 개울 ── */
  const K=A.creek;
  const waterTex=canvasTexture(T,256,(x,S)=>{const g=x.createLinearGradient(0,0,S,0);g.addColorStop(0,'#6f8f7c');g.addColorStop(.5,'#78a7ae');g.addColorStop(1,'#6f8f7c');x.fillStyle=g;x.fillRect(0,0,S,S);const r=rng(5);
    for(let i=0;i<260;i++){x.strokeStyle=r()<.6?'rgba(235,248,250,.35)':'rgba(70,100,96,.3)';x.lineWidth=1+r()*2;const y=r()*S,xx=r()*S;x.beginPath();x.moveTo(xx,y);x.quadraticCurveTo(xx+6,y+8,xx+r()*10-5,y+18+r()*20);x.stroke()}});
  const strips=[];   // water surface + foam over the fords
  {const S0=K.start-1200,S1=K.end+1200,NX=6,pos=[],uv=[],idx=[];let rows=0;
    for(let s=S0;s<=S1;s+=(K.fords.some(f=>Math.abs(s-f)<400)?10:40)){const cx=A.creekX(s);if(cx===null)continue;
      for(let j=0;j<=NX;j++){const u=j/NX,lat=cx+(u*2-1)*K.half,p=point(s,lat),onRoad=Math.abs(lat)<9.8;pos.push(p.x,onRoad?height(s)+.07:height(s)-.5,p.z);uv.push(u,s/90)}
      if(rows>0){const a=(rows-1)*(NX+1),b=rows*(NX+1);for(let j=0;j<NX;j++)idx.push(a+j,b+j,a+j+1,a+j+1,b+j,b+j+1)}rows++}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
    const water=new T.Mesh(g,new T.MeshStandardMaterial({map:waterTex,color:'#d6eef0',roughness:.18,metalness:.1,transparent:true,opacity:.88,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));water.receiveShadow=true;scene.add(water);
    updates.push((t,dt)=>{waterTex.offset.y-=dt*.9})}
  // 여울: 길 위를 흐르는 하얀 물보라 띠
  for(const f of K.fords){const pos=[],idx=[],uv=[];let rows=0;for(let s=f-320;s<=f+320;s+=10){const cx=A.creekX(s);for(let j=0;j<=1;j++){const lat=cx+(j?1:-1)*(K.half+.6);if(Math.abs(lat)>11){}const p=point(s,lat);pos.push(p.x,height(s)+.11,p.z);uv.push(j,s/40)}
      if(rows>0){const a=(rows-1)*2;idx.push(a,a+2,a+1,a+1,a+2,a+3)}rows++}
    const tex=canvasTexture(T,128,(x,S)=>{x.clearRect(0,0,S,S);const r=rng(9);for(let i=0;i<120;i++){x.fillStyle=`rgba(255,255,255,${.25+r()*.5})`;x.beginPath();x.ellipse(r()*S,r()*S,2+r()*8,1+r()*3,r()*3,0,7);x.fill()}});
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);
    const foam=new T.Mesh(g,new T.MeshBasicMaterial({map:tex,transparent:true,opacity:.75,depthWrite:false,side:T.DoubleSide}));scene.add(foam);updates.push((t,dt)=>{tex.offset.x+=dt*1.6});
    // 여울 안내판
    const p=point(f-700,12.5),aim=point(f-780,4),st=canvasTexture(T,256,(x,S)=>{x.fillStyle='#bfe3ec';x.fillRect(0,0,S,S*.5);x.strokeStyle='#2a5566';x.lineWidth=10;x.strokeRect(5,5,S-10,S*.5-10);x.fillStyle='#173847';x.textAlign='center';x.font='bold 38px sans-serif';x.fillText('〰 개울 건너기',S/2,S*.32)});st.repeat.set(1,.5);st.offset.set(0,.5);
    const b=new T.Mesh(new T.PlaneGeometry(3.4,1.7),new T.MeshStandardMaterial({map:st,side:T.DoubleSide}));b.position.set(p.x,p.y+2.6,p.z);b.lookAt(aim.x,p.y+2.6,aim.z);scene.add(b)}
  // 둑의 돌 · 갈대
  {const stones=[],reeds=[];for(let s=K.start-1000;s<=K.end+1000;s+=26){const cx=A.creekX(s);if(cx===null)continue;for(const e of [-1,1]){const lat=cx+e*(K.half+.4+R()*1.6);if(Math.abs(lat)<10.6)continue;const p=groundAt(s,lat);
      if(R()<.55)stones.push({x:p.x,y:p.y-.25,z:p.z,s:.35+R()*.9,r:R()*6,c:R()});if(R()<.35){const l2=lat+e*(1+R()*2);if(Math.abs(l2)>10.6){const q=groundAt(s,l2);reeds.push({x:q.x,y:q.y-.1,z:q.z,s:.7+R()*.7,r:R()*6})}}}}
    const m4=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),v=new T.Vector3(),sc=new T.Vector3(),c=new T.Color();
    const sm=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),new T.MeshStandardMaterial({color:'#ffffff',roughness:.85,flatShading:true}),stones.length);
    stones.forEach((p,i)=>{m4.compose(v.set(p.x,p.y,p.z),q.setFromEuler(e.set(p.r,p.r*2,0)),sc.set(p.s*1.3,p.s*.7,p.s));sm.setMatrixAt(i,m4);sm.setColorAt(i,c.set(p.c<.4?'#8f8a7e':p.c<.75?'#a59c8a':'#7d7466'))});sm.castShadow=sm.receiveShadow=true;scene.add(sm);
    const rg=new T.ConeGeometry(.22,2.6,5);rg.translate(0,1.3,0);const rm=new T.InstancedMesh(rg,new T.MeshStandardMaterial({color:'#6f8f45',roughness:.9}),reeds.length*3);
    reeds.forEach((p,i)=>{for(let k=0;k<3;k++){m4.compose(v.set(p.x+(k-1)*.35,p.y,p.z+((k*7)%3-1)*.3),q.setFromEuler(e.set((k-1)*.15,p.r,(k-1)*.12)),sc.setScalar(p.s*(.8+k*.15)));rm.setMatrixAt(i*3+k,m4)}});rm.castShadow=true;scene.add(rm)}

  return {update(t,dt){for(const f of updates)f(t,dt)},meshY}}
root.MOUNTAIN_CREEK={build};
})(typeof window!=='undefined'?window:globalThis);
