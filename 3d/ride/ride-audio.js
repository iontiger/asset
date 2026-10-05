/* Procedural engine, wind, gravel and impact audio, plus the background playlist (starts at the first jump). */
class RideSound {
 // 기본은 소리 켜짐. 브라우저는 사용자의 첫 클릭 · 키 입력 뒤에만 소리를 내 주므로 그때 unlock() 으로 오디오를 깨운다.
 constructor(){this.muted=false;this.music=null;this.musicOn=false}
 async unlock(){this.init();try{await this.ctx.resume()}catch(e){}}
 // 배경 음악: 처음 언덕을 넘어 공중에 뜨는 순간 upbeat → duet → fusion jazz 순서로 이어 틀고, 마지막 곡이 끝나면 처음 곡으로.
 // 소리 버튼(스피커)을 따라 음소거되고, 일시정지 · 다른 탭 · 도착 때는 멈췄다가 다시 달리면 이어서 나온다. 새로 출발하면 첫 곡부터.
 musicLoad(){if(this.tracks)return;this.ti=0;this.tracks=RideSound.PLAYLIST.map((src,i)=>{const m=new Audio();m.preload=i?'none':'auto';m.src=src;m.volume=.55;m.muted=this.muted;m.addEventListener('ended',()=>{if(this.music===m)this.musicPlay((i+1)%this.tracks.length)});return m});this.music=this.tracks[0]}
 musicPlay(i){if(this.music&&this.music!==this.tracks[i])this.music.pause();this.ti=i;const m=this.music=this.tracks[i];m.muted=this.muted;try{m.currentTime=0}catch(e){}m.play().catch(()=>{});const next=this.tracks[(i+1)%this.tracks.length];if(next.preload!=='auto'){next.preload='auto';next.load()}}
 musicStart(){this.musicLoad();if(this.musicOn)return;this.musicOn=true;this.musicPlay(0)}
 musicReset(){this.musicOn=false;if(this.tracks)for(const m of this.tracks){m.pause();try{m.currentTime=0}catch(e){}}if(this.tracks){this.ti=0;this.music=this.tracks[0]}}
 musicSync(r){const m=this.music;if(!m||!this.musicOn)return;m.muted=this.muted;const want=r.mode==='playing'&&!document.hidden;if(want&&m.paused&&!m.ended)m.play().catch(()=>{});else if(!want&&!m.paused)m.pause()}
 init(){if(this.ctx)return;{const A=window.AudioContext||window.webkitAudioContext;this.ctx=new A();const a=this.ctx;this.master=a.createGain();this.master.gain.value=this.muted?0:.45;this.master.connect(a.destination);
 this.engine=a.createOscillator();this.engine.type='sawtooth';const filter=a.createBiquadFilter();filter.type='lowpass';filter.frequency.value=380;this.motor=a.createGain();this.motor.gain.value=0;this.engine.connect(filter);filter.connect(this.motor);this.motor.connect(this.master);this.engine.start();
 this.noise=a.createBuffer(1,a.sampleRate*2,a.sampleRate);const d=this.noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 const loop=(freq)=>{const n=a.createBufferSource();n.buffer=this.noise;n.loop=true;const f=a.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;f.Q.value=.5;const g=a.createGain();g.gain.value=0;n.connect(f);f.connect(g);g.connect(this.master);n.start();return g};this.wind=loop(1000);this.gravel=loop(190);}}
 async toggle(){this.init();this.muted=!this.muted;if(this.tracks)for(const m of this.tracks)m.muted=this.muted;await this.ctx.resume();this.master.gain.setTargetAtTime(this.muted?0:.45,this.ctx.currentTime,.1);return this.muted;}
 update(r,t){if(!this.ctx)return;const a=this.ctx,active=r.mode==='playing',v=active?r.speed/520:0;this.engine.frequency.setTargetAtTime(32+v*155+Math.sin(t*28)*v*4,a.currentTime,.06);this.motor.gain.setTargetAtTime(active?.045+v*.025:0,a.currentTime,.1);this.wind.gain.setTargetAtTime(v*v*.16,a.currentTime,.1);this.gravel.gain.setTargetAtTime(active&&r.airY<.1?(r.surface==='stone'?.06+Math.abs(Math.sin(t*75))*.09:.015)*v:0,a.currentTime,.03)}
 silence(){if(!this.ctx)return;for(const g of [this.motor,this.wind,this.gravel,this.rainG,this.cityG,this.hissG,this.rumbleG].filter(Boolean))g.gain.setTargetAtTime(0,this.ctx.currentTime,.04)}
 chime(freq=660){if(!this.ctx||this.muted)return;const a=this.ctx,o=a.createOscillator(),g=a.createGain();o.frequency.value=freq;g.gain.setValueAtTime(.1,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.22);o.connect(g);g.connect(this.master);o.start();o.stop(a.currentTime+.23)}
 // 뉴욕 시내 폭우: 빗소리(고음 잡음 고리)와 번개 뒤 우르릉 천둥
 // 지진 우르릉: 아주 낮은 소음이 흔들림 세기(v)만큼 커진다
 rumble(v){if(!this.ctx)return;const a=this.ctx;if(!this.rumbleG){if(v<.01)return;const n=a.createBufferSource();n.buffer=this.noise;n.loop=true;const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=90;f.Q.value=2.5;this.rumbleG=a.createGain();this.rumbleG.gain.value=0;n.connect(f);f.connect(this.rumbleG);this.rumbleG.connect(this.master);n.start()}
  this.rumbleG.gain.setTargetAtTime(this.muted?0:v*.9,a.currentTime,.25)}
 rain(v){if(!this.ctx)return;const a=this.ctx;if(!this.rainG){if(v<.01)return;const n=a.createBufferSource();n.buffer=this.noise;n.loop=true;const f=a.createBiquadFilter();f.type='highpass';f.frequency.value=1800;this.rainG=a.createGain();this.rainG.gain.value=0;n.connect(f);f.connect(this.rainG);this.rainG.connect(this.master);n.start()}
  this.rainG.gain.setTargetAtTime(v*.11,a.currentTime,.3)}
 // 뉴욕 시내 소리: 차들 웅웅(낮은 잡음) · 가끔 경적 · 멀리서 다가왔다 멀어지는 사이렌 · 젖은 길 타이어 물소리 · 횡단보도 보행 신호음
 city(on,wet,speed,walk,dt){if(!this.ctx)return;const a=this.ctx,t=a.currentTime;
  if(!this.cityG){if(!on)return;const mk=(type,freq,q)=>{const n=a.createBufferSource();n.buffer=this.noise;n.loop=true;const f=a.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;const g=a.createGain();g.gain.value=0;n.connect(f);f.connect(g);g.connect(this.master);n.start();return g};
   this.cityG=mk('lowpass',240,.7);this.hissG=mk('bandpass',2400,.7);this.hornT=2.5;this.sirenT=14;this.chirpT=0}
  const live=on&&!this.muted;this.cityG.gain.setTargetAtTime(live?.06:0,t,.6);this.hissG.gain.setTargetAtTime(live?wet*Math.min(1,speed/220)*.08:0,t,.15);if(!live)return;
  if((this.hornT-=dt)<=0){this.hornT=4+Math.random()*8;this.horn(.35+Math.random()*.65)}
  if((this.sirenT-=dt)<=0){this.sirenT=40+Math.random()*35;this.siren()}
  if(walk&&(this.chirpT-=dt)<=0){this.chirpT=1;this.chirp()}}
 horn(near=1){if(!this.ctx||this.muted)return;const a=this.ctx,t=a.currentTime,f=a.createBiquadFilter(),g=a.createGain();f.type='lowpass';f.frequency.value=900+near*1400;g.gain.value=0;f.connect(g);g.connect(this.master);
  const two=Math.random()<.4,len=.18+Math.random()*.35,base=330+Math.random()*120;for(const k of [1,1.26]){const o=a.createOscillator();o.type='square';o.frequency.value=base*k;o.connect(f);o.start(t);o.stop(t+(two?len*2+.16:len)+.05)}
  const v=.022*near;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.02);g.gain.setValueAtTime(v,t+len);g.gain.linearRampToValueAtTime(0,t+len+.03);if(two){g.gain.setValueAtTime(0,t+len+.14);g.gain.linearRampToValueAtTime(v,t+len+.16);g.gain.setValueAtTime(v,t+len*2+.14);g.gain.linearRampToValueAtTime(0,t+len*2+.17)}}
 siren(){if(!this.ctx||this.muted)return;const a=this.ctx,t=a.currentTime,o=a.createOscillator(),f=a.createBiquadFilter(),g=a.createGain(),L=11;o.type='triangle';f.type='lowpass';f.frequency.value=1700;
  for(let i=0;i<=L*4;i++){const at=t+i/4,dop=1.05-.1*(i/(L*4));o.frequency.setValueAtTime((700+330*Math.sin(i/4*Math.PI*2/2.4))*dop,at)}   // 웅~웅 오르내림 · 지나가며 살짝 낮아짐
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.02,t+L*.45);g.gain.linearRampToValueAtTime(0,t+L);o.connect(f);f.connect(g);g.connect(this.master);o.start(t);o.stop(t+L+.05)}
 chirp(){if(!this.ctx||this.muted)return;const a=this.ctx,t=a.currentTime;for(const at of [0,.12]){const o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.setValueAtTime(2900,t+at);o.frequency.exponentialRampToValueAtTime(2300,t+at+.08);g.gain.setValueAtTime(0,t+at);g.gain.linearRampToValueAtTime(.03,t+at+.005);g.gain.exponentialRampToValueAtTime(.0008,t+at+.09);o.connect(g);g.connect(this.master);o.start(t+at);o.stop(t+at+.1)}}
 thunder(){if(!this.ctx||this.muted)return;const a=this.ctx,t=a.currentTime,n=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();n.buffer=this.noise;n.loop=true;f.type='lowpass';f.frequency.setValueAtTime(420,t);f.frequency.exponentialRampToValueAtTime(70,t+2.4);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.42,t+.05);g.gain.exponentialRampToValueAtTime(.12,t+.5);g.gain.linearRampToValueAtTime(.2,t+.8);g.gain.exponentialRampToValueAtTime(.001,t+2.8);n.connect(f);f.connect(g);g.connect(this.master);n.start(t);n.stop(t+2.9)}
 // 편지 수집 '띠링~': 맑은 종소리 두 음 (배음 섞인 사인파) + 반짝이는 높은 음
 ding(){if(!this.ctx||this.muted)return;const a=this.ctx,t=a.currentTime;
  const bell=(f,at,len,vol)=>{for(const [k,v] of [[1,1],[2.76,.35],[5.4,.12]]){const o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.value=f*k;g.gain.setValueAtTime(0,t+at);g.gain.linearRampToValueAtTime(vol*v,t+at+.008);g.gain.exponentialRampToValueAtTime(.0008,t+at+len*(k>1?.45:1));o.connect(g);g.connect(this.master);o.start(t+at);o.stop(t+at+len+.05)}};
  bell(1318.5,0,.35,.12);bell(1975.5,.09,.9,.13);for(let i=0;i<4;i++)bell(2637+i*330,.16+i*.045,.18,.025)}
 // 1000점 돌파: 도-미-솔-도 올라가는 팡파르 + 마지막 화음 종소리
 fanfare(){if(!this.ctx||this.muted)return;const a=this.ctx,t=a.currentTime;
  const note=(f,at,len,vol,type='triangle')=>{const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(0,t+at);g.gain.linearRampToValueAtTime(vol,t+at+.012);g.gain.exponentialRampToValueAtTime(.0008,t+at+len);o.connect(g);g.connect(this.master);o.start(t+at);o.stop(t+at+len+.05)};
  [523.25,659.25,783.99].forEach((f,i)=>note(f,i*.1,.22,.12));for(const f of [1046.5,1318.5,1568])note(f,.3,1.1,.07);for(const f of [2093,2637])note(f,.3,.8,.03,'sine')}
 impact(power=1){if(!this.ctx||this.muted)return;const a=this.ctx,n=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();n.buffer=this.noise;f.type='lowpass';f.frequency.value=350+power*500;g.gain.setValueAtTime(.18*power,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.5);n.connect(f);f.connect(g);g.connect(this.master);n.start();n.stop(a.currentTime+.51)}
}
RideSound.PLAYLIST=['upbeat.mp3','duet-pop-ballad.mp3','fusion-jazz.mp3'];
