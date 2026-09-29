/* ═══════ 사진 도감 · 포토 스팟 — 마을 명소 10곳에서 사진을 찍으면 앨범에 모인다 ═══════
   스팟마다 📷 표지판. 가까이서 사진 버튼을 누르면 사진 아래 띠에 장소 이름이 찍히고, 작은 사본이 앨범에 저장된다.
   10곳을 모두 찍으면 광장 동북쪽 DentPhoto 사진관이 열리고 벽의 액자 10개에 내 사진이 걸린다. */
'use strict';
(function(){
const KEY='asset-village-3d-photo';let P={shots:{},open:false};try{Object.assign(P,JSON.parse(localStorage.getItem(KEY)||'null')||{})}catch{}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(P))}catch{toast('📷 앨범 저장 공간이 부족해요')}};
const W=(x,z)=>nearestWalkable(x,z)||{x,z};

/* ── 스팟 10곳 ── */
const top=mtnAt(Math.max(0,MTN.len-3)/MTN.len);
const SPOTS=[
  {id:'summit',name:'목표봉 정상',p:{x:top.x,z:top.z},r:12},
  {id:'dock',name:'DentPhoto 선착장',p:window.dpYacht?dpYacht.GATE:W(0,250)},
  {id:'fountain',name:'광장 분수',p:W(0,8)},
  {id:'lake',name:'호수 부두',p:W(LAKE.x,LAKE.z)},
  {id:'mill',name:'풍차 언덕',p:W(MILL.x,MILL.z)},
  {id:'cabin',name:'숲속 오두막',p:W(CABIN.x,CABIN.z)},
  {id:'north',name:'북쪽 전망대',p:W(-18,-316)},
  {id:'dental',name:'DentPhoto 치과',p:window.dpDental?dpDental.DOOR:W(-40,-40)},
  {id:'beach',name:'서쪽 모래사장',p:W(-175,10)},
  {id:'bridge',name:'개울 다리',p:{x:BRIDGE.x,z:BRIDGE.z}},
];
SPOTS.forEach(s=>{s.r=s.r||10;s.x=s.p.x;s.z=s.p.z});
const count=()=>SPOTS.filter(s=>P.shots[s.id]).length;
function spotNow(){if(!walkish())return null;let best=null,bd=1e9;for(const s of SPOTS){const d=Math.hypot(player.x-s.x,player.z-s.z);if(d<s.r&&d<bd){bd=d;best=s}}return best}
window.dpPhotoLabel=()=>{const s=spotNow();return s?'  ·  📍 '+s.name:''};

/* ── 표지판 ── */
function labelTex(t,done){const c=document.createElement('canvas');c.width=512;c.height=112;const x=c.getContext('2d');x.fillStyle=done?'#22675e':'#fffdf6';x.strokeStyle='#22675e';x.lineWidth=6;x.beginPath();x.roundRect?x.roundRect(6,6,500,100,44):x.rect(6,6,500,100);x.fill();x.stroke();x.fillStyle=done?'#fff6d8':'#22675e';x.font='800 46px -apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText((done?'✅ ':'📷 ')+t,256,58,470);const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;return tx}
const postM=new THREE.MeshStandardMaterial({color:'#7a5a3a',roughness:.8}),boardM=new THREE.MeshStandardMaterial({color:'#22675e',roughness:.5});
SPOTS.forEach(s=>{const off=s.id==='bridge'?{x:s.x+BRIDGE.nx*0,z:s.z}:s;const y=terrainHeight(off.x,off.z);const g=new THREE.Group();g.position.set(off.x,y,off.z);g.userData.world=true;scene.add(g);
  if(s.id!=='bridge'&&s.id!=='dock'){const post=new THREE.Mesh(new THREE.CylinderGeometry(.07,.08,1.5,8),postM);post.position.y=.75;post.castShadow=true;g.add(post);const cam=new THREE.Mesh(new THREE.BoxGeometry(.5,.34,.18),boardM);cam.position.y=1.6;g.add(cam);const lens=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.08,14),new THREE.MeshStandardMaterial({color:'#1d1f22',roughness:.3}));lens.rotation.x=Math.PI/2;lens.position.set(0,1.6,.12);g.add(lens)}
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTex(s.name,!!P.shots[s.id]),transparent:true,depthWrite:false,toneMapped:false}));sp.scale.set(3.4,.74,1);sp.position.y=s.id==='bridge'?3.4:2.6;sp.renderOrder=5;g.add(sp);s.g=g;s.sp=sp});
function relabel(s){const old=s.sp.material.map;s.sp.material.map=labelTex(s.name,!!P.shots[s.id]);s.sp.material.needsUpdate=true;old.dispose()}

/* ── 사진 찍기 ── */
function thumb(){const src=renderer.domElement,w=192,h=120,c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d'),sw=src.width,sh=src.height,k=Math.max(w/sw,h/sh),cw=w/k,ch=h/k;x.filter=getComputedStyle(src).filter||'none';x.drawImage(src,(sw-cw)/2,(sh-ch)/2,cw,ch,0,0,w,h);return c.toDataURL('image/jpeg',.72)}
const _tp=takePhoto;takePhoto=function(){const s=spotNow();_tp();if(!s)return;let img='';try{img=thumb()}catch{}
  const first=!P.shots[s.id];P.shots[s.id]={img,at:Date.now()};save();relabel(s);hud();frames();
  if(first){const n=count();setTimeout(()=>{toast(`📷 ${s.name} — 포토 스팟 ${n} / ${SPOTS.length}`,'gem');try{if(playLoud())[880,1175].forEach((f,i)=>tone(f,i*.1,.12,'triangle',.04))}catch{}},900);if(n>=SPOTS.length&&!P.open){P.open=true;save();setTimeout(openShow,2200)}}};
$('#photoBtn').onclick=()=>takePhoto();

/* ── DentPhoto 사진관 ── */
const spot=findSpot(46,-38,9);ATTRACT.push(spot);
const q=Math.round(Math.atan2(-spot.x,-spot.z)/(Math.PI/2))*(Math.PI/2),fx=Math.round(Math.sin(q)),fz=Math.round(Math.cos(q));
const gy=terrainHeight(spot.x,spot.z),G=new THREE.Group();G.position.set(spot.x,gy,spot.z);G.rotation.y=q;G.userData.world=true;scene.add(G);
const BW=10.4,BD=6;
box(G,0,-.55,0,BW+.6,1.2,BD+.6,'#e3dccb');box(G,0,2.3,-BD/2+.3,BW,4.6,.6,'#f4efe4');box(G,0,4.75,-.2,BW+.8,.3,BD+1.2,'#c65a4e');box(G,0,4.95,-.2,BW-1,.22,BD-.2,'#d97b6c');
for(const sx of [-1,1])for(const sz of [.5,-.3]){cyl(G,sx*(BW/2-.3),2.3,sz*BD/1.1,.2,.24,4.6,'#fbf8ef',12)}
const nameSign=sign(G,'🖼 DentPhoto 사진관',0,5.4,BD/2-.2,6.2,'#ffffff','#c65a4e');
const ribbon=box(G,0,1.1,BD/2-.2,BW-.8,.14,.06,'#e0483e');
const lotSign=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthWrite:false}));lotSign.scale.set(4.2,.92,1);lotSign.position.set(0,2.2,BD/2);G.add(lotSign);
const FR=[];for(let r=0;r<2;r++)for(let c=0;c<5;c++){const fg=new THREE.Group();fg.position.set(-3.9+c*1.95,3.25-r*1.55,-BD/2+.62);G.add(fg);box(fg,0,0,0,1.7,1.16,.08,'#b88a3e');const pic=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.94),new THREE.MeshBasicMaterial({color:'#ece6d6'}));pic.position.z=.05;fg.add(pic);FR.push(pic)}
{const ow=fx?BD:BW,od=fx?BW:BD,bx=spot.x-fx*1.2,bz=spot.z-fz*1.2;obstacles.push({x:bx,z:bz,w:(fx?ow-2.4:ow)+.6,d:(fx?od:od-2.4)+.6,world:true})}
const texCache={};
function frames(){const open=P.open;ribbon.visible=!open;lotSign.visible=!open;if(!open){const old=lotSign.material.map;lotSign.material.map=labelTex(`준비 중 · 포토 스팟 ${count()}/${SPOTS.length}`,false);lotSign.material.needsUpdate=true;if(old)old.dispose()}
  SPOTS.forEach((s,i)=>{const pic=FR[i],sh=P.shots[s.id];if(open&&sh&&sh.img){if(texCache[s.id]!==sh.at){texCache[s.id]=sh.at;new THREE.TextureLoader().load(sh.img,t=>{t.colorSpace=THREE.SRGBColorSpace;if(pic.material.map)pic.material.map.dispose();pic.material.map=t;pic.material.color.set('#ffffff');pic.material.needsUpdate=true})}}else{pic.material.color.set(open?'#ece6d6':'#d9cfb8')}})}
frames();
const GALLERY=W(spot.x+fx*(BD/2+2.5),spot.z+fz*(BD/2+2.5));
function openShow(){celebrate();try{gameFireworks(spot.x,gy+6,spot.z,9,12,20,1.3)}catch{}frames();toast('🖼 포토 스팟 10곳 완성! DentPhoto 사진관이 열렸어요','gem');
  setTimeout(()=>{if(!window.dpGame)return;dpGame.showModal('<div class="eyebrow">GALLERY OPEN</div><h2>🖼 사진관이 열렸어요!</h2><p>마을 명소 10곳을 모두 찍었어요. 광장 동북쪽 <b>DentPhoto 사진관</b> 벽에 내 사진 10장이 걸렸어요.</p><div class="gm-actions"><button data-act="close">나중에</button><button class="primary" data-act="gallery">사진관으로</button></div>');const b=document.querySelector('.game-modal [data-act=gallery]');if(b)b.onclick=()=>{dpGame.closeModal();goGallery()}},4500)}
function goGallery(){if(PLAY.mode)endPlay();beginWalk(true);travelTo(GALLERY,null)}

/* ── 앨범 · 미니게임판 ── */
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function album(){const n=count();dpGame.showModal(`<div class="eyebrow">PHOTO ALBUM</div><h2>📷 포토 스팟 ${n} / ${SPOTS.length}</h2><p class="pa-note">📷 표지판 가까이에서 사진 버튼을 누르면 앨범에 모여요. ${P.open?'사진관이 열려 있어요!':'10곳을 모두 찍으면 사진관이 열려요.'}</p><div class="pa-grid">${SPOTS.map(s=>{const sh=P.shots[s.id];return `<div class="pa-cell${sh?' on':''}">${sh&&sh.img?`<img src="${sh.img}" alt="">`:'<i>📷</i>'}<span>${esc(s.name)}</span></div>`}).join('')}</div><div class="gm-actions"><button data-act="close">닫기</button>${P.open?'<button class="primary" data-act="gallery">사진관으로</button>':''}</div>`);const b=document.querySelector('.game-modal [data-act=gallery]');if(b)b.onclick=()=>{dpGame.closeModal();goGallery()}}
$('#ghTip').insertAdjacentHTML('beforebegin','<div class="gh-row" id="ghPhotoRow"><span><b>📷 포토 스팟</b><small id="ghPhoto"></small></span><button class="gh-btn soft" id="ghPhotoBtn">앨범</button></div>');
$('#ghPhotoBtn').onclick=album;
function hud(){const el=$('#ghPhoto');if(el)el.textContent=`${count()} / ${SPOTS.length}곳 찍었어요`+(P.open?' · 사진관 열림':'')}
hud();

let was=null,told={};
const _ue=updateExtras;updateExtras=function(dt){_ue(dt);try{
  const s=spotNow();if(s!==was){was=s;if(s&&!told[s.id]){told[s.id]=1;toast(P.shots[s.id]?`📷 ${s.name} — 이미 앨범에 있어요 (다시 찍으면 바뀌어요)`:`📷 포토 스팟 ${s.name} — 사진 버튼을 눌러 찍어요`)}$('#photoBtn').classList.toggle('spot',!!s&&!P.shots[s.id])}
  {const w=walkish();SPOTS.forEach(s=>{s.sp.visible=w&&Math.hypot(camera.position.x-s.x,camera.position.z-s.z)<55})}
  }catch(e){console.error(e)}};
window.dpPhoto={SPOTS,P,album,spotNow,count,open:openShow,frames,GALLERY,save};
})();
