"""DentPhoto 마을(3d/index.html) 만들기 — python3 3d/src/build.py

자산 현황(index.html)의 탐험 원본(#villageSrc)을 꺼내, 아래의 정확한 문자열 바꾸기(rep)로 자산 금액 · 기록을 걷어 내고
game.css · game.js(미니게임 · 계절 · 요트 …)를 덧붙여 3d/index.html 에 쓴다. 3d/index.html 은 직접 고치지 말고 여기서 만든다.
원본이 바뀌어 rep 가 맞지 않으면 assert 가 어느 문자열인지 알려 준다.
"""
import os,re
HERE=os.path.dirname(os.path.abspath(__file__))
ROOT=os.path.dirname(os.path.dirname(HERE))
src=open(os.path.join(ROOT,'index.html'),encoding='utf-8').read()
a=src.index('<script type="text/plain" id="villageSrc">')+len('<script type="text/plain" id="villageSrc">')
b=src.index('</body></html></script>',a)+len('</body></html>')
s=src[a:b].replace('<\\/script','</script').replace('<\\/SCRIPT','</script').replace('<\\!--','<!--')
def rep(a,b,count=1):
    global s
    n=s.count(a)
    assert n==count,(a[:80],n)
    s=s.replace(a,b)
# 제목
rep('<title>자산마을 · 우리 자산을 산책하다</title>','<title>자산마을 3D · 미니게임</title>')
# 마을 이름 — DentPhoto 마을 (왼쪽 위 로고 · 탭 제목 · 사진 아래 띠)
rep('<title>자산마을 3D · 미니게임</title>','<title>DentPhoto 마을</title>')
rep('<h1>자산마을</h1><small>ASSET VILLAGE</small>','<h1>DentPhoto 마을</h1><small>DENTPHOTO VILLAGE</small>')
rep('aria-label="자산마을 — 마을 전체 보기"','aria-label="DentPhoto 마을 — 마을 전체 보기"')
rep('aria-label="자산마을 3D 화면. 방향키 또는 WASD로 걷습니다. 구역에 도착하면 해당 자산이 자동으로 열립니다."','aria-label="DentPhoto 마을 3D 화면. 방향키 또는 WASD로 걷습니다."')
rep('<small>집과 나무, 그리고 우리의 자산</small>','<small>집과 나무, 그리고 반짝이는 다이아몬드</small>')
rep("x.fillText('⌂ 자산마을',20*k,H+foot/2);x.font=`600 ${15*k}px ${F}`;x.textAlign='right';x.fillText(refDate()+' · '+(mode==='all'?'우리 집':ownerName(mode))+' 순자산 '+compact(net)+'원',W-20*k,H+foot/2);",
    "x.fillText('⌂ DentPhoto 마을',20*k,H+foot/2);x.font=`600 ${15*k}px ${F}`;x.textAlign='right';x.fillText(photoStamp(),W-20*k,H+foot/2);")
# 사진 아래 띠: 순자산 대신 찍은 날짜 · 시각(시:분:초), 파일 이름도 같은 시각으로. 금액 계산(net)도 뺀다
rep("const net=visible.reduce((s,a)=>s+(debtRow(a)?-a.amount:a.amount),0);x.fillStyle='#22675e';","x.fillStyle='#22675e';")
rep("function takePhoto(){renderScene();","function photoStamp(sep=' ',tsep=':'){const d=new Date(),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+sep+p(d.getHours())+tsep+p(d.getMinutes())+tsep+p(d.getSeconds())}\nfunction takePhoto(){renderScene();")
rep("a.download='asset-village-'+refDate()+'.png';","a.download='dentphoto-village-'+photoStamp('_','')+'.png';")
rep("toast('사진을 저장했어요'+(prefs.hide?' — 금액은 가렸어요':''))","toast('📸 사진을 저장했어요')")
# 저장 키 분리 (자산 현황 탐험과 기록이 섞이지 않게)
for k in ['prefs','gems','built','fish','fng']:
    rep(f"'asset-village-{k}'",f"'asset-village-3d-{k}'",s.count(f"'asset-village-{k}'") or 1)
rep("const storageKey='asset-village-v1'","const storageKey='asset-village-3d-v1'")
rep("if(!EMBED)try{const saved=","if(false)try{const saved=")
# 데모 자산 → 금액 없는 마을 건물 (건물 크기만 정하는 값, 화면에는 안 보인다). 1년 전 · 오늘 두 기록이라 '공사 중'이나 증감 표시가 없다
m=re.search(r"function makeDemo\(\)\{.*?\n",s)
new_demo="""function makeDemo(){const defs=[['해바라기 집','부동산','me',8e8],['단풍나무 집','부동산','wife',6e8],['별빛 상점','증권','me',3e8],['구름 빵집','증권','wife',2e8],['보물 창고','예금','me',1.5e8],['비밀 창고','예금','wife',1e8],['호숫가 부두','장기','me',2e8],['버드나무 부두','장기','wife',1.5e8]];const ds=[new Date(Date.now()-365*864e5),new Date()].map(d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);const assets=[];ds.forEach(date=>defs.forEach(([name,group,owner,amount])=>assets.push({date,name,group,owner,amount})));return {owners:[{id:'me',name:'me'},{id:'wife',name:'wife'}],assets}}\n"""
s=s[:m.start()]+new_demo+s[m.end():]
# 구역 이름
rep("name:'증권거래소',sub:'가능성이 자라는 거리'","name:'상점가',sub:'북적북적 가게 거리'")
rep("name:'금고 산책길',sub:'차곡차곡 모은 여유'","name:'보물 창고길',sub:'반짝이는 산책길'")
rep("name:'오래오래 낚시터',sub:'시간과 함께 익어가는 자산'","name:'오래오래 낚시터',sub:'부두 끝에서 낚시해요'")
rep("name:'상환 정류장',sub:'가벼워지는 내일을 향해'","name:'버스 정류장',sub:'마을 버스가 서요'")
rep("name:'주택가',sub:'우리 자산의 든든한 터전'","name:'주택가',sub:'우리 동네'")
rep("sign(p,'ASSET EXCHANGE',0,4.85,3.34,8)","sign(p,'VILLAGE MARKET',0,4.85,3.34,8)")
rep("sign(p,'INVEST',0,2.7,1.21,2.3)","sign(p,'SHOP',0,2.7,1.21,2.3)")
# 이름표에 금액 · 소유자 대신 빈칸
rep("<small>${opts.asset?esc(compact(opts.asset.amount)+'원 · '+ownerName(opts.asset.owner)):''}</small>","")
# 낚시: 찌가 흔들릴 때 F → 릴 감기 미니게임
old_reel_head="function reelIn(){const F=PLAY.fish;if(!F)return;const v=visChars();if(F.phase==='bite'){const f=pickFish(F.where),cm=f[1]?Math.round(f[1]+Math.random()*(f[2]-f[1])):0;F.phase='catch';"
rep(old_reel_head,"function reelIn(){const F=PLAY.fish;if(!F)return;const v=visChars();if(F.phase==='reel')return;if(F.phase==='bite'){const f=pickFish(F.where),cm=f[1]?Math.round(f[1]+Math.random()*(f[2]-f[1])):0;if(f[1]&&window.gameReelStart){gameReelStart(F,f,cm);return}catchNow(F,f,cm)}\n  else if(F.phase==='wait'||F.phase==='cast'){if(v[0])emote(v[0],'앗!');F.phase='cast';F.t=0;F.biteAt=3+Math.random()*4;if(playLoud())noiseHit(1800,.8,.12,.04)}}\n// 낚아 올리기 — 릴 감기에 성공하면 (장화는 바로)\nfunction catchNow(F,f,cm){F.phase='catch';")
rep("[784,988,1175].forEach((n,i)=>tone(n,.12+i*.09,.12,'triangle',.04))}}\n  else if(F.phase==='wait'||F.phase==='cast'){if(v[0])emote(v[0],'앗!');F.phase='cast';F.t=0;F.biteAt=3+Math.random()*4;if(playLoud())noiseHit(1800,.8,.12,.04)}}",
    "[784,988,1175].forEach((n,i)=>tone(n,.12+i*.09,.12,'triangle',.04))}}")
rep("jig=F.phase==='bite'?Math.sin(F.t*30)*.06:0","jig=F.phase==='bite'||F.phase==='reel'?Math.sin(F.t*30)*.06:0")
rep("  else if(F.phase==='catch'){const m=F.catch.boot","  else if(F.phase==='reel'){bobber.position.set(F.bob.x+Math.sin(F.t*37)*.08,F.wy-.18-Math.abs(Math.sin(F.t*9))*.12,F.bob.z+Math.cos(F.t*31)*.08);bobber.rotation.set(0,0,Math.sin(F.t*25)*.4);if(Math.random()<dt*4)ripple(F.bob.x,F.wy,F.bob.z)}\n  else if(F.phase==='catch'){const m=F.catch.boot")
rep("sag=F.phase==='bite'||F.phase==='catch'?.05:.35","sag=F.phase==='bite'||F.phase==='reel'||F.phase==='catch'?.05:.35")
rep("t=PLAY.fish&&PLAY.fish.phase==='bite'?PLAY_TXT.bite:PLAY_TXT.wait","t=PLAY.fish&&PLAY.fish.phase==='reel'?PLAY_TXT.reel:PLAY.fish&&PLAY.fish.phase==='bite'?PLAY_TXT.bite:PLAY_TXT.wait")
rep("bite:'❗ 지금! 낚싯대 당기기'}","bite:'❗ 지금! 낚싯대 당기기',reel:''}")
# 주인공 — 고른 한 명만 (hero.js). 원본 스크립트가 마을을 처음 세우기 전에 고른 주인공을 읽어 둔다
rep("<script>\n/* Asset Village — original app data format","<script>try{window.dpHero=localStorage.getItem('asset-village-3d-hero')}catch(e){}</script>\n<script>\n/* Asset Village — original app data format")
rep("characterGroups.forEach(c=>c.root.visible=mode==='all'?(c.owner==='me'||data.owners.length!==1):c.owner===(ownerLook(mode)==='wife'?'wife':'me'))","characterGroups.forEach(c=>{c.root.visible=c.owner===(window.dpHero==='wife'?'wife':'me');c.shadow.visible=c.root.visible})")
# 낚시를 아주 쉽게 — 입질이 빨리 오고(1.5~4초), 찌가 오래 흔들린다(3.5초). 카메라는 뒤로 · 위로 물러나 말풍선과 낚은 물고기가 보이게
rep("F.biteAt=2.6+Math.random()*4.5;","F.biteAt=1.5+Math.random()*2.5;")
rep("if(F.t>1.3){F.phase='wait';F.t=0;F.biteAt=2+Math.random()*4;","if(F.t>3.5){F.phase='wait';F.t=0;F.biteAt=1.2+Math.random()*2;")
rep("F.biteAt=3+Math.random()*4;","F.biteAt=1.5+Math.random()*2.5;")
rep("off=[-F.dx*5.2+F.dz*3.8,4.6,-F.dz*5.2-F.dx*3.8];ly=.6}","off=[-F.dx*9.6+F.dz*5.8,7.4,-F.dz*9.6-F.dx*5.8];ly=2.2}")
# 목표봉 — 정상까지 오를 수 있게 (목표 금액 대신 늘 100%), 금액 · 순자산 글자는 모두 덴포토 · 등산 안내로
rep("const goal=villageGoal,prog=goal>0?goalProgress():0;","const goal=1,prog=1;")
rep("MTN.lim.visible=goal>0;","MTN.lim.visible=false;")
rep("uWalk:{value:new THREE.Color('#2a78d6')}","uWalk:{value:new THREE.Color('#c79a55')}")
rep("carve('목표봉',72,58);x.fillStyle='rgba(57,53,47,.55)';x.fillRect(52,116,W-104,3);\n  if(goal>0){carve(prefs.hide?'•••':rawCompact(goal),186,76);carve(prefs.hide?'•••원':Math.round(goal).toLocaleString('ko-KR')+'원',268,22)}else carve('목표 없음',190,40);",
    "carve('목표봉 정상',56,32);x.fillStyle='rgba(57,53,47,.55)';x.fillRect(52,90,W-104,3);carve('덴포토',178,92);x.fillRect(52,242,W-104,3);carve('DentPhoto',284,30);")
rep("f.lbl.el.innerHTML=`<b>${compact(goal*f.f)}원</b>`+(f.reached&&d?`<small>${esc(d.replace(/-/g,'.'))}</small>`:'')","f.lbl.el.innerHTML=f.k>=10?'<b>🏔 정상</b>':`<b>⛳ ${f.k}번째 쉼터</b>`")
rep("MTN.lblMe.el.innerHTML=`<b>지금 ${compact(householdNet())}원</b><small>목표의 ${pct}% · 여기까지 올라요</small>`;","MTN.lblMe.el.innerHTML='';")
rep("MTN.lblTop.el.innerHTML=goal>0?`<b>🏆 정상 ${compact(goal)}원</b><small>${esc(mtnEta())}</small>`:'<b>⛰ 목표봉</b><small>목표를 정하면 오를 수 있어요</small>';","MTN.lblTop.el.innerHTML='<b>🏔 덴포토 정상</b><small>💎 정상 바로 아래 💎 10번째 다이아</small>';")
rep("$('#location').textContent=on?`목표봉 정상 · ${MTN.goal>0?compact(MTN.goal)+'원 — '+mtnEta():'목표를 정하면 오를 수 있어요'}`:'목표봉 등산로';","$('#location').textContent=on?'목표봉 정상 · 덴포토 💎':'목표봉 등산로';")
rep("$('#location').textContent=atLimit?`여기가 지금 순자산 자리예요 · 목표의 ${(MTN.prog*100).toFixed(1)}% — 자산이 늘면 더 오를 수 있어요`:`목표봉 등산 중 · 목표의 ${Math.round(s/MTN.len*100)}% 지점 (${compact(MTN.goal*s/MTN.len)}원)`","$('#location').textContent=s>=MTN.len-1.5?'⛰ 목표봉 정상 · 덴포토':`⛰ 목표봉 등산 중 · 정상까지 ${Math.max(0,Math.round(100-s/MTN.len*100))}%`")
rep("toast(MTN.goal>0?`여기까지가 지금 순자산(${compact(householdNet())}원) 자리예요. 목표의 ${(MTN.prog*100).toFixed(1)}% — 자산이 늘면 더 높이 오를 수 있어요.`:'목표 금액을 정하면 목표봉에 오를 수 있어요.')","toast('⛰ 여기가 목표봉 꼭대기예요! 덴포토 바로 아래 등산로의 💎 는 주우셨나요?')")
rep("MTN.cheered=true;celebrate();sfx('gem');toast(`정상 도착! 목표 ${compact(MTN.goal)}원을 이뤘어요.`)","MTN.cheered=true;celebrate();sfx('gem');toast('🏔 목표봉 정상 도착! 덴포토 💎');if(window.gameSummit)gameSummit()")
rep("visible=latest.filter(a=>mode==='all'||a.owner===mode);","visible=latest.slice();")
rep("characterGroups.forEach((c,i)=>{if(riding&&c.root.visible){","characterGroups.forEach((c,i)=>{if(!c.root.visible){c.shadow.visible=false;return}if(riding){")
rep("toast(riding?'🚲 둘이 함께 자전거를 타요 — B 키나 🚲 버튼으로 내려요':'자전거에서 내렸어요')","toast(riding?'🚲 자전거를 타요 — B 키나 🚲 버튼으로 내려요':'자전거에서 내렸어요')")
# 마을 달력(season.js) — 공포 · 탐욕 지수 날씨와 네이버 뉴스는 불러오지 않는다. 목표봉 눈 높이는 달력이 정한다
rep("fetchNewsLatest();setInterval(()=>{if(!paused)fetchNewsLatest()},60000);fetchFearGreed();setInterval(()=>{if(!paused)fetchFearGreed()},60000);","")
rep("const snowAt={spring:37,summer:41.5,autumn:39,winter:23}[s]","const snowAt=window.gameSnowAt!=null?window.gameSnowAt:{spring:37,summer:41.5,autumn:39,winter:23}[s]")
rep("alp=base.clone().lerp(new THREE.Color(s==='autumn'?'#c6a55d':s==='winter'?'#dfe6e8':'#adb27b'),.55)","alp=base.clone().lerp(new THREE.Color(s==='autumn'?'#c6a55d':s==='winter'?'#f2f5f7':'#adb27b'),s==='winter'?.85:.55)")
rep("['realTime','실제 시각 낮 · 밤','3분마다 도는 대신 지금 시각에 맞춰요'],['season','계절 풍경','봄 벚꽃 · 가을 단풍 · 겨울 눈밭'],","")
# 우산은 비 올 때만 (눈 올 때는 안 쓴다)
rep("const s=seasonNow(),wet=weatherMode==='rain'||weatherMode==='snow';","const s=seasonNow(),wet=weatherMode==='rain';")
# 낚은 물고기는 머리 위(말풍선 뒤)가 아니라 카메라 쪽 옆에 크게 들어 보인다
rep("hx=fisher.root.position.x,hz=fisher.root.position.z,hy=fisher.root.position.y+3.2","hx=fisher.root.position.x+F.dz*1.3-F.dx*.4,hz=fisher.root.position.z-F.dx*1.3-F.dz*.4,hy=fisher.root.position.y+2.2")
rep("fishMesh.scale.setScalar(.55+Math.min(1.5,cm/38))","fishMesh.scale.setScalar((.55+Math.min(1.5,cm/38))*1.8)")
# 주민 이야기 창(npc.js) — 뉴스 대신 도움말 · 격언. 뉴스는 어디서도 불러오지 않는다 (id 는 원본이 쓰니 그대로 둔다)
rep("async function fetchNewsLatest(){await fetchNewsDirect();","async function fetchNewsLatest(){return;await fetchNewsDirect();")
rep("async function fetchNews(){if(newsFetching)return;","async function fetchNews(){return;if(newsFetching)return;")
rep('<div class="eyebrow" id="newsEyebrow">VILLAGE NEWS · NAVER FLASH</div><h2 id="newsTitle">오늘의 실시간 속보</h2><p id="newsStatus" class="news-status">최신 뉴스를 불러오는 중…</p>','<div class="eyebrow" id="newsEyebrow">VILLAGE TALK</div><h2 id="newsTitle">주민 이야기</h2><p id="newsStatus" class="news-status"></p>')
rep('<button class="tool primary news-refresh" id="newsRefresh">지금 새로고침</button>','<button class="tool primary news-refresh" id="newsRefresh">고마워요 👋</button>')
rep('aria-label="뉴스 닫기"','aria-label="닫기"')
# 요트 — 타는 동안 cameraMode='yacht' : 걷기 입력 멈춤, 카메라는 yacht.js 가, 틸트시프트 흐림 없음
rep("if(!inputBusy()&&cameraMode!=='section'){let turn=","if(!inputBusy()&&cameraMode!=='section'&&cameraMode!=='yacht'){let turn=")
rep("}else if(cameraMode==='section'){const d=sectionDistance","}else if(cameraMode==='yacht'){fov=window.gameYachtCam?gameYachtCam(desiredPos,desiredAim,dt):55}else if(cameraMode==='section'){const d=sectionDistance")
rep("cameraMode==='entering'?2.2:cameraMode==='walking'?6:3","cameraMode==='entering'?2.2:cameraMode==='walking'?6:cameraMode==='yacht'?(window.gameYachtDamp||4):3")
rep("FX.tilt=THREE.MathUtils.lerp(FX.tilt,walking?0:","FX.tilt=THREE.MathUtils.lerp(FX.tilt,walking||cameraMode==='yacht'?0:")

# 검토 후속 — 남아 있던 자산앱 흔적 · 요트 나침반
rep("label('증권거래소',[20,8.2,-17]","label('상점가',[20,8.2,-17]")
rep("label('금고 산책길',[-24,1.1,19.5]","label('보물 창고길',[-24,1.1,19.5]")
rep("label('상환 정류장',[-7,4,22]","label('버스 정류장',[-7,4,22]")
rep("예금:'금고 산책길 ›',증권:'증권거래소 ›',장기:'오래오래 낚시터 ›',부채:'상환 정류장 ›'","예금:'보물 창고길 ›',증권:'상점가 ›',장기:'오래오래 낚시터 ›',부채:'버스 정류장 ›'")
rep("예금:['gold','금고 산책길','#8a6a2a'],증권:['glass','증권거래소','#2c6856']","예금:['gold','보물 창고길','#8a6a2a'],증권:['glass','상점가','#2c6856']")
rep("부채:['bus','상환 정류장','#35566b']","부채:['bus','버스 정류장','#35566b']")
rep("['month','이번 달 변화 표시','건물 위 ▲▼ 증감 · 줄어든 곳의 비구름 · 구역별 %'],['hide','금액 가리기','모든 금액을 ••• 로 — 다른 사람에게 보여 줄 때'],","")
rep("'도착 · 사진 · 뉴스 · 기록 소리'","'도착 · 사진 · 다이아 · 낚시 소리'")
rep("buildBoard();fetchKospi();setInterval(()=>{if(!paused)fetchKospi()},18e5);","buildBoard();")
rep("function kospiText(){","function kospiText(){return '🛍 DentPhoto 마을 상점가 · 어서 오세요!  💎 숨은 다이아 10개를 찾아보세요  ⛵ 요트가 선착장에서 기다려요';")
rep("섬 구석 · 언덕 꼭대기 · 숲속 · 모래사장에 9개가 숨어 있어요.","섬 구석 · 언덕 꼭대기 · 숲속 · 모래사장, 목표봉 정상 바로 아래에 10개가 숨어 있어요.")
rep('💎 <b id="gemTop">0 / 9</b>','💎 <b id="gemTop">0 / 10</b>')
rep("{n:9,name:'다이아몬드 왕관',sub:'반짝이는 왕관 — 섬 탐험 완료 기념'}","{n:10,name:'다이아몬드 왕관',sub:'반짝이는 왕관 — 다이아 10개, 섬 탐험 완료 기념'}")
rep("hk=rewardOn(9)?'crownD'","hk=rewardOn(10)?'crownD'")
rep("m.rotation.set(0,F.a+Math.PI/2,Math.sin(F.t*14)*.4)","m.rotation.set(0,F.a,Math.sin(F.t*14)*.4)")
rep("`rotate(${-(cameraMode==='walking'||cameraMode==='entering'?viewHeading:yaw)*180/Math.PI}deg)`","`rotate(${-(cameraMode==='walking'||cameraMode==='entering'?viewHeading:cameraMode==='yacht'?Math.atan2(cameraAim.x-camera.position.x,cameraAim.z-camera.position.z):yaw)*180/Math.PI}deg)`")

# 스타일 · 미니게임 스크립트
# 덧붙이는 스크립트 — 순서대로 각자 <script>. 원본 스크립트의 최상위 const/let · 함수를 그대로 쓰고, 함수는 다시 대입해 덮어쓴다
JS_FILES=['game.js','fx.js','talk.js','hero.js','summit.js','season.js','npc.js','yacht.js','dental.js']
def read(f):return open(os.path.join(HERE,f),encoding='utf-8').read()
rep("</style></head>","</style><style>"+read('game.css')+"</style></head>")
assert s.rstrip().endswith('</body></html>')
s=s.rstrip()[:-len('</body></html>')]+''.join('<script>\n/* '+f+' */\n'+read(f)+'</script>\n' for f in JS_FILES)+"</body></html>\n"
open(os.path.join(ROOT,'3d','index.html'),'w',encoding='utf-8').write(s)
print(len(s))
