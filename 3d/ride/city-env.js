/* 뉴욕 시내의 시간 · 계절 · 날씨 — 시내 길 진행도 p(0 입구 → 1 출구)만으로 정해지는 순수 함수.
   - 시간: 입구 정오 12:00 → 자정(p .5) → 출구 다음 날 정오. 24시간이 한 바퀴 돈다.
   - 계절: 봄(벚꽃) → 여름(밤 폭우 · 번개) → 가을(낙엽) → 겨울(아침 폭설 · 눈 덮인 길). 출구 끝에서 눈이 녹아 원래 길로.
   렌더러(game.js · city-scene.js)는 이 값으로 하늘 · 안개 · 해/달 · 창문 불빛 · 비/눈 · 가로수 색을 바꾼다. */
(function(root){
 const clamp=x=>Math.max(0,Math.min(1,x)),ss=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
 const bump=(p,a,b,c,d)=>ss(a,b,p)*(1-ss(c,d,p));
 const SEASONS=[{key:'spring',name:'봄',icon:'🌸'},{key:'summer',name:'여름',icon:'☀️'},{key:'autumn',name:'가을',icon:'🍂'},{key:'winter',name:'겨울',icon:'❄️'}];
 const RAIN=[.29,.33,.43,.47],SNOW=[.79,.83,.92,.95];
 // 색 (#rrggbb → [r,g,b] 0..1) 과 섞기
 const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255),mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t),css=c=>'#'+c.map(v=>Math.round(clamp(v)*255).toString(16).padStart(2,'0')).join('');
 const SKY={spring:hex('#b9d3e6'),summer:hex('#8cc4ee'),autumn:hex('#c8d2db'),winter:hex('#d3dbe3'),dusk:hex('#f0a477'),night:hex('#0c1428'),storm:hex('#56606c'),stormN:hex('#141a23'),snow:hex('#c6ced7'),snowN:hex('#2a3242')};
 const LEAF={spring:hex('#f2b6c8'),summer:hex('#4d8a3c'),autumn:hex('#d9782a'),winter:hex('#e6edf2')};
 function seasonAt(p){const q=Math.min(3.999,Math.max(0,p*4));return {i:Math.floor(q),f:q-Math.floor(q)}}
 // 계절 경계 앞뒤 6% 안에서 부드럽게 섞는다
 function seasonMix(p,table){const q=Math.min(3.999,Math.max(0,p*4)),i=Math.floor(q),f=q-i,k=SEASONS[i].key;let c=table[k];
  if(f>.88&&i<3)c=mix(c,table[SEASONS[i+1].key],ss(.88,1,f));return c}
 function env(p){p=clamp(p);
  // 한낮 · 해 질 녘은 천천히, 한밤은 빨리 지나가게 시간을 조금 휘어 쓴다 (밤이 시내 길의 3할쯤)
  const w=p-.45*Math.sin(2*Math.PI*p)/(2*Math.PI),hour=(12+24*w)%24,ang=2*Math.PI*hour/24,elev=-Math.cos(ang),az=ang;   // elev: 정오 1, 자정 -1
  const dark=ss(.18,-.22,elev),dusk=Math.exp(-(((elev-.02)/.16)**2));
  const si=seasonAt(p).i,season=SEASONS[si];
  const rain=bump(p,...RAIN),snow=bump(p,...SNOW),wet=bump(p,.29,.33,.52,.58);
  const snowCover=ss(.79,.86,p)*(1-ss(.965,.995,p));
  const petals=1-ss(.2,.25,p),leaves=bump(p,.51,.55,.72,.76);
  let sky=seasonMix(p,SKY);sky=mix(sky,SKY.dusk,dusk*.75*(1-dark*.6));sky=mix(sky,SKY.night,dark);
  sky=mix(sky,mix(SKY.storm,SKY.stormN,dark),rain*.85);sky=mix(sky,mix(SKY.snow,SKY.snowN,dark),snow*.9);
  const fog=mix(sky,hex('#ffffff'),.12*(1-dark));
  const fogNear=70-38*rain-50*snow,fogFar=430-150*dark*(1-rain)-250*rain-330*snow;
  const weather=Math.max(rain,snow),daylight=1-dark;
  const sunCol=mix(mix(hex('#fff0cf'),hex('#ffb070'),dusk),hex('#9fb6ff'),dark);
  return {p,hour,elev,az,dark,dusk,season:season.key,seasonName:season.name,icon:season.icon,seasonIndex:si,rain,snow,wet,snowCover,petals,leaves,weather,
   sky:css(sky),fog:css(fog),fogNear,fogFar,sunColor:css(sunCol),sunI:(3.2*daylight*(1-.25*dusk)+.45*dark)*(1-.7*weather),hemiI:(2.3*daylight+.55*dark)*(1-.35*weather),
   leaf:css(seasonMix(p,LEAF)),stars:dark*(1-weather)}}
 function clock(h){const m=Math.floor((h%1)*60/10)*10;return String(Math.floor(h)).padStart(2,'0')+':'+String(m).padStart(2,'0')}
 const api={env,clock,SEASONS,RAIN,SNOW};root.CITY_ENV=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
