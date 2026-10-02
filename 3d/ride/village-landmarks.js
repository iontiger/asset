/* Reusable Three.js mesh models inspired by https://iontiger.github.io/asset/3d/. */
(() => {
  const T=window.THREE;
    const materials=new Map();
    function material(c){if(!materials.has(c))materials.set(c,new T.MeshStandardMaterial({color:c,roughness:.82}));return materials.get(c)}
    function mesh(g,c,p,x=0,y=0,z=0){const m=new T.Mesh(g,material(c));m.position.set(x,y,z);p.add(m);return m}
    function box(p,x,y,z,w,h,d,c){return mesh(new T.BoxGeometry(w,h,d),c,p,x,y,z)}
    function cyl(p,x,y,z,rt,rb,h,c,n=20){return mesh(new T.CylinderGeometry(rt,rb,h,n),c,p,x,y,z)}
    function ball(p,x,y,z,r,c){return mesh(new T.IcosahedronGeometry(r,2),c,p,x,y,z)}
    function beam(p,a,b,r,c){const d=new T.Vector3(...b).sub(new T.Vector3(...a)),m=cyl(p,0,0,0,r,r,d.length(),c,8);m.position.copy(new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m}
    function roof(p,x,y,z,w,d,h,c){const sh=new T.Shape();sh.moveTo(-w/2,0);sh.lineTo(w/2,0);sh.lineTo(0,h);sh.closePath();return mesh(new T.ExtrudeGeometry(sh,{depth:d,bevelEnabled:false}),c,p,x,y,z-d/2)}
    function sign(p,text,x,y,z,w,bg='#386b5c'){
      const cv=document.createElement('canvas');cv.width=768;cv.height=128;
      const c=cv.getContext('2d');c.fillStyle=bg;c.fillRect(0,0,768,128);c.fillStyle='#fff4d5';c.font='bold 68px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,384,68,720);
      const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;
      const m=new T.Mesh(new T.PlaneGeometry(w,w/6),new T.MeshBasicMaterial({map:tex}));m.position.set(x,y,z);p.add(m);
    }
    function tree(p,x,z,s=1){const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(s);p.add(g);cyl(g,0,1,0,.12,.2,2,'#8d7854');ball(g,0,2.3,0,.95,'#8fb16b');ball(g,-.45,2.6,0,.6,'#a9c780');ball(g,.55,2.15,.1,.65,'#7d9e61')}
    function windowPane(p,x,y,z){box(p,x,y,z,1.2,1.45,.15,'#fff0d3');box(p,x,y,z+.1,.95,1.18,.07,'#789e9e');box(p,x,y,z+.16,.07,1.18,.05,'#f4e7c7');box(p,x,y,z+.16,.95,.07,.05,'#f4e7c7');box(p,x,y-.8,z+.2,1.5,.18,.5,'#b88d62');ball(p,x,y-.58,z+.23,.29,'#799e61')}
    const builders={
      cottage(p,pink=false){const wall=pink?'#f1d9b9':'#ece6cd',r=pink?'#bc795a':'#617f70';box(p,0,.2,0,8,.35,6.3,'#cdc5a6');box(p,0,3.2,0,7.5,6,5.8,wall);roof(p,0,6.2,0,8.3,6.6,2,r);box(p,0,1.35,3,1.15,2.2,.15,'#936d4a');ball(p,.32,1.3,3.15,.075,'#ead497');for(const y of [2,4.5])for(const x of [-2.3,2.3])windowPane(p,x,y,3);box(p,2.1,7,-1,.7,2,.85,'#d9b498');box(p,0,4.1,3.4,3.1,.18,1.3,'#e6d4af');for(let x=-1.4;x<=1.5;x+=.4)box(p,x,4.55,3.95,.07,.9,.07,'#f1e2c1');box(p,0,5,3.95,3,.1,.1,'#f1e2c1');box(p,0,.15,3.8,2,.2,1.7,'#e8d9b3');tree(p,-4.5,1,.65)},
      market(p){box(p,0,.25,0,12,.5,7,'#c4c7b3');box(p,0,.65,.2,10.8,.26,6.5,'#eee2bd');box(p,0,2.8,-.7,10.2,4.3,4.5,'#e8e2c6');box(p,0,2.8,1.62,8,2.7,.06,'#456f68');for(const x of [-4,-2,2,4]){cyl(p,x,2.75,2.35,.25,.3,3.9,'#f6ebce',12);box(p,x,.91,2.35,.75,.3,.7,'#eee1bc');box(p,x,4.63,2.35,.7,.25,.7,'#eee1bc')}box(p,0,4.95,.3,11.2,.55,6,'#d7d4b4');roof(p,0,5.23,.3,11.8,6.3,2.1,'#386b5c');sign(p,'VILLAGE MARKET',0,4.85,3.36,8);for(let i=0;i<3;i++)box(p,0,.2+i*.16,3.9-i*.3,6.5,.24,1,'#d5ceb2')},
      fountain(p){cyl(p,0,.12,0,4.8,4.8,.24,'#dfd2ab',48);cyl(p,0,.33,0,3.9,4,.25,'#eee1bc',48);cyl(p,0,.7,0,2.8,2.9,.65,'#d0c9a8',40);cyl(p,0,1.05,0,2.5,2.5,.06,'#71b8bd',40);cyl(p,0,1.32,0,.7,.95,.65,'#d9d3af');tree(p,0,0,.85);for(let i=0;i<8;i++){let a=i/8*Math.PI*2;ball(p,Math.cos(a)*2,1.1,Math.sin(a)*2,.075,'#d5f6ec')}},
      vault(p){box(p,0,.2,0,5,.4,4,'#cdc5a0');box(p,0,2.25,0,4.1,4,3.2,'#577a78');box(p,0,2.2,1.68,3.5,3.5,.22,'#76968a');box(p,0,2.2,1.83,2.9,2.95,.1,'#698980');const wheel=cyl(p,0,2.25,2,.65,.65,.18,'#dec99a');wheel.rotation.x=Math.PI/2;beam(p,[-.5,2.25,2.13],[.5,2.25,2.13],.09,'#f1dfb0');beam(p,[0,1.75,2.13],[0,2.75,2.13],.09,'#f1dfb0');box(p,1.2,2.2,2,.18,.85,.15,'#d4bd88');for(let i=0;i<4;i++)cyl(p,1.2,4.36+i*.15,0,.65,.65,.15,'#e9c976');sign(p,'TREASURE',0,3.55,1.97,2.7)},
      tower(p){cyl(p,0,.2,0,2,2.2,.4,'#cdc6a8',8);for(let i=0;i<6;i++){let w=2.8-i*.27,y=.4+i*.85;box(p,0,y+.36,0,w,.72,w,i%2?'#e7dfc3':'#d9d0b0');box(p,0,y+.79,0,w+.2,.12,w+.2,'#e2b556')}cyl(p,0,6.05,0,0,.65,1.2,'#e2b556',4);ball(p,0,6.8,0,.22,'#f6d77a');sign(p,'DENTPHOTO',0,1,1.43,2.5,'#8a6a2a')},
      pier(p){cyl(p,0,.08,0,6,6,.15,'#65afbb',48).scale.z=.72;const rim=mesh(new T.TorusGeometry(6,.16,8,48),'#cdcaaa',p,0,.13,0);rim.rotation.x=Math.PI/2;rim.scale.y=.72;for(let i=0;i<9;i++)box(p,0,.55,-1+i*.5,3,.22,.44,'#b79564');for(const x of [-1.25,1.25])for(const z of [-1,3])cyl(p,x,.65,z,.13,.18,1.5,'#8f7654');box(p,.5,1,1.2,.85,.18,.85,'#ddbf80');beam(p,[-.7,.7,1],[-.6,3.6,3.8],.05,'#604f3b');beam(p,[-.6,3.6,3.8],[-.5,.3,4],.015,'#eaf0d6');ball(p,-.5,.3,4,.14,'#edb474');tree(p,-4,-2,.75);for(let i=0;i<4;i++)ball(p,4-i*.4,.2,-2-i*.5,.42,'#b7b99b')},
      lighthouse(p){cyl(p,0,.25,0,2.8,3.2,.5,'#b0b39d',8);for(let k=0;k<6;k++)cyl(p,0,.55+k*1.1,0,1.1-(k+1)*.05,1.1-k*.05,1.1,k%2?'#f7f1e3':'#c9473b',20);cyl(p,0,7.05,0,1.2,1.2,.15,'#3b4a44');ball(p,0,7.65,0,.47,'#fff3c4');for(let i=0;i<8;i++){let a=i/8*Math.PI*2;cyl(p,Math.sin(a)*.8,7.7,Math.cos(a)*.8,.045,.045,1.2,'#48695e')}cyl(p,0,8.4,0,0,1.15,.9,'#c9473b');box(p,0,.95,1.08,.6,1.25,.1,'#365e58')},
      balloon(p){ball(p,0,5,0,2,'#e2703a');for(let k=-1;k<=1;k++){let r=mesh(new T.TorusGeometry(2*Math.cos(k*.45),.07,8,40),'#f6d77a',p,0,5+2*Math.sin(k*.45),0);r.rotation.x=Math.PI/2}box(p,0,1.9,0,.8,.6,.8,'#8d6a47');for(const x of [-.35,.35])for(const z of [-.35,.35])beam(p,[x,2.2,z],[x*3,3.5,z*3],.025,'#6b5a45')},
      shop(p){box(p,0,.2,0,4.5,.35,3.5,'#dad2ac');box(p,0,1.8,0,4,3.2,2.8,'#dfe5cc');roof(p,0,3.4,0,4.7,3.6,1.2,'#4b8774');for(const x of [-1.5,1.5])cyl(p,x,1.7,1.5,.16,.2,3,'#faf0cf');sign(p,'SHOP',0,3.35,1.87,3.2);box(p,0,1.55,1.45,2.2,1.8,.12,'#789e9e')}
    };
    builders.rosehouse=p=>builders.cottage(p,true);

    window.VillageModels={
      create(name){const root=new T.Group();if(!builders[name])throw new Error('Unknown model: '+name);builders[name](root);root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return root},
      names:Object.keys(builders)
    };
})();
