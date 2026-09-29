/* ═══════ 밤하늘 — 별똥별 · 소원 · 반딧불이 · 겨울밤 오로라 ═══════
   밤(FX.day<.35)이면 7~15초마다 별똥별이 떨어진다. 걷는 중이면 가끔 "소원을 빌어 보세요" — 주인공 머리 위에 ✨, 반딧불이가 모여든다.
   겨울밤에는 북쪽 하늘에 초록 · 보라 오로라 커튼이 일렁인다. 요트는 늘 봄 한낮이라 보이지 않는다. */
'use strict';
(function(){
const dayv=()=>typeof FX!=='undefined'?FX.day:1;
const hero=()=>characterGroups.find(c=>c.root.visible)||null;
const add=THREE.AdditiveBlending;

/* ── 별똥별 — 머리 스프라이트 + 꼬리 스프라이트 줄 ── */
const TAIL=16,star={on:false,t:0,d:1,a:new THREE.Vector3(),b:new THREE.Vector3(),parts:[]};
for(let i=0;i<TAIL;i++){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:i?'#bfe3ff':'#ffffff',transparent:true,depthWrite:false,blending:add,fog:false}));sp.visible=false;sp.renderOrder=2;scene.add(sp);star.parts.push(sp)}
let nextStar=4,wishes=0;
const _v=new THREE.Vector3();
function launch(){const c=camera.position,a=Math.random()*Math.PI*2,R=260,el=.35+Math.random()*.35;
  star.a.set(c.x+Math.sin(a)*R*Math.cos(el),c.y+R*Math.sin(el),c.z+Math.cos(a)*R*Math.cos(el));
  const side=a+(Math.random()<.5?1:-1)*(.5+Math.random()*.4);star.b.set(c.x+Math.sin(side)*R*Math.cos(el-.18),c.y+R*Math.sin(el-.18),c.z+Math.cos(side)*R*Math.cos(el-.18));
  Object.assign(star,{on:true,t:0,d:.9+Math.random()*.5});star.parts.forEach(p=>p.visible=true);
  if(walkish()&&!inputBusy()&&(wishes===0||Math.random()<.45))setTimeout(wish,650)}
function starTick(dt){if(!star.on)return;star.t+=dt;const f=star.t/star.d;if(f>=1.25){star.on=false;star.parts.forEach(p=>p.visible=false);return}
  const fade=Math.min(1,f*5)*Math.max(0,Math.min(1,(1.25-f)*4));
  star.parts.forEach((p,i)=>{const k=Math.max(0,Math.min(1,f-i*.018));_v.lerpVectors(star.a,star.b,k);p.position.copy(_v);const s=(i?6*(1-i/TAIL):9);p.scale.setScalar(s);p.material.opacity=fade*(i?.85*(1-i/TAIL):1)})}

/* ── 소원 · 반딧불이 ── */
const FN=36,fpos=new Float32Array(FN*3),fly=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({map:dotTex,color:'#e6ff8a',size:.42,transparent:true,opacity:0,depthWrite:false,blending:add,fog:false}));
fly.geometry.setAttribute('position',new THREE.BufferAttribute(fpos,3));fly.frustumCulled=false;fly.visible=false;scene.add(fly);
const FS=[...Array(FN)].map(()=>({a:Math.random()*6.3,h:Math.random()*1.6+.3,s:.4+Math.random()*.9,p:Math.random()*6.3,r:4+Math.random()*4}));
const F={t:0,on:false,dur:10};
function wish(){wishes++;const h=hero();toast('🌠 별똥별이에요! 소원을 빌어 보세요');if(h){emote(h,'✨ 소원');setTimeout(()=>{try{emote(h,'heart')}catch{}},1800)}
  try{if(playLoud())[1568,1976,2637].forEach((f,i)=>tone(f,i*.12,.25,'sine',.025))}catch{}F.on=true;F.t=0;fly.visible=true}
function flyTick(dt){if(!F.on)return;F.t+=dt;const k=F.t/F.dur;if(k>=1){F.on=false;fly.visible=false;fly.material.opacity=0;return}
  fly.material.opacity=Math.min(1,F.t*.8)*Math.min(1,(1-k)*5)*(.75+.25*Math.sin(time*9));const gather=Math.min(1,F.t/3.2),px=player.x,pz=player.z,py=terrainHeight(px,pz);
  FS.forEach((s,i)=>{s.a+=dt*s.s*(1+gather);const r=s.r*(1-gather)+ (1.1+.5*Math.sin(time*1.3+s.p))*gather;fpos[i*3]=px+Math.cos(s.a)*r;fpos[i*3+1]=py+s.h+.9*gather+.35*Math.sin(time*2.1+s.p);fpos[i*3+2]=pz+Math.sin(s.a)*r});
  fly.geometry.attributes.position.needsUpdate=true}

/* ── 오로라 — 북쪽 하늘의 일렁이는 커튼 (카메라를 따라간다) ── */
const AU={uT:{value:0},uA:{value:0}};
const auMat=new THREE.ShaderMaterial({uniforms:AU,transparent:true,depthWrite:false,blending:add,side:THREE.DoubleSide,fog:false,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.z+=sin(p.x*.012+uv.y*1.3)*38.;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
  fragmentShader:`uniform float uT,uA;varying vec2 vUv;
  float n(float x){return sin(x)*.5+.5;}
  void main(){float x=vUv.x;float band=n(x*17.+uT*.35+sin(x*5.-uT*.2)*2.)*.6+n(x*43.-uT*.8)*.4;
    float ray=pow(n(x*140.+sin(x*9.+uT*.3)*6.),3.)*.55+.45;
    float y=vUv.y;float body=smoothstep(0.,.18,y)*(1.-smoothstep(.35,1.,y));
    vec3 c=mix(vec3(.15,1.,.55),vec3(.55,.35,1.),smoothstep(.35,.95,y));
    float edge=smoothstep(0.,.12,x)*(1.-smoothstep(.88,1.,x));
    gl_FragColor=vec4(c*band*ray*body*edge*uA*1.25,1.);}`});
const aur=new THREE.Group();aur.visible=false;scene.add(aur);
[[0,0,0],[-120,40,-.25],[150,-30,.3]].forEach(([x,z,ry],i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(520,110,64,1),auMat);m.position.set(x,90+i*14,-330+z);m.rotation.y=ry;m.frustumCulled=false;m.renderOrder=-1;aur.add(m)});

const _ue=updateExtras;updateExtras=function(dt){_ue(dt);try{
  const d=dayv(),night=Math.max(0,Math.min(1,(.35-d)/.25)),yacht=cameraMode==='yacht';
  if(night>0&&!yacht&&!document.hidden){if((nextStar-=dt)<=0){nextStar=7+Math.random()*8;if(!star.on)launch()}}else nextStar=Math.min(nextStar,4);
  starTick(dt);flyTick(dt);
  const winter=seasonOf()==='winter',want=winter&&!yacht?night:0;AU.uA.value+=(want-AU.uA.value)*Math.min(1,dt*.6);
  aur.visible=AU.uA.value>.01;if(aur.visible){AU.uT.value=time%1000;aur.position.set(camera.position.x,0,camera.position.z)}
  }catch(e){console.error(e)}};
window.dpSky={launch,wish,star,F,AU,aur};
})();
