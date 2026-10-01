/* DentPhoto 마을 — 화면 효과의 '검은 네모' 막기
   일부 PC(특히 맥 GPU)에서 그림자 깊이(GTAO) 계산이 몇몇 점을 숫자가 아닌 값(NaN · 무한대)으로 만든다.
   그 점이 빛 번짐(블룸)의 축소 · 흐림 단계를 지나면 수백 픽셀짜리 검은 네모로 번진다.
   GTAO 와 블룸 사이에 거름 단계를 넣어, 깨진 점은 이웃 점의 평균으로 바꾸고 너무 밝은 값은 눌러 둔다. */
(()=>{
const SHADER={uniforms:{tDiffuse:{value:null}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  // 비트로 본다 — 빠른 계산 모드의 GPU 는 isnan() 을 지워 버리기도 해서
  fragmentShader:`uniform sampler2D tDiffuse;varying vec2 vUv;
  bool bad(vec4 c){return any(equal(floatBitsToUint(c)&uvec4(0x7f800000u),uvec4(0x7f800000u)));}
  void main(){ivec2 p=ivec2(gl_FragCoord.xy),m=textureSize(tDiffuse,0)-1;vec4 c=texelFetch(tDiffuse,clamp(p,ivec2(0),m),0);
    if(!bad(c)){gl_FragColor=min(c,vec4(256.));return;}
    vec4 s=vec4(0.);float n=0.;for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++){vec4 q=texelFetch(tDiffuse,clamp(p+ivec2(i,j),ivec2(0),m),0);if(!bad(q)){s+=min(q,vec4(256.));n+=1.;}}
    gl_FragColor=n>0.?s/n:vec4(0.,0.,0.,1.);}`};
let pass=null;
function add(){if(pass||typeof composer==='undefined'||!composer||!FXA||!FXA.ShaderPass)return;
  pass=new FXA.ShaderPass(SHADER);const i=composer.passes.indexOf(bloomPass);
  if(i>=0)composer.insertPass(pass,i);else{composer.passes.splice(1,0,pass);pass.setSize&&pass.setSize(innerWidth,innerHeight)}}
try{add()}catch(e){console.error(e)}
if(typeof buildComposer==='function'){const _bc=buildComposer;buildComposer=function(){_bc.apply(this,arguments);try{add()}catch(e){console.error(e)}}}
window.dpNanFix={get pass(){return pass}};
})();
