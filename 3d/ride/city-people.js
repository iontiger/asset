/* 뉴욕 시내 사람들(보도를 걷는 사람 · 횡단보도를 건너는 사람)을 한꺼번에 그린다.
   - 부위 9종(몸통 · 외투 자락 · 머리 · 짧은/긴 머리 · 팔 · 손 · 넓적다리 · 정강이+신발)을 인스턴스로, 관절(엉덩이 · 무릎 · 어깨)을 걸음에 맞춰 돌린다.
   - 처음엔 단순한 모형, 블렌더 사람 키트(nyc/people.json · people.bin — blender/nyc_people.py)가 오면 그 모양(실제 사람 비율 · 굽힌 팔꿈치 · 신발 · 그늘)으로 바꾼다.
   - 바이크에서 멀리 있는 사람은 그리지 않는다(cull). 단위: 몸은 m 로 만들고 1.23 배(게임 단위)로 키운다.
   begin() → person(...) 여러 번 → end(). look() 은 사람 한 명의 옷 · 피부 · 머리 색을 고른다. */
(function(root){
const SKIN=['#f1c7a5','#e0ac85','#c68863','#8d5a3b','#5c3a24','#f5d6bd'],TOP=['#1d1f24','#2f3d55','#7a2e2e','#c9b48a','#3b5b4a','#e8e4da','#5b4a6e','#b65c2b','#30343a','#8a8f96','#6b1f2a','#2b4c6f'],
 LEGC=['#22262c','#34405a','#4a3d33','#1b1c1f','#6b6f75','#3d4f6b'],HAIR=['#1d1612','#3a2a1e','#6b4a2c','#a07a4a','#2b2b2b','#c9c2b8','#5a2f1c'];
const S0=1.23,J={hip:[.092,.93,0],knee:[0,-.45,-.01],shoulder:[.2,1.43,.01]};
// 오른쪽 부위를 거울로 뒤집어 왼쪽을 만든다(삼각형 감기 방향도 뒤집는다)
function mirror(geo){const h=geo.clone();for(const a of ['position','normal']){const v=h.attributes[a];for(let i=0;i<v.count;i++)v.setX(i,-v.getX(i))}
  const ix=h.index;if(ix){const a=ix.array;for(let i=0;i<a.length;i+=3){const t=a[i+1];a[i+1]=a[i+2];a[i+2]=t}}h.computeBoundingSphere();return h}
function look(rnd){const pick=a=>a[Math.floor(rnd()*a.length)];return {top:pick(TOP),leg:pick(LEGC),skin:pick(SKIN),hair:pick(HAIR),long:rnd()<.4,coat:rnd()<.3,h:.94+rnd()*.12,ph:rnd()*6.3}}
function make({T,g,max=140}){
 const white=geo=>{if(!geo.attributes.color)geo.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(geo.attributes.position.count*3).fill(1),3));return geo};
 // 단순 모형(키트가 오기 전) — 같은 관절 기준(m)
 const simple={
  torso:new T.CylinderGeometry(.17,.14,.6,10).scale(1,1,.66).translate(0,1.2,0),coat:new T.CylinderGeometry(.18,.21,.55,10).scale(1,1,.7).translate(0,.83,0),
  head:new T.SphereGeometry(.105,12,10).scale(.9,1.1,1).translate(0,1.66,0),hair_s:new T.SphereGeometry(.11,12,8,0,Math.PI*2,0,Math.PI*.5).translate(0,1.68,.01),hair_l:new T.SphereGeometry(.115,12,8,0,Math.PI*2,0,Math.PI*.7).translate(0,1.67,.02),
  arm:new T.CylinderGeometry(.055,.04,.55,7).translate(0,-.275,0),hand:new T.SphereGeometry(.04,8,6).translate(0,-.58,0),
  thigh:new T.CylinderGeometry(.08,.06,.46,8).translate(0,-.23,0),shin:new T.CylinderGeometry(.055,.045,.45,8).translate(0,-.225,0)};
 for(const k in simple)white(simple[k]);
 const mat=()=>new T.MeshStandardMaterial({color:'#ffffff',roughness:.82,vertexColors:true});
 const NAMES=['torso','coat','head','hair_s','hair_l','armR','armL','handR','handL','thighR','thighL','shinR','shinL'];
 const parts={};
 for(const n of NAMES){const base=n.replace(/[RL]$/,''),geo=n.endsWith('L')?mirror(simple[base]):simple[base];const m=new T.InstancedMesh(geo,mat(),max);m.count=0;m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;m.userData.part=n;g.add(m);parts[n]=m}
 parts.head.material.roughness=parts.handR.material.roughness=parts.handL.material.roughness=.55;
 const dmy=new T.Object3D(),M=new T.Matrix4(),A=new T.Matrix4(),B=new T.Matrix4(),R=new T.Matrix4(),cc=new T.Color(),hidden=new T.Matrix4().makeScale(0,0,0);
 const hipR=new T.Matrix4().makeTranslation(J.hip[0],J.hip[1],J.hip[2]),hipL=new T.Matrix4().makeTranslation(-J.hip[0],J.hip[1],J.hip[2]),knee=new T.Matrix4().makeTranslation(...J.knee),
  shR=new T.Matrix4().makeTranslation(J.shoulder[0],J.shoulder[1],J.shoulder[2]),shL=new T.Matrix4().makeTranslation(-J.shoulder[0],J.shoulder[1],J.shoulder[2]);
 let n=0;
 const set=(k,m,c)=>{parts[k].setMatrixAt(n,m);if(c)parts[k].setColorAt(n,cc.set(c))};
 // x,y,z 발 위치 · ry 바라보는 방향(-Z 가 앞) · ph 걸음 위상 · amt 걸음 크기(0 이면 서 있음) · q=look()
 function person(x,y,z,ry,ph,amt,q,extra){if(n>=max)return;dmy.position.set(x,y,z);dmy.rotation.set(0,ry,0);dmy.scale.setScalar(S0*q.h);dmy.updateMatrix();M.copy(dmy.matrix);
  set('torso',M,q.top);set('head',M,q.skin);
  if(q.coat)set('coat',M,q.top);else set('coat',hidden);
  if(q.long){set('hair_l',M,q.hair);set('hair_s',hidden)}else{set('hair_s',M,q.hair);set('hair_l',hidden)}
  const s=Math.sin(ph),c=Math.cos(ph);
  for(const [side,hip,sh,sg] of [['R',hipR,shR,1],['L',hipL,shL,-1]]){const a=amt*.5*s*sg,kb=-amt*(.12+.7*Math.max(0,c*sg));
   A.copy(M).multiply(hip).multiply(R.makeRotationX(a));set('thigh'+side,A,q.leg);B.copy(A).multiply(knee).multiply(R.makeRotationX(kb));set('shin'+side,B,q.leg);
   const wave=extra&&extra.wave&&side==='R';
   A.copy(M).multiply(sh).multiply(R.makeRotationX(wave?Math.PI*.9:-a*.85+(extra&&extra.armUp?-.4:0)));if(wave)A.multiply(R.makeRotationZ(Math.sin(extra.t*9)*.35));A.multiply(R.makeRotationZ(sg*.05));set('arm'+side,A,q.top);set('hand'+side,A,q.skin)}
  n++}
 function begin(){n=0}
 function end(){for(const k in parts){const m=parts[k];m.count=n;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true}}
 // 블렌더 키트로 바꾸기: geo(name) → BufferGeometry (nyc-assets.js meshes 와 같은 꼴, 꼭짓점 색 = 그늘)
 let kit=false;
 function useKit(geo){const got={};for(const k of ['torso','coat','head','hair_s','hair_l','arm','hand','thigh','shin']){const x=geo(k);if(!x)return false;got[k]=x}
  for(const nm of NAMES){const base=nm.replace(/[RL]$/,''),gg=nm.endsWith('L')?mirror(got[base]):got[base];parts[nm].geometry=gg}kit=true;return true}
 return {person,begin,end,useKit,parts,J,S0,get count(){return n},get kit(){return kit}}}
root.CITY_PEOPLE={make,look,mirror,J,S0};if(typeof module!=='undefined')module.exports={make,look,mirror,J,S0};
})(typeof window!=='undefined'?window:globalThis);
