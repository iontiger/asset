/* 블렌더 뉴욕 키트 읽기: nyc/nyc.json(목록) + nyc.bin(위치 · 노멀 · UV · 그늘 색 · 인덱스) + 건물 텍스처.
   3d/ride/blender/nyc_kit.py 가 만든다. load(T) → Promise<{kits, geo(name), tex(name)}>. 실패하면 reject (장면은 원래 모습 그대로). */
(function(root){
 const V='4';   // nyc/ 를 다시 구우면 올린다 (브라우저 캐시)
 // nyc.json/people.json 의 메시 목록 → name 으로 BufferGeometry (한 번 만든 것은 다시 씀)
 function geoFrom(T,man,bin){const geos={};return function geo(name){if(geos[name])return geos[name];const e=man.meshes[name];if(!e)return null;const g=new T.BufferGeometry();
    g.setAttribute('position',new T.BufferAttribute(new Float32Array(bin,e.pos[0],e.pos[1]),3));
    g.setAttribute('normal',new T.BufferAttribute(new Float32Array(bin,e.nor[0],e.nor[1]),3));
    g.setAttribute('uv',new T.BufferAttribute(new Float32Array(bin,e.uv[0],e.uv[1]),2));
    if(e.col)g.setAttribute('color',new T.BufferAttribute(new Uint8Array(bin,e.col[0],e.col[1]),3,true));
    g.setIndex(new T.BufferAttribute(e.i32?new Uint32Array(bin,e.idx[0],e.idx[1]):new Uint16Array(bin,e.idx[0],e.idx[1]),1));
    (e.groups||[]).forEach((gr,i)=>g.addGroup(gr[0],gr[1],i));g.computeBoundingSphere();
    g.userData={groups:e.groups?e.groups.map(x=>x[2]):Object.keys(e.mats||{}).slice(0,1),mats:e.mats||{},box:e.box,tris:e.tris};return geos[name]=g}}
 // 블렌더 사람 키트 (people.json · people.bin — blender/nyc_people.py) → Promise<geo(name)>
 function loadPeople(T,base='nyc/'){const q='?v='+V,get=(f,k)=>fetch(base+f+q).then(r=>{if(!r.ok)throw new Error(f+' '+r.status);return r[k]()});
  return Promise.all([get('people.json','json'),get('people.bin','arrayBuffer')]).then(([man,bin])=>geoFrom(T,man,bin))}
 // small: 폰(저화질)은 절반 크기 텍스처(nyc/s/ — blender/nyc_small.py)를 받고 도시 HDRI(1.5 MB)는 건너뛴다
 function load(T,base='nyc/',opt={}){const tb=base+(opt.small?'s/':'');
  const q='?v='+V,get=(f,k)=>fetch(base+f+q).then(r=>{if(!r.ok)throw new Error(f+' '+r.status);return r[k]()});
  return Promise.all([get('nyc.json','json'),get('nyc.bin','arrayBuffer')]).then(([man,bin])=>{
   const texs={},geo=geoFrom(T,man,bin);
   // 건물 텍스처: _c 색(그늘 포함) · _m (R 창문 · G 거칠기 · B 금속) · _n 노멀 · _fc/_fm/_fn 먼 층 평판(반복)
   // 바닥: asphalt_c/_n · walk_c/_n (실사 자갈 스캔에서 만든 아스팔트 · 콘크리트, 반복) · city_1k.hdr 도시 하늘빛(반사 · 조명)
   const loader=new T.TextureLoader(),jobs=[],aniso=8;
   const tx=(name,srgb,rep)=>jobs.push(loader.loadAsync(tb+name+'.jpg'+q).then(t=>{t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;t.anisotropy=aniso;if(rep)t.wrapS=t.wrapT=T.RepeatWrapping;texs[name]=t},()=>{}));
   for(const st of Object.keys(man.kits))for(const k of ['c','m','n','fc','fm','fn'])tx(st+'_'+k,k==='c'||k==='fc',k[0]==='f');
   for(const k of ['asphalt','walk']){tx(k+'_c',true,true);tx(k+'_n',false,true)}
   let hdr=null;if(root.dpRGBELoader&&!opt.small)jobs.push(new root.dpRGBELoader().loadAsync(base+'city_1k.hdr'+q).then(t=>{t.mapping=T.EquirectangularReflectionMapping;hdr=t},()=>{}));
   return Promise.all(jobs).then(()=>({kits:man.kits,meshes:man.meshes,geo,tex:n=>texs[n]||null,hdr:()=>hdr}))})}
 const api={load,loadPeople,V};root.NYC_ASSETS=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
