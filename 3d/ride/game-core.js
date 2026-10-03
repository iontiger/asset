/* Rendering-independent driving simulation. Distances are converted to world units by the renderer. */
(function(root){
  const adventure=root.ADVENTURE||(typeof require==='function'?require('./adventure.js'):null);
  const path=root.ROAD_PATH||(typeof require==='function'?require('./road-path.js'):null);
  const LANDMARKS=[
    {z:1700,x:-1.85,model:'fountain',name:'중앙 나무 분수',scale:1.25},
    {z:6400,x:1.9,model:'rosehouse',name:'주택가',scale:1.1},
    {z:11400,x:-2.1,model:'market',name:'상점가 · VILLAGE MARKET',scale:1.15},
    {z:43000,x:1.75,model:'vault',name:'보물 창고길',scale:1.45},
    {z:63000,x:-1.6,model:'tower',name:'억 돌파 석탑',scale:1.45},
    {z:84500,x:2.1,model:'pier',name:'오래오래 낚시터',scale:1.3},
    {z:100000,x:-1.8,model:'lighthouse',name:'바위섬 등대',scale:1.6}
  ];
  const JUMPS=[4600,13600,45500,83000,99600];
  const COBBLES=[[8400,10100],[29000,30500],[61200,62700],[102000,103600]];
  // Ordinary rolling hills and jump crests, faded out where the road climbs over 목표봉.
  function roadHeight(s){let h=Math.sin(s/1400)*2.8+Math.sin(s/530)*.7;
    for(const crest of JUMPS){const d=s-crest;if(d>=-500&&d<=0)h+=9*Math.pow((d+500)/500,1.5);else if(d>0&&d<620)h+=9*Math.pow(1-d/620,2);}
    const m=adventure.mountainMask(s);if(m>0){const p=path.at(s);h=h*(1-m)+adventure.mountainField(p.x,p.z)}
    // 폭설 평원은 평평한 들판 (언덕을 거의 없앤다)
    const sc=adventure.snowCover(s);if(sc>0)h*=1-.9*sc;
    return h;
  }
  const surfaceAt=s=>COBBLES.some(([a,b])=>s>=a&&s<=b)?'stone':'dirt';
  class Ride {
    constructor(){this.length=path.LENGTH;this.mode='ready';this.reset();this.mode='ready';this.items=[];
      for(let i=0;i<216;i++)this.items.push({z:600+i*475,x:Math.sin(i*2.1)*.67,type:'letter',id:i});
      for(let i=0;i<160;i++){const z=1050+i*645;if(adventure.creek.fords.some(f=>Math.abs(z-f)<450))continue;if(z>adventure.fork.start-400&&z<adventure.fork.end+400)continue;   // 협곡(갈림길) 구간에는 낙석이 없다
        this.items.push({z,x:Math.sin(i*3.7+.8)*.78,type:'rock',id:1000+i,radius:2.1+(i%3)*.45})}
    }
    reset(){this.pos=0;this.speed=0;this.player=0;this.steer=0;this.energy=100;this.letters=0;this.elapsed=0;this.hit=0;this.boost=false;this.airY=0;this.airV=0;this.crashing=false;this.jumping=false;this.flightY=0;this.flightAge=0;this.jumped=new Set();this.surface='dirt';this.crashAge=0;this.grassCooldown=0;this.shake=0;this.falling=new Map();this.visited=new Set();this.collected=new Set();this.events=[];this.score=0;this.combo=0;this.comboTime=0;this.nearMisses=0;this.driftCharge=0;this.drifting=false;this.drifted=new Set();this.rockPassed=new Set();this.branchChoice='cliff';this.snow=0;this.latV=0;this.slip=0;this.inSnow=false;this.landingPress=-99;this.wasLandingKey=false;this.bonusTime=0;}
    reward(base,type){this.combo=Math.min(5,this.combo+1);this.comboTime=8;const points=base*this.combo;this.score+=points;this.events.push({type,points,combo:this.combo});}
    chooseBranch(choice){if(this.pos<adventure.fork.start&&['safe','cliff'].includes(choice)){this.branchChoice=choice;return true}return false}
    start(){if(this.mode!=='paused')this.reset();this.mode='playing'}
    pause(){if(this.mode==='playing')this.mode='paused'}
    update(dt,keys){this.events=[];if(this.mode!=='playing')return;dt=Math.min(dt,.05);this.elapsed+=dt;this.comboTime=Math.max(0,this.comboTime-dt);if(!this.comboTime)this.combo=0;this.bonusTime=Math.max(0,this.bonusTime-dt);
      if(keys.has('1'))this.chooseBranch('cliff');if(keys.has('2'))this.chooseBranch('safe');
      const landingKey=keys.has('e')||keys.has('s')||keys.has('arrowdown')||keys.has('shift');
      if(landingKey&&!this.wasLandingKey&&this.jumping)this.landingPress=this.elapsed;this.wasLandingKey=landingKey;
      this.hit=Math.max(0,this.hit-dt);this.grassCooldown=Math.max(0,this.grassCooldown-dt);this.shake=Math.max(0,this.shake-dt*1.7);
      for(const o of this.items)if(!(o.z>adventure.fork.start&&o.z<adventure.fork.end&&this.branchChoice==='safe')&&o.type==='rock'&&o.z-this.pos<1050&&o.z>this.pos-100){
        if(!this.falling.has(o.id)){this.falling.set(o.id,0);this.events.push({type:'rockfall',id:o.id,z:o.z,x:o.x})}
        const age=this.falling.get(o.id);this.falling.set(o.id,age+dt);
        if(age<.9&&age+dt>=.9)this.events.push({type:'rockland',z:o.z,x:o.x});
      }
      if(this.crashing){this.drifting=false;
        this.crashAge+=dt;this.airV-=17*dt;this.airY+=this.airV*dt;
        this.pos=Math.min(this.length-1,this.pos+this.speed*.55*dt);this.speed*=Math.exp(-dt*1.1);
        if(this.airY<=0){this.airY=0;this.airV=0;this.crashing=false;this.player=0;this.speed=65;this.hit=2;this.shake=.8;this.events.push({type:'land'})}
        return;
      }
      if(!this.jumping&&(this.airY>0||this.airV>0)){this.airV-=19*dt;this.airY=Math.max(0,this.airY+this.airV*dt);if(!this.airY)this.airV=0;}
      const up=keys.has('w')||keys.has('arrowup'),down=keys.has('s')||keys.has('arrowdown')||keys.has('shift');
      const dir=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
      const turn=path.turns.find(t=>this.pos>=t.start&&this.pos<=t.end);
      this.drifting=!!(turn&&this.speed>90&&!this.jumping&&this.airY<.15&&Math.abs(this.player)<.95);
      if(this.drifting){this.driftCharge+=dt;if(this.driftCharge>=1.1&&!this.drifted.has(turn.start)){this.drifted.add(turn.start);this.energy=Math.min(100,this.energy+35);this.reward(300,'drift');}}
      else this.driftCharge=0;
      this.boost=keys.has(' ')&&up&&this.energy>0;
      const canyonCruise=this.branchChoice==='cliff'&&this.pos>=adventure.fork.start&&this.pos<adventure.fork.end;
      const grade=adventure.mountainMask(this.pos)>0?(roadHeight(this.pos+60)-roadHeight(this.pos-60))/6:0;
      // 폭설: 바퀴가 눈에 반쯤 잠겨 최고 속도 · 가속이 줄고, 손을 떼면 금방 느려진다
      const snow=this.snow=adventure.snowAmt(this.pos);
      if(snow>.3&&!this.inSnow){this.inSnow=true;this.events.push({type:'snowIn'})}else if(snow<.05&&this.inSnow){this.inSnow=false;this.events.push({type:'snowOut'})}
      const limit=(canyonCruise?500:(this.boost||this.bonusTime>0?520:400))*(1-Math.max(-.12,Math.min(.3,grade*.9)))*(1-.45*snow);
      // Gentle launch, then stronger pull as the engine gains speed (0–200 km/h ≈ 5.3 s).
      const acceleration=(45+75*Math.min(1,this.speed/400)+(this.boost?70:0))*(1-.45*snow);
      const force=down?-240:this.drifting?-12:canyonCruise?(this.speed<limit?Math.max(acceleration,260):-18):up?(this.speed>limit?-100:acceleration):-38-70*snow;
      const nextSpeed=Math.max(0,this.speed+force*dt);
      this.speed=this.speed>limit?Math.max(limit,nextSpeed):Math.min(limit,nextSpeed);
      this.energy=Math.max(0,Math.min(100,this.energy+(this.boost?-23:12)*dt));
      this.steer+=(dir-this.steer)*Math.min(1,dt*8);
      // 눈길에서는 옆으로 미끄러진다: 핸들을 꺾어도 천천히 따라오고, 놓아도 계속 흘러가며, 저절로 꼬리가 흔들린다
      const want=dir*1.1*Math.min(1.6,this.speed/180)*(this.jumping?.28:this.drifting?.55:1),grip=snow>0&&!this.jumping?30*(1-snow)+1.5*snow:60;
      this.latV+=(want-this.latV)*Math.min(1,dt*grip);
      if(snow>0&&!this.jumping)this.latV+=(Math.sin(this.elapsed*1.7+this.pos*.0021)+Math.sin(this.elapsed*.63+1.3)*.6)*snow*Math.min(1,this.speed/160)*.55*dt;
      this.slip=snow>0?this.latV-want:0;
      this.player+=this.latV*dt;
      this.player-=Math.sin(this.pos/1500)*this.speed*dt*.00010;
      this.player=Math.max(-1.12,Math.min(1.12,this.player));
      if(Math.abs(this.player)>.94&&this.speed>100)this.speed=Math.max(100,this.speed-dt*220);
      if(!this.jumping&&Math.abs(this.player)>.97&&this.speed>25&&this.grassCooldown<=0){
        const side=Math.sign(this.player);this.player-=side*.19;this.speed*=.78;this.airV=4.5+this.speed*.005;this.grassCooldown=.85;this.shake=.5;
        this.events.push({type:'grass',side});
      }
      const before=this.pos;this.pos=Math.min(this.length,this.pos+this.speed*1.35*dt*adventure.travelScale(this.pos,this.branchChoice));
      for(const f of adventure.creek.fords)if(before<f&&this.pos>=f&&!this.jumping&&!this.crashing){this.speed*=.86;this.shake=Math.max(this.shake,.45);this.events.push({type:'ford'})}
      const surface=surfaceAt(this.pos);if(surface!==this.surface){this.surface=surface;if(surface==='stone')this.events.push({type:'stone'})}
      if(this.jumping){this.flightAge+=dt;this.airV-=16*dt;this.flightY+=this.airV*dt;this.airY=Math.max(0,this.flightY-roadHeight(this.pos));
        if(this.airY<=0&&this.airV<0){this.jumping=false;this.airV=0;this.shake=.65;if(this.elapsed-this.landingPress<=.3){this.shake=.15;this.energy=Math.min(100,this.energy+20);this.speed=Math.min(520,this.speed+100);this.bonusTime=1.5;this.reward(500,'perfectLand')}else this.events.push({type:'jumpLand'})}
      }
      if(!this.jumping)for(const crest of JUMPS)if(before<crest&&this.pos>=crest&&!this.jumped.has(crest)&&this.speed>100){
        this.jumped.add(crest);this.jumping=true;this.flightAge=0;this.airV=7+this.speed*.015;this.flightY=roadHeight(this.pos)+.15;this.airY=.15;this.events.push({type:'jump'});break;
      }
      for(const o of this.items){
        if(this.jumping&&(o.type==='letter'?this.airY>2:this.airY>o.radius*1.7))continue;
        const isRock=o.type==='rock';
        if(isRock&&this.pos>=adventure.fork.start&&this.pos<adventure.fork.end&&this.branchChoice==='safe')continue;
        if(!isRock){if(o.z>=before&&o.z<=this.pos&&Math.abs(o.x-this.player)<.22&&!this.collected.has(o.id)){this.collected.add(o.id);this.letters++;this.score+=100;this.events.push({type:'letter',id:o.id,z:o.z,x:o.x})}continue}
        if(this.rockPassed.has(o.id)||(this.falling.get(o.id)||0)<.75)continue;
        const dx=Math.abs(o.x-this.player)*9,radius=o.radius+.35;
        if(before<=o.z&&this.pos>=o.z&&dx>radius&&dx<radius+1.35&&this.speed>150){this.rockPassed.add(o.id);this.nearMisses++;this.energy=Math.min(100,this.energy+12);this.reward(200,'nearMiss');continue}
        const closestZ=Math.max(before,Math.min(this.pos,o.z));
        if(dx*dx+((closestZ-o.z)/20)**2>radius*radius||this.hit>0)continue;
        this.rockPassed.add(o.id);
        if(dx>o.radius*.68){this.speed*=.86;this.shake=.35;this.hit=.4;this.player+=Math.sign(this.player-o.x)*.08;this.events.push({type:'graze'});continue}
        this.combo=0;this.comboTime=0;this.drifting=false;this.speed*=.4;this.hit=3;this.crashing=true;this.jumping=false;this.crashAge=0;this.airV=13;this.airY=.2;this.boost=false;this.shake=1.5;this.events.push({type:'hit'});break;
      }
      LANDMARKS.forEach((l,i)=>{if(this.pos>=l.z&&!this.visited.has(i)){this.visited.add(i);this.events.push({type:'landmark',name:l.name})}});
      if(this.pos>=this.length){this.mode='finished';this.boost=false;this.events.push({type:'finish'})}
    }
  }
  root.ROAD_HEIGHT=roadHeight;root.ROAD_JUMPS=JUMPS;root.ROAD_COBBLES=COBBLES;root.Ride=Ride;root.RIDE_LANDMARKS=LANDMARKS;
  if(typeof module!=='undefined')module.exports={Ride,LANDMARKS,JUMPS,COBBLES,roadHeight,surfaceAt};
})(typeof window!=='undefined'?window:globalThis);
