/* 뉴욕 시내 고화질 후처리: 구석 그늘(GTAO) · 불빛 번짐(블룸) · 색 보정(대비 · 채도 · 그늘은 차게 · 빛은 따뜻하게 · 비네트 · 필름 결).
   vendor/three-addons.js (three.js r160 EffectComposer · GTAOPass · UnrealBloomPass · OutputPass, MIT) 를 쓴다.
   PC 는 기본으로 켜고, 폰(터치) · ?q=low 는 끈다(?q=high 로 강제). 시내에서 프레임이 계속 떨어지면 GTAO → 후처리 순서로 스스로 끈다. */
(function(root){
const Grade={uniforms:{tDiffuse:{value:null},uTime:{value:0},uVig:{value:.32},uNight:{value:0}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`uniform sampler2D tDiffuse;uniform float uTime;uniform float uVig;uniform float uNight;varying vec2 vUv;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233))+uTime)*43758.5453);}
void main(){vec4 s=texture2D(tDiffuse,vUv);vec3 c=s.rgb;float l=dot(c,vec3(.2126,.7152,.0722));
 c=mix(vec3(l),c,1.06-.12*uNight);                                           // 채도 (밤엔 조금 뺀다)
 vec3 cool=vec3(.93,.98,1.06),warm=vec3(1.05,1.,.93);c*=mix(cool,warm,smoothstep(.05,.6,l));   // 그늘은 차게, 빛은 따뜻하게
 vec3 cc=clamp(c,0.,1.);c+=(cc*cc*(3.-2.*cc)-cc)*.12;                         // 살짝 S 커브 (1 넘는 밝은 빛은 그대로 — 넘긴 값에 걸면 음수가 돼 색이 뒤집힌다)
 vec2 d=vUv-.5;c*=1.-dot(d,d)*uVig;c+=(h(vUv*731.)-.5)*.012;                 // 비네트 · 필름 결
 gl_FragColor=vec4(c,s.a);}`};
// 아주 밝은 점(가로등 바로 앞 표지판 등)이 반정밀도 버퍼에서 넘치거나 NaN(GTAO 깊이 경계 등)이 되면 블룸이 번져 색이 뒤집힌다 — 먼저 잘라 둔다
const Clamp={uniforms:{tDiffuse:{value:null}},vertexShader:Grade.vertexShader,
 fragmentShader:`uniform sampler2D tDiffuse;varying vec2 vUv;void main(){vec4 s=texture2D(tDiffuse,vUv);vec3 c=s.rgb;if(!(c.r==c.r&&c.g==c.g&&c.b==c.b))c=vec3(0.);gl_FragColor=vec4(clamp(c,0.,24.),s.a);}`};
function quality(){const q=(location.search.match(/[?&]q=(\w+)/)||[])[1];if(q==='high')return 'high';if(q==='low')return 'low';
 const touch=matchMedia&&matchMedia('(pointer:coarse)').matches;return touch?'low':'high'}
function make(renderer,scene,camera,opt={}){const adaptive=opt.adaptive!==false;const ADD=root.THREE_ADDONS;if(!ADD||!ADD.EffectComposer)return null;const T=root.THREE;
 const pr=renderer.getPixelRatio(),rt=new T.WebGLRenderTarget(innerWidth*pr,innerHeight*pr,{type:T.HalfFloatType,samples:renderer.capabilities.isWebGL2?4:0});
 const composer=new ADD.EffectComposer(renderer,rt);composer.setPixelRatio(pr);composer.setSize(innerWidth,innerHeight);composer.addPass(new ADD.RenderPass(scene,camera));
 let gtao=null;try{gtao=new ADD.GTAOPass(scene,camera,innerWidth,innerHeight);const gs=gtao.setSize.bind(gtao);gtao.setSize=(w,h)=>gs(Math.max(1,Math.round(w*.55)),Math.max(1,Math.round(h*.55)));gtao.setSize(innerWidth*pr,innerHeight*pr);
  gtao.updateGtaoMaterial({radius:1.6,distanceExponent:1.5,thickness:2.2,scale:1.15,samples:12,distanceFallOff:1,screenSpaceRadius:false});gtao.updatePdMaterial({lumaPhi:10,depthPhi:2,normalPhi:3,radius:5,rings:2,samples:10});gtao.blendIntensity=.85;
  // 빛 번짐 · 비 · 눈 · 이름표 · 반투명은 그늘 계산에서 뺀다
  gtao.overrideVisibility=function(){const c=this._visibilityCache;this.scene.traverse(o=>{c.set(o,o.visible);if(o.isPoints||o.isLine||o.isSprite||o.userData.noAO||(o.material&&!Array.isArray(o.material)&&o.material.transparent))o.visible=false})};
  composer.addPass(gtao)}catch(e){console.warn('GTAO off',e);gtao=null}
 composer.addPass(new ADD.ShaderPass(Clamp));   // GTAO 뒤 · 블룸 앞 (GTAO 가 깊이 경계에서 NaN 을 낼 때도 막는다)
 const bloom=new ADD.UnrealBloomPass(new T.Vector2(innerWidth,innerHeight),.22,.5,1.1);composer.addPass(bloom);
 const grade=new ADD.ShaderPass(Grade);composer.addPass(grade);composer.addPass(new ADD.OutputPass());
 let on=true,slow=0,acc=0,frames=0;
 return {composer,gtao,bloom,grade,
  get on(){return on},
  render(dt,env){const d=env?env.dark:0;bloom.threshold=1.1-.25*d;bloom.strength=.18+.22*d+(env?env.rain*.1:0);bloom.radius=.4+.15*d;grade.uniforms.uNight.value=d;grade.uniforms.uTime.value=(grade.uniforms.uTime.value+dt)%100;
   if(gtao)gtao.blendIntensity=.85*(1-.5*d);composer.render(dt);
   // 3초마다 평균 프레임을 보고 느리면 단계적으로 끈다
   if(adaptive){acc+=dt;frames++}if(acc>3){const fps=frames/acc;acc=0;frames=0;if(fps<32){slow++;if(slow>=2){if(gtao&&gtao.enabled){gtao.enabled=false;slow=0;console.info('NYC post: GTAO off',fps.toFixed(0))}else{on=false;console.info('NYC post: off',fps.toFixed(0))}}}else slow=0}},
  setSize(){const p=renderer.getPixelRatio();composer.setPixelRatio(p);composer.setSize(innerWidth,innerHeight)}}}
const api={make,quality,Grade};root.RIDE_POST=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
