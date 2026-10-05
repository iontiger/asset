/* Rendering-independent driving simulation. Distances are converted to world units by the renderer. */
(function(root){
  const adventure=root.ADVENTURE||(typeof require==='function'?require('./adventure.js'):null);
  const path=root.ROAD_PATH||(typeof require==='function'?require('./road-path.js'):null);
  const city=root.CITY||(typeof require==='function'?require('./city.js'):null);
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
  // 지진(3회차부터 · game.js 가 ride.quakeOn 을 켠다): 첫 점프 착지 뒤 ~ 갈림길 전.
  //  RAMPS  — 길 전체가 갈라져 앞쪽이 점점 기울며 솟아오른다. 그 위를 달려 올라가 끝(절벽)에서 뛰어내린다.
  //  BLOCKS — 길 일부가 갈라져 순식간에 솟아오른 땅덩이. 부딪히면 넘어지는 장애물.
  //  BOULDERS — 산비탈에서 중력으로 빨라지며 굴러 내려와 길을 가로지르는 바위.
  const QUAKE={start:JUMPS[0]+900,end:adventure.fork.start-700,ramp:350};
  const quakeZone=s=>{const a=Math.min(1,Math.max(0,(s-QUAKE.start)/QUAKE.ramp)),b=Math.min(1,Math.max(0,(QUAKE.end-s)/QUAKE.ramp));return Math.min(a,b)};
  const nearJump=z=>JUMPS.some(c=>z>c-650&&z<c+750);
  const ease=x=>x<=0?0:x>=1?1:x*x*(3-2*x);
  const RAMPS=[{i:0,z0:6900,len:950,h:8},{i:1,z0:10500,len:1100,h:11},{i:2,z0:16200,len:1000,h:9.5}];
  const inRampZone=z=>RAMPS.some(R=>z>R.z0-380&&z<R.z0+R.len+1050);
  const rampRise=(R,pos)=>ease((pos-(R.z0-1300))/(R.len*.8+1300));                 // 다가갈수록 · 올라갈수록 더 기운다
  const rampLift=(R,s,pos)=>s<R.z0||s>R.z0+R.len?0:R.h*rampRise(R,pos)*Math.pow((s-R.z0)/R.len,1.25);
  const BLOCK_SPANS=[[.1,1.2],[-1.2,-.1],[-.5,.5],[-1.2,-.3],[.3,1.2],[-.15,.85],[-.85,.15]];
  const BLOCKS=[];
  for(let z=QUAKE.start+380,i=0;z<QUAKE.end-200;z+=470+((i*131)%4)*50,i++)if(!nearJump(z)&&!inRampZone(z)){const [x0,x1]=BLOCK_SPANS[BLOCKS.length%BLOCK_SPANS.length];BLOCKS.push({i:BLOCKS.length,id:6000+BLOCKS.length,z,x0,x1,h:2.6+((i*37)%5)*.4,len:60})}
  const BOULDERS=[];
  for(let z=QUAKE.start+600,i=0;z<QUAKE.end-150;z+=330,i++)if(!nearJump(z)&&!inRampZone(z)&&!BLOCKS.some(k=>Math.abs(k.z-z)<160)&&!BOULDERS.some(o=>z-o.z<600))BOULDERS.push({i,id:5000+i,z,side:[1,-1,1,1,-1,-1,1,-1][i%8],radius:1.55+(i%3)*.35,lead:820+((i*71)%5)*85});
  const BLOCK_POP=650,BLOCK_RISE=.35;   // 이만큼 앞(s)에서 솟기 시작해 0.35초 만에 다 솟는다
  const BOULDER_G=1.3,BOULDER_VMAX=2.5,BOULDER_X0=2.35,BOULDER_STOP=2.7;
  const surfaceAt=s=>COBBLES.some(([a,b])=>s>=a&&s<=b)?'stone':'dirt';
  class Ride {
    constructor(){this.length=path.LENGTH;this.mode='ready';this.reset();this.mode='ready';this.items=[];
      for(let i=0;i<216;i++)this.items.push({z:600+i*475,x:Math.sin(i*2.1)*.67,type:'letter',id:i});
      for(let i=0;i<160;i++){const z=1050+i*645;if(adventure.creek.fords.some(f=>Math.abs(z-f)<450))continue;if(z>adventure.fork.start-400&&z<adventure.fork.end+400)continue;   // 협곡(갈림길) 구간에는 낙석이 없다
        this.items.push({z,x:Math.sin(i*3.7+.8)*.78,type:'rock',id:1000+i,radius:2.1+(i%3)*.45})}
    }
    reset(){this.practice=false;this.pos=0;this.speed=0;this.player=0;this.steer=0;this.energy=100;this.letters=0;this.elapsed=0;this.hit=0;this.boost=false;this.airY=0;this.airV=0;this.crashing=false;this.jumping=false;this.flightY=0;this.flightAge=0;this.jumped=new Set();this.surface='dirt';this.crashAge=0;this.grassCooldown=0;this.shake=0;this.falling=new Map();this.visited=new Set();this.collected=new Set();this.events=[];this.score=0;this.combo=0;this.comboTime=0;this.nearMisses=0;this.driftCharge=0;this.drifting=false;this.drifted=new Set();this.rockPassed=new Set();this.branchChoice='cliff';this.snow=0;this.latV=0;this.grassBounce=0;this.slip=0;this.inSnow=false;this.quake=0;this.quakeIn=false;this.boulders=new Map();this.blocks=new Map();this.rampsSeen=new Set();this.liftY=0;this.liftSlope=0;this.landingPress=-99;this.wasLandingKey=false;this.bonusTime=0;this.city=city.newState();}
    reward(base,type){this.combo=Math.min(5,this.combo+1);this.comboTime=8;const points=base*this.combo;this.score+=points;this.events.push({type,points,combo:this.combo});}
    chooseBranch(choice){if(this.pos<adventure.fork.start&&['safe','cliff'].includes(choice)){this.branchChoice=choice;return true}return false}
    start(){if(this.mode!=='paused')this.reset();this.mode='playing'}
    startFrom(pos,branch='cliff'){
      if(!Number.isFinite(pos)||pos<0||pos>=this.length||!['cliff','safe'].includes(branch))return false;
      this.reset();this.pos=pos;this.branchChoice=branch;this.practice=pos>0;this.mode='playing';
      LANDMARKS.forEach((l,i)=>{if(l.z<pos)this.visited.add(i)});
      if(branch==='safe'){
        const u=city.uOf(pos);
        city.lights.forEach(l=>{if(l.u<u)Object.assign(this.city.lights[l.i],{state:'green',done:true})});
        city.cameras.forEach(c=>{if(c.u<u)this.city.cams[c.i]=true});
        city.deliveries.forEach(d=>{if(d.u+5<u)this.city.deliveries[d.i].status='missed'});
      }
      return true;
    }
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
      // 뉴욕 시내(마을길): 신호 · 차량을 움직이고, 헤어핀 드리프트는 없다
      const cityOn=this.branchChoice==='safe'&&this.pos>adventure.fork.start-3000&&this.pos<adventure.fork.end+100,inCity=cityOn&&this.pos>=adventure.fork.start&&this.pos<adventure.fork.end;
      if(cityOn)city.update(this,dt);
      const turn=inCity?null:path.turns.find(t=>this.pos>=t.start&&this.pos<=t.end);
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
      if(cityOn){const c=city.cap(this);if(this.speed>c)this.speed=Math.max(c,this.speed-420*dt)}
      this.energy=Math.max(0,Math.min(100,this.energy+(this.boost?-23:12)*dt));
      this.steer+=(dir-this.steer)*Math.min(1,dt*8);
      // 눈길에서는 옆으로 미끄러진다: 핸들을 꺾어도 천천히 따라오고, 놓아도 계속 흘러가며, 저절로 꼬리가 흔들린다
      const want=dir*1.1*Math.min(1.6,this.speed/180)*(this.jumping?.28:this.drifting?.55:1),grip=snow>0&&!this.jumping?30*(1-snow)+1.5*snow:60;
      this.latV+=(want-this.latV)*Math.min(1,dt*grip);
      if(snow>0&&!this.jumping)this.latV+=(Math.sin(this.elapsed*1.7+this.pos*.0021)+Math.sin(this.elapsed*.63+1.3)*.6)*snow*Math.min(1,this.speed/160)*.55*dt;
      this.slip=snow>0?this.latV-want:0;
      // 풀숲 충격 직후에는 도로 안쪽으로 튕겨 나가는 힘이 잠깐 이어진다(눈길 미끄럼 · 손을 뗀 폰에서도 다시 풀숲으로 끌려가지 않게)
      if(this.grassBounce){this.player+=this.grassBounce*dt;this.grassBounce*=Math.exp(-dt*3.2);if(Math.abs(this.grassBounce)<.02)this.grassBounce=0}
      this.player+=this.latV*dt;
      this.player-=Math.sin(this.pos/1500)*this.speed*dt*.00010;
      this.player=Math.max(-1.12,Math.min(1.12,this.player));if(inCity)this.player=Math.max(-1,Math.min(.5,this.player));
      if(!inCity&&Math.abs(this.player)>.94&&this.speed>100)this.speed=Math.max(100,this.speed-dt*220);
      if(!inCity&&!this.jumping&&Math.abs(this.player)>.97&&this.speed>25&&this.grassCooldown<=0){
        const side=Math.sign(this.player);this.player-=side*.19;if(Math.sign(this.latV)===side)this.latV=0;this.grassBounce=-side*1.1;this.speed*=.78;this.airV=4.5+this.speed*.005;this.grassCooldown=.85;this.shake=.5;
        this.events.push({type:'grass',side});
      }
      const before=this.pos;this.pos=Math.min(this.length,this.pos+this.speed*1.35*dt*adventure.travelScale(this.pos,this.branchChoice));
      if(cityOn)city.after(this,before,dt);
      for(const f of adventure.creek.fords)if(before<f&&this.pos>=f&&!this.jumping&&!this.crashing){this.speed*=.86;this.shake=Math.max(this.shake,.45);this.events.push({type:'ford'})}
      if(this.quakeOn){const zq=quakeZone(this.pos);this.quake=zq*(.4+.6*Math.max(0,Math.sin(this.elapsed*1.25))**2);
        if(zq>.3&&!this.quakeIn){this.quakeIn=true;this.events.push({type:'quakeIn'})}else if(this.quakeIn&&this.pos>QUAKE.end){this.quakeIn=false;this.events.push({type:'quakeOut'})}
        if(this.quake>0){this.shake=Math.max(this.shake,this.quake*.42);if(!this.jumping&&!this.crashing)this.player+=Math.sin(this.elapsed*9.7)*this.quake*.16*dt}
        // 솟는 땅: 위에 있는 동안 바이크 높이(liftY)를 올리고, 끝을 넘으면 그 높이에서 뛰어내린다(착지는 점프와 같다 · E 타이밍 보너스)
        this.liftY=0;this.liftSlope=0;
        for(const R of RAMPS){const end=R.z0+R.len;
          if(!this.rampsSeen.has(R.i)&&this.pos>R.z0-1300&&this.pos<end){this.rampsSeen.add(R.i);this.events.push({type:'quakeRamp',z:R.z0})}
          if(this.pos>=R.z0&&this.pos<end&&!this.jumping&&!this.crashing){this.liftY=rampLift(R,this.pos,this.pos);this.liftSlope=(rampLift(R,Math.min(end,this.pos+10),this.pos)-rampLift(R,Math.max(R.z0,this.pos-10),this.pos))/1}
          if(before<end&&this.pos>=end&&!this.jumping&&!this.crashing){const h=rampLift(R,end,this.pos);this.jumping=true;this.flightAge=0;this.airV=2.2+this.speed*.007;this.flightY=roadHeight(this.pos)+h+.15;this.airY=h+.15;this.liftY=0;this.events.push({type:'quakeLaunch',h})}}
        // 솟는 땅덩이: 앞쪽 BLOCK_POP 안에 들어오면 순식간에 솟아오른다. 솟은 뒤에는 부딪히면 넘어진다
        for(const k of BLOCKS){let st=this.blocks.get(k.id);
          if(!st){if(k.z>this.pos&&k.z-this.pos<BLOCK_POP){st={t:0};this.blocks.set(k.id,st);this.events.push({type:'quakeBlock',z:k.z})}continue}
          st.t+=dt;const up=Math.min(1,st.t/BLOCK_RISE);if(up<.5||this.rockPassed.has(k.id)||this.crashing||this.hit>0)continue;
          if(this.jumping&&this.airY>k.h*up*.9)continue;
          if(!(before<=k.z+k.len/2&&this.pos>=k.z-k.len/2))continue;
          const pad=.04,inside=this.player>k.x0-pad&&this.player<k.x1+pad,edge=Math.min(Math.abs(this.player-k.x0),Math.abs(this.player-k.x1));
          if(!inside){if(edge*9<1.4&&this.speed>150&&this.pos>=k.z){this.rockPassed.add(k.id);this.nearMisses++;this.energy=Math.min(100,this.energy+12);this.reward(200,'nearMiss')}continue}
          this.rockPassed.add(k.id);
          if(edge<.07){this.speed*=.86;this.shake=.35;this.hit=.4;this.player+=(this.player-(k.x0+k.x1)/2>0?1:-1)*.1;this.events.push({type:'graze'});continue}
          this.combo=0;this.comboTime=0;this.drifting=false;this.speed*=.4;this.hit=3;this.crashing=true;this.jumping=false;this.crashAge=0;this.airV=13;this.airY=.2;this.boost=false;this.shake=1.5;this.events.push({type:'hit',block:true});break}
        // 굴러 내려오는 바위: 앞쪽 lead 안에 들어오면 산비탈(BOULDER_X0)에서 출발해 중력으로 빨라지며 길을 가로지른다
        for(const b of BOULDERS){let st=this.boulders.get(b.id);
          if(!st){if(b.z>this.pos&&b.z-this.pos<b.lead){st={t:0,x:b.side*BOULDER_X0,v:0,roll:0};this.boulders.set(b.id,st);this.events.push({type:'boulder',id:b.id,z:b.z,side:b.side})}continue}
          if(st.x*b.side>-BOULDER_STOP){st.t+=dt;st.v=Math.min(BOULDER_VMAX,st.v+BOULDER_G*dt);st.x-=b.side*st.v*dt;st.roll+=st.v*9*dt/b.radius}else st.v=0;
          if(this.jumping&&this.airY>b.radius*1.7)continue;
          if(this.rockPassed.has(b.id)||this.crashing||this.hit>0)continue;
          const dx=Math.abs(st.x-this.player)*9,radius=b.radius+.35;
          if(before<=b.z&&this.pos>=b.z&&dx>radius&&dx<radius+1.35&&this.speed>150){this.rockPassed.add(b.id);this.nearMisses++;this.energy=Math.min(100,this.energy+12);this.reward(200,'nearMiss');continue}
          const closestZ=Math.max(before,Math.min(this.pos,b.z));
          if(dx*dx+((closestZ-b.z)/20)**2>radius*radius)continue;
          this.rockPassed.add(b.id);
          if(dx>b.radius*.68){this.speed*=.86;this.shake=.35;this.hit=.4;this.player+=Math.sign(this.player-st.x)*.08;this.events.push({type:'graze'});continue}
          this.combo=0;this.comboTime=0;this.drifting=false;this.speed*=.4;this.hit=3;this.crashing=true;this.jumping=false;this.crashAge=0;this.airV=13;this.airY=.2;this.boost=false;this.shake=1.5;this.events.push({type:'hit',boulder:true});break}
      }else{this.quake=0;this.liftY=0;this.liftSlope=0}
      const surface=inCity?'asphalt':surfaceAt(this.pos);if(surface!==this.surface){this.surface=surface;if(surface==='stone')this.events.push({type:'stone'})}
      if(this.jumping){this.flightAge+=dt;this.airV-=16*dt;this.flightY+=this.airV*dt;this.airY=Math.max(0,this.flightY-roadHeight(this.pos));
        if(this.airY<=0&&this.airV<0){this.jumping=false;this.airV=0;this.shake=.65;if(this.elapsed-this.landingPress<=.3){this.shake=.15;this.energy=Math.min(100,this.energy+20);this.speed=Math.min(520,this.speed+100);this.bonusTime=1.5;this.reward(500,'perfectLand')}else this.events.push({type:'jumpLand'})}
      }
      if(!this.jumping)for(const crest of JUMPS)if(before<crest&&this.pos>=crest&&!this.jumped.has(crest)&&this.speed>100){
        this.jumped.add(crest);this.jumping=true;this.flightAge=0;this.airV=7+this.speed*.015;this.flightY=roadHeight(this.pos)+.15;this.airY=.15;this.events.push({type:'jump'});break;
      }
      for(const o of this.items){
        if(this.jumping&&(o.type==='letter'?this.airY>2:this.airY>o.radius*1.7))continue;
        if(this.liftY>2&&(o.type==='letter'||this.liftY>o.radius*1.5))continue;   // 솟은 땅 위에서는 길바닥의 편지 · 바위에 닿지 않는다
        const isRock=o.type==='rock';
        if(isRock&&this.pos>=adventure.fork.start&&this.pos<adventure.fork.end&&this.branchChoice==='safe')continue;
        if(o.type==='letter'&&this.branchChoice==='safe'&&o.z>adventure.fork.start&&o.z<adventure.fork.end)continue; // 뉴욕 시내에는 편지가 없다
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
  root.RIDE_QUAKE={QUAKE,RAMPS,BLOCKS,BOULDERS,quakeZone,rampLift,rampRise,BLOCK_POP,BLOCK_RISE};root.ROAD_HEIGHT=roadHeight;root.ROAD_JUMPS=JUMPS;root.ROAD_COBBLES=COBBLES;root.Ride=Ride;root.RIDE_LANDMARKS=LANDMARKS;
  if(typeof module!=='undefined')module.exports={Ride,LANDMARKS,JUMPS,COBBLES,roadHeight,surfaceAt,QUAKE,RAMPS,BLOCKS,BOULDERS,quakeZone,rampLift,rampRise,BLOCK_POP,BLOCK_RISE};
})(typeof window!=='undefined'?window:globalThis);
