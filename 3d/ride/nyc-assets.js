/* 블렌더 뉴욕 키트 읽기: nyc/nyc.json(목록) + nyc.bin(위치 · 노멀 · UV · 그늘 색 · 인덱스) + 건물 텍스처.
   3d/ride/blender/nyc_kit.py 가 만든다. load(T) → Promise<{kits, geo(name), tex(name)}>. 실패하면 reject (장면은 원래 모습 그대로). */
(function(root){
 const V='1';   // nyc/ 를 다시 구우면 올린다 (브라우저 캐시)
 function load(T,base='nyc/'){
  const q='?v='+V,get=(f,k)=>fetch(base+f+q).then(r=>{if(!r.ok)throw new Error(f+' '+r.status);return r[k]()});
  return Promise.all([get('nyc.json','json'),get('nyc.bin','arrayBuffer')]).then(([man,bin])=>{
   const geos={},texs={};
   function geo(name){if(geos[name])return geos[name];const e=man.meshes[name];if(!e)return null;const g=new T.BufferGeometry();
    g.setAttribute('position',new T.BufferAttribute(new Float32Array(bin,e.pos[0],e.pos[1]),3));
    g.setAttribute('normal',new T.BufferAttribute(new Float32Array(bin,e.nor[0],e.nor[1]),3));
    g.setAttribute('uv',new T.BufferAttribute(new Float32Array(bin,e.uv[0],e.uv[1]),2));
    if(e.col)g.setAttribute('color',new T.BufferAttribute(new Uint8Array(bin,e.col[0],e.col[1]),3,true));
    g.setIndex(new T.BufferAttribute(e.i32?new Uint32Array(bin,e.idx[0],e.idx[1]):new Uint16Array(bin,e.idx[0],e.idx[1]),1));
    (e.groups||[]).forEach((gr,i)=>g.addGroup(gr[0],gr[1],i));g.computeBoundingSphere();
    g.userData={groups:e.groups?e.groups.map(x=>x[2]):Object.keys(e.mats||{}).slice(0,1),mats:e.mats||{},box:e.box,tris:e.tris};return geos[name]=g}
   // 건물 텍스처: _c 색(그늘 포함) · _m (R 창문 · G 거칠기 · B 금속) · _fc/_fm 먼 층 평판(반복)
   const loader=new T.TextureLoader(),jobs=[];
   for(const st of Object.keys(man.kits))for(const k of ['c','m','fc','fm'])jobs.push(loader.loadAsync(base+st+'_'+k+'.jpg'+q).then(t=>{
    t.colorSpace=k==='c'||k==='fc'?T.SRGBColorSpace:T.NoColorSpace;t.anisotropy=8;if(k[0]==='f')t.wrapS=t.wrapT=T.RepeatWrapping;texs[st+'_'+k]=t}));
   return Promise.all(jobs).then(()=>({kits:man.kits,meshes:man.meshes,geo,tex:n=>texs[n]||null}))})}
 const api={load,V};root.NYC_ASSETS=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
