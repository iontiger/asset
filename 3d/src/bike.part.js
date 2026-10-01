const bike=(()=>{const g=new THREE.Group(),fc='#5fb8a0',dk='#394a4f',mt='#8a9396',wheels=[],cranks=[];
  // 1인용 자전거 — 바퀴 둘, 안장 하나, 페달 하나, 앞 바구니
  for(const z of [.86,-.86]){const w=new THREE.Group();w.position.set(0,.47,z);g.add(w);{const t=mesh(new THREE.TorusGeometry(.42,.06,8,26),dk,w);t.rotation.y=Math.PI/2}for(let k=0;k<3;k++){const s=box(w,0,0,0,.02,.8,.02,'#cfd8d6');s.rotation.x=k*Math.PI/3}sphere(w,0,0,0,.07,'#cfd8d6',1);wheels.push(w)}
  const HT=[0,1.1,.6],ST=[0,1.06,-.2],BB=[0,.42,.1];
  beam(g,[0,.47,.86],HT,.04,fc);beam(g,HT,ST,.05,fc);beam(g,HT,BB,.05,fc);beam(g,ST,BB,.045,fc);beam(g,BB,[0,.47,-.86],.035,fc);beam(g,ST,[0,.47,-.86],.035,fc);
  box(g,0,1.18,-.22,.24,.07,.34,'#6b4a36');beam(g,ST,[0,1.15,-.22],.03,mt);
  beam(g,HT,[0,1.32,.52],.03,mt);beam(g,[-.36,1.32,.52],[.36,1.32,.52],.03,mt);for(const x of [-.36,.36])beam(g,[x*1.05,1.32,.52],[x*1.25,1.32,.52],.045,'#6b4a36');
  box(g,0,1.08,1.02,.42,.28,.32,'#c9a372');[['#f2a7b8',-.1],['#f6d77a',.08],['#fbf6e8',0]].forEach(([c,x],k)=>sphere(g,x,1.27,1.02+(k-1)*.07,.08,c,1));
  {const cr=new THREE.Group();cr.position.set(...BB);g.add(cr);for(const s of [-1,1]){box(cr,s*.1,s*.1,0,.03,.22,.04,mt);box(cr,s*.2,s*.2,0,.14,.04,.1,dk)}cranks.push(cr)}
  g.visible=false;scene.add(g);return {g,wheels,cranks,crank:0,lx:null,lz:null}})();
