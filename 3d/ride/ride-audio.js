/* Procedural engine, wind, gravel and impact audio; no remote files. */
class RideSound {
 constructor(){this.muted=true}
 async toggle(){if(!this.ctx){const A=window.AudioContext||window.webkitAudioContext;this.ctx=new A();const a=this.ctx;this.master=a.createGain();this.master.gain.value=0;this.master.connect(a.destination);
 this.engine=a.createOscillator();this.engine.type='sawtooth';const filter=a.createBiquadFilter();filter.type='lowpass';filter.frequency.value=380;this.motor=a.createGain();this.motor.gain.value=0;this.engine.connect(filter);filter.connect(this.motor);this.motor.connect(this.master);this.engine.start();
 this.noise=a.createBuffer(1,a.sampleRate*2,a.sampleRate);const d=this.noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 const loop=(freq)=>{const n=a.createBufferSource();n.buffer=this.noise;n.loop=true;const f=a.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;f.Q.value=.5;const g=a.createGain();g.gain.value=0;n.connect(f);f.connect(g);g.connect(this.master);n.start();return g};this.wind=loop(1000);this.gravel=loop(190);}
 this.muted=!this.muted;await this.ctx.resume();this.master.gain.setTargetAtTime(this.muted?0:.45,this.ctx.currentTime,.1);return this.muted;}
 update(r,t){if(!this.ctx)return;const a=this.ctx,active=r.mode==='playing',v=active?r.speed/520:0;this.engine.frequency.setTargetAtTime(32+v*155+Math.sin(t*28)*v*4,a.currentTime,.06);this.motor.gain.setTargetAtTime(active?.045+v*.025:0,a.currentTime,.1);this.wind.gain.setTargetAtTime(v*v*.16,a.currentTime,.1);this.gravel.gain.setTargetAtTime(active&&r.airY<.1?(r.surface==='stone'?.06+Math.abs(Math.sin(t*75))*.09:.015)*v:0,a.currentTime,.03)}
 silence(){if(!this.ctx)return;for(const g of [this.motor,this.wind,this.gravel])g.gain.setTargetAtTime(0,this.ctx.currentTime,.04)}
 chime(freq=660){if(!this.ctx||this.muted)return;const a=this.ctx,o=a.createOscillator(),g=a.createGain();o.frequency.value=freq;g.gain.setValueAtTime(.1,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.22);o.connect(g);g.connect(this.master);o.start();o.stop(a.currentTime+.23)}
 impact(power=1){if(!this.ctx||this.muted)return;const a=this.ctx,n=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();n.buffer=this.noise;f.type='lowpass';f.frequency.value=350+power*500;g.gain.setValueAtTime(.18*power,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.5);n.connect(f);f.connect(g);g.connect(this.master);n.start();n.stop(a.currentTime+.51)}
}
