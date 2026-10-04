/* 비 온 뒤 물웅덩이: 아스팔트 재질(asMat)에 웅덩이 자국을 섞고, 고화질(PC)에서는 길바닥 아래로 뒤집은 카메라로 장면을 한 번 더 그려
   웅덩이 · 젖은 길에 전광판 · 신호등 · 차 불빛 · 빌딩이 거꾸로 비친다(비가 오면 빗방울 물결로 흔들린다).
   - 웅덩이는 젖은 정도(E.wet)에 따라 커지고 마르면 사라진다. 저화질은 하늘빛(HDRI) 반사만.
   - render() 는 game.js 가 화면을 그리기 직전에 부른다(시내가 보이고 젖었을 때만 반사 장면을 반 해상도로 그림). */
(function(root){
function attach({T,mat,Y}){
 const U={uWet:{value:0},uRain:{value:0},uTime:{value:0},uRefl:{value:null},uReflMat:{value:new T.Matrix4()},uReflOn:{value:0}};
 mat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWetP;').replace('#include <begin_vertex>','#include <begin_vertex>\nvWetP=(modelMatrix*vec4(transformed,1.)).xyz;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vWetP;uniform float uWet;uniform float uRain;uniform float uTime;uniform sampler2D uRefl;uniform mat4 uReflMat;uniform float uReflOn;
float wh(vec2 i){return fract(sin(dot(i,vec2(127.1,311.7)))*43758.5453);}
float wn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(wh(i),wh(i+vec2(1,0)),f.x),mix(wh(i+vec2(0,1)),wh(i+vec2(1,1)),f.x),f.y);}
float puddle(vec2 p){float n=wn(p*.085)*.6+wn(p*.21+7.)*.28+wn(p*.8+3.)*.12;return smoothstep(.74-.15*uWet,.77-.15*uWet,n)*step(.05,uWet);}`)
   .replace('#include <map_fragment>','#include <map_fragment>\nfloat pud=puddle(vWetP.xz);diffuseColor.rgb*=mix(1.,.42,pud);')
   .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.04,pud);')
   .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=normalize(mix(normal,nonPerturbedNormal,pud));')
   .replace('#include <opaque_fragment>',`#include <opaque_fragment>
if(uReflOn>.5&&uWet>.05){vec2 rip=vec2(0.);
 if(uRain>.05){vec2 c=floor(vWetP.xz*1.2),f=fract(vWetP.xz*1.2)-.5;float ph=fract(uTime*1.1+wh(c)),r=length(f);rip=f/(r+1e-3)*sin((r-ph*.55)*38.)*exp(-r*7.)*(1.-ph)*.014*uRain;}   // 빗방울 물결
 vec4 rp=uReflMat*vec4(vWetP,1.);vec3 V=normalize(cameraPosition-vWetP);float fr=.08+.92*pow(1.-max(V.y,0.),5.);
 float k=pud*mix(.45,1.,fr)+(1.-pud)*uWet*.16*fr;   // 웅덩이는 거울처럼, 젖은 아스팔트는 은은하게(결을 따라 흐리게)
 vec2 ruv=rp.xy/rp.w+rip+(1.-pud)*(normal.xy*.025);vec3 rc=texture2D(uRefl,ruv).rgb;if(pud<.5)rc=(rc+texture2D(uRefl,ruv+vec2(.007,0)).rgb+texture2D(uRefl,ruv-vec2(.007,0)).rgb+texture2D(uRefl,ruv+vec2(0,.016)).rgb)*.25;
 gl_FragColor.rgb=mix(gl_FragColor.rgb,rc,clamp(k,0.,.92));}`)};
 mat.customProgramCacheKey=()=>'nyc-wet';mat.needsUpdate=true;
 // 반사 카메라(three.js Reflector 와 같은 방법: 길 평면에 거울로 뒤집고, 평면 아래는 비스듬한 자르기 면으로 잘라 낸다)
 const vcam=new T.PerspectiveCamera(),plane=new T.Plane(),clip=new T.Vector4(),q=new T.Vector4(),N=new T.Vector3(0,1,0),P0=new T.Vector3(0,Y,0),
  cw=new T.Vector3(),rot=new T.Matrix4(),look=new T.Vector3(),view=new T.Vector3(),tgt=new T.Vector3(),size=new T.Vector2();
 let rt=null,on=false;
 function setEnv(E,time){U.uWet.value=E?E.wet:0;U.uRain.value=E?E.rain:0;U.uTime.value=time}
 function render(renderer,scene,camera,want){on=!!want&&U.uWet.value>.05;U.uReflOn.value=0;if(!on)return false;
  cw.setFromMatrixPosition(camera.matrixWorld);view.subVectors(P0.set(cw.x,Y,cw.z),cw);if(view.dot(N)>0)return false;
  renderer.getDrawingBufferSize(size);const w=Math.max(2,Math.round(size.x*.5)),h=Math.max(2,Math.round(size.y*.5));
  if(!rt){rt=new T.WebGLRenderTarget(w,h,{type:T.HalfFloatType});rt.texture.generateMipmaps=false;U.uRefl.value=rt.texture}else if(rt.width!==w||rt.height!==h)rt.setSize(w,h);
  view.reflect(N).negate().add(P0);rot.extractRotation(camera.matrixWorld);look.set(0,0,-1).applyMatrix4(rot).add(cw);tgt.subVectors(P0,look).reflect(N).negate().add(P0);
  vcam.position.copy(view);vcam.up.set(0,1,0).applyMatrix4(rot).reflect(N);vcam.lookAt(tgt);vcam.far=camera.far;vcam.near=camera.near;vcam.updateMatrixWorld();vcam.projectionMatrix.copy(camera.projectionMatrix);
  U.uReflMat.value.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(vcam.projectionMatrix).multiply(vcam.matrixWorldInverse);
  plane.setFromNormalAndCoplanarPoint(N,P0).applyMatrix4(vcam.matrixWorldInverse);clip.set(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant);
  const e=vcam.projectionMatrix.elements;q.set((Math.sign(clip.x)+e[8])/e[0],(Math.sign(clip.y)+e[9])/e[5],-1,(1+e[10])/e[14]);clip.multiplyScalar(2/clip.dot(q));e[2]=clip.x;e[6]=clip.y;e[10]=clip.z+1-.003;e[14]=clip.w;
  const vis=mat.visible,sm=renderer.shadowMap.autoUpdate,prevRT=renderer.getRenderTarget();mat.visible=false;renderer.shadowMap.autoUpdate=false;
  renderer.setRenderTarget(rt);renderer.clear();renderer.render(scene,vcam);renderer.setRenderTarget(prevRT);mat.visible=vis;renderer.shadowMap.autoUpdate=sm;U.uReflOn.value=1;return true}
 return {U,setEnv,render,get on(){return on}}}
root.CITY_WET={attach};if(typeof module!=='undefined')module.exports={attach};
})(typeof window!=='undefined'?window:globalThis);
