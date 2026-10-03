/* 완주 카드: 라이더와 무작위 마을 명소 하나를 작은 3D 장면으로 찍고, 기록을 얹어 1080×1350 PNG 카드로 만든다. */
(() => {
  const T=window.THREE,W=1080,H=1350,PX=54,PY=54,PW=972,PH=830;
  const FONT='"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
  // 명소마다 하늘 · 땅 색을 달리해서 카드마다 분위기가 바뀌게 한다. k = 카드 속 명소 크기(사진 칸에 알맞게).
  const SCENES={
    fountain:{k:1.7,sky:['#a9d9ef','#fff3d4'],ground:'#9cc47a',sun:'#fff6d8'},
    rosehouse:{k:1.27,sky:['#f3bfc3','#fff0dc'],ground:'#a6c982',sun:'#fff1e4'},
    market:{k:0.95,sky:['#9fd2ee','#fff4d6'],ground:'#a3c27c',sun:'#fff7da'},
    vault:{k:1.65,sky:['#e7bf8f','#fff0cc'],ground:'#b8b27a',sun:'#fff3cf'},
    tower:{k:1.65,sky:['#93bfe4','#eef4e2'],ground:'#8fb47a',sun:'#f8fbff'},
    pier:{k:2.1,sky:['#86cbe6','#e9f6f0'],ground:'#b4c98a',sun:'#fffbe6',sea:true},
    lighthouse:{k:1.15,sky:['#ee9878','#ffe0ae'],ground:'#9fb47a',sun:'#fff0c4',sea:true}
  };
  let seed=1;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};

  // 라이더(게임 속 바이크 복제본)와 명소를 따로 만든 장면에서 한 번 찍는다.
  function shot(rider,landmark,pal,w,h){
    const cv=document.createElement('canvas');cv.width=w;cv.height=h;
    const r=new T.WebGLRenderer({canvas:cv,antialias:true,alpha:true,preserveDrawingBuffer:true});
    r.setPixelRatio(1);r.setSize(w,h,false);r.setClearColor(0,0);r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.1;r.shadowMap.enabled=true;r.shadowMap.type=T.PCFSoftShadowMap;
    const s=new T.Scene();s.fog=new T.Fog(pal.sky[1],46,120);const own=[];
    const add=(g,c,x,y,z,p=s)=>{const m=new T.Mesh(g,new T.MeshStandardMaterial({color:c,roughness:.88}));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;p.add(m);own.push(m);return m};
    const flat=m=>{m.rotation.x=-Math.PI/2;m.castShadow=false;return m};
    flat(add(new T.CircleGeometry(170,48),pal.ground,0,0,30));
    flat(add(new T.PlaneGeometry(7.4,220),'#e2cca2',0,.03,60));
    for(const x of [-3.9,3.9])flat(add(new T.PlaneGeometry(.45,220),'#f3e6c6',x,.04,60));
    if(pal.sea)flat(add(new T.PlaneGeometry(150,260),'#74bccf',95,.06,70));
    const cam=new T.Vector3(-4,2.7,-13),lx=16,lz=19;
    landmark.position.set(lx,0,lz);landmark.rotation.y=Math.atan2(cam.x-lx,cam.z-lz);s.add(landmark);
    if(pal.sea)add(new T.CylinderGeometry(5.5,7,1.2,9),'#a8a58f',lx,-.2,lz);
    const tree=(x,z,k,bloom)=>{const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(k);s.add(g);add(new T.CylinderGeometry(.14,.22,2.2,8),'#8d7854',0,1.1,0,g);
      for(const [dx,dy,dz,rr] of [[0,2.5,0,1],[-.5,2.85,.1,.68],[.6,2.3,.2,.72]])add(new T.IcosahedronGeometry(rr,2),bloom?(rr>.9?'#f4b9c6':'#f8cfd6'):(rr>.9?'#8fb16b':'#a9c780'),dx,dy,dz,g)};
    // 카메라는 바이크 앞 왼쪽에서 오른쪽 뒤를 본다: 나무는 그 시야(길 오른쪽 뒤편)에만 심는다.
    seed=7;[[6,34],[10,42],[3.5,50],[17,47],[-1,62],[8,64],[24,31],[28,17],[31,41],[-5,14],[-6,30]].forEach(([tx,tz],i)=>{if(!(pal.sea&&tx>20))tree(tx,tz,.9+rnd()*.5,i%2===0)});
    for(let i=0;i<6;i++){const m=add(new T.IcosahedronGeometry(14,2),i%2?'#86ab70':'#93b97a',-60+i*24,-6,105+rnd()*20);m.scale.set(1.6,.75,1);m.castShadow=false}
    rider.position.set(0,0,0);rider.rotation.set(0,-.08,0);s.add(rider);
    s.add(new T.HemisphereLight('#fff5dc',pal.ground,2.1));
    const sun=new T.DirectionalLight('#fff0cf',3.1);sun.position.set(-11,18,-9);sun.target.position.set(3,0,9);s.add(sun,sun.target);
    sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-26,right:26,top:26,bottom:-26,near:1,far:80});sun.shadow.bias=-.0006;
    const camera=new T.PerspectiveCamera(30,w/h,.1,400);camera.position.copy(cam);camera.lookAt(6.6,3.4,9.7);
    r.render(s,camera);
    const out=document.createElement('canvas');out.width=w;out.height=h;out.getContext('2d').drawImage(cv,0,0);
    for(const m of own){m.geometry.dispose();m.material.dispose()}landmark.traverse(o=>{if(o.isMesh)o.geometry.dispose()});s.remove(rider);
    r.dispose();r.forceContextLoss();return out;
  }

  function pill(ctx,left,top,text,bg,fg,size=26){ctx.font=`600 ${size}px ${FONT}`;const tw=ctx.measureText(text).width,h=size*1.9;ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(left,top,tw+size*1.6,h,h/2);ctx.fill();ctx.fillStyle=fg;ctx.textBaseline='middle';ctx.fillText(text,left+size*.8,top+h/2+1);return tw+size*1.6}

  // o: {rider, model, name, record, time, score, letters, goal, branch, date}
  function make(o){
    const pal=SCENES[o.model]||SCENES.fountain,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
    x.fillStyle='#fffbed';x.fillRect(0,0,W,H);x.strokeStyle='#ece2c4';x.lineWidth=3;x.beginPath();x.roundRect(20,20,W-40,H-40,40);x.stroke();
    // 사진 칸: 하늘 → 해 → 구름 → 3D 장면 → 꽃잎
    x.save();x.beginPath();x.roundRect(PX,PY,PW,PH,34);x.clip();
    const g=x.createLinearGradient(0,PY,0,PY+PH*.72);g.addColorStop(0,pal.sky[0]);g.addColorStop(1,pal.sky[1]);x.fillStyle=g;x.fillRect(PX,PY,PW,PH);
    const sx=PX+PW*.8,sy=PY+170,sg=x.createRadialGradient(sx,sy,10,sx,sy,190);sg.addColorStop(0,pal.sun);sg.addColorStop(.32,pal.sun+'cc');sg.addColorStop(1,pal.sun+'00');x.fillStyle=sg;x.fillRect(sx-200,sy-200,400,400);
    seed=Math.floor(Math.random()*9999)+1;x.fillStyle='#ffffffcc';
    for(let i=0;i<4;i++){const cx=PX+60+rnd()*PW*.85,cy=PY+70+rnd()*170,k=.7+rnd()*.7;for(const [dx,dy,rx,ry] of [[0,0,70,26],[-46,8,44,20],[50,6,52,22],[10,-18,40,24]]){x.beginPath();x.ellipse(cx+dx*k,cy+dy*k,rx*k,ry*k,0,0,Math.PI*2);x.fill()}}
    try{const lm=VillageModels.create(o.model);lm.scale.setScalar(pal.k);x.drawImage(shot(o.rider,lm,pal,PW,PH),PX,PY)}catch(e){console.warn('card shot',e)}
    for(let i=0;i<30;i++){x.save();x.translate(PX+rnd()*PW,PY+rnd()*PH*.8);x.rotate(rnd()*Math.PI);x.globalAlpha=.55+rnd()*.4;x.fillStyle=i%3?'#f6b9c8':'#ffe1e8';x.beginPath();x.ellipse(0,0,9+rnd()*7,5+rnd()*3,0,0,Math.PI*2);x.fill();x.restore()}
    const lg=x.createLinearGradient(0,PY+PH-160,0,PY+PH);lg.addColorStop(0,'#2c3a2f00');lg.addColorStop(1,'#2c3a2f55');x.fillStyle=lg;x.fillRect(PX,PY+PH-160,PW,160);
    x.restore();
    pill(x,PX+30,PY+30,'COMPLETE ✿ 21.6 km','#fffbede6','#46634c',24);
    // 우체국 소인
    x.save();x.translate(PX+PW-128,PY+128);x.rotate(-.2);x.globalAlpha=.86;x.strokeStyle=x.fillStyle='#c9473b';x.lineWidth=5;x.beginPath();x.arc(0,0,86,0,Math.PI*2);x.stroke();x.lineWidth=2;x.beginPath();x.arc(0,0,72,0,Math.PI*2);x.stroke();
    x.textAlign='center';x.textBaseline='middle';x.font=`800 19px ${FONT}`;x.fillText('DENTPHOTO',0,-38);x.font=`800 26px ${FONT}`;x.fillText(o.date,0,2);x.font=`700 17px ${FONT}`;x.fillText('VILLAGE POST',0,40);
    x.fillRect(-58,-18,116,2.5);x.fillRect(-58,22,116,2.5);x.restore();x.textAlign='left';
    // 명소 이름표
    const tagT=PY+PH-96;pill(x,PX+30,tagT,'      '+o.name,'#fffbedf0','#344237',28);
    x.fillStyle='#e2703a';x.beginPath();x.arc(PX+64,tagT+22,11,Math.PI,0);x.lineTo(PX+64,tagT+43);x.closePath();x.fill();x.fillStyle='#fffbed';x.beginPath();x.arc(PX+64,tagT+22,4.5,0,Math.PI*2);x.fill();
    // 기록
    x.textBaseline='alphabetic';x.fillStyle='#5f765b';x.font=`600 21px ${FONT}`;if('letterSpacing' in x)x.letterSpacing='6px';x.fillText('THE SECRET OF DENTPHOTO VILLAGE',PX+6,PY+PH+64);if('letterSpacing' in x)x.letterSpacing='0px';
    x.fillStyle='#344237';x.font=`700 60px ${FONT}`;x.fillText(o.record?'새로운 최고 기록!':'바람을 따라, 완주!',PX+2,PY+PH+136);
    const m=Math.floor(o.time/60),sec=Math.floor(o.time%60),stats=[['시간',`${m}분 ${String(sec).padStart(2,'0')}초`],['점수',o.score.toLocaleString()],['편지',`${o.letters} / ${o.goal}`],['코스',o.branch]];
    const cw=PW/4,top=PY+PH+180;
    stats.forEach(([k,v],i)=>{const left=PX+i*cw+(i?24:6);if(i){x.fillStyle='#e3dbc0';x.fillRect(PX+i*cw,top,2,96)}x.fillStyle='#8a927c';x.font=`500 24px ${FONT}`;x.fillText(k,left,top+28);x.fillStyle=i===2&&o.letters>=o.goal?'#c9473b':'#344237';x.font=`700 ${v.length>8?34:40}px ${FONT}`;x.fillText(v,left,top+82)});
    const fy=H-74;x.strokeStyle='#46634c';x.lineWidth=2.5;x.beginPath();x.arc(PX+26,fy,24,0,Math.PI*2);x.stroke();x.fillStyle='#46634c';x.font=`700 26px Georgia,serif`;x.textAlign='center';x.textBaseline='middle';x.fillText('D',PX+26,fy+1);
    x.textAlign='left';x.font=`700 22px ${FONT}`;if('letterSpacing' in x)x.letterSpacing='4px';x.fillText('DENTPHOTO VILLAGE RIDES',PX+66,fy+1);if('letterSpacing' in x)x.letterSpacing='0px';
    x.textAlign='right';x.fillStyle='#9aa08a';x.font=`500 22px ${FONT}`;x.fillText('작은 편지를 싣고, 봄날의 마을로.',PX+PW,fy+1);x.textAlign='left';
    return c;
  }
  window.RideCard={make,SCENES};
})();
