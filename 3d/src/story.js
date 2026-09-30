/* ═══════ 클라라를 찾아라 — 섬의 비밀 이야기 퀘스트 · 분수대 괴물 꾸르륵 전투 ═══════
   포토 스팟 10곳을 다 찍기 전에는 보이지 않는다. 다 찍으면 팝업 "🔎 클라라를 찾아라".
   클라라부터 주민을 한 명씩 만나면(머리 위 ❗) 화면이 바뀌며 왼쪽 주인공 · 오른쪽 주민 · 가운데 메신저 같은 말풍선.
   주인공은 문장 두 개 중 하나를 골라 답하고, 주민은 비밀 조각(힌트)을 하나씩 알려 주며 다음에 만날 주민을 정해 준다.
   18명을 모두 만나면 비밀이 풀리고 — 광장 분수에서 문어 괴물 꾸르륵이 솟아올라 전투.
   전투: 바닥의 붉은 그림자(물폭탄 · 촉수)를 피하고, 눈이 노랗게 빛날 때 ⭐(F 키 · 별 버튼)을 던지면 크게 아프다.
   이기면 꾸르륵이 작고 착한 분수 요정이 되어 분수에 산다. 기록은 localStorage asset-village-3d-story. */
'use strict';
(function(){
const KEY='asset-village-3d-story';
const S={stage:'locked',i:0,won:0,tries:0};           // locked → chain(i: 만난 주민 수) → battle → done
try{Object.assign(S,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch{}};

/* ── 이야기 — 문자열은 주민의 말, [답1, 답2, 주민의 대답1, 주민의 대답2] 는 주인공이 고르는 곳 ── */
const CAST=[
 {who:'클라라',steps:['이 섬에는 비밀이 있어',
   ['비밀? 무슨 비밀인데?','에이, 설마… 농담이지?','쉿, 목소리 낮춰. 네가 찍은 포토 스팟 사진 10장을 다 봤거든.','농담 아니야. 네가 찍은 포토 스팟 사진 10장을 다 봤거든.'],
   '광장 분수 사진에만 물 밑에 커다란 그림자가 찍혀 있었어. 다른 사진엔 하나도 없는데.',
   ['그림자? 큰 물고기 아닐까?','나도 뭔가 이상하다고 느꼈어!','분수에 그렇게 큰 물고기가 살 리 없잖아.','역시! 너라면 알아챌 줄 알았어.'],
   '혼자서는 무서워서 못 알아보겠어. 카페 바리스타 겸손히님이 새벽마다 광장에서 이상한 소리를 들었대. 먼저 그분을 만나 봐!']},
 {who:'겸손히님',steps:['어서 와요. 클라라가 보냈죠? 새벽 소리 얘기를 들으러 왔군요.',
   ['네, 새벽에 무슨 소리를 들으셨어요?','커피 한 잔 주시면서 알려 주세요!','새벽 4시쯤 광장에서 "꾸르륵… 꾸르륵…" 하는 소리가 나요.','커피는 공짜예요. 그런데 그 소리는 좀 무섭답니다. "꾸르륵… 꾸르륵…"'],
   '게다가 요즘 분수대 물로 커피를 내리면 짭짤한 바닷물 맛이 나요.',
   ['분수에 바닷물이요? 말이 안 되는데…','누가 소금을 넣은 건 아닐까요?','그러니까요. 분수 밑이 바다랑 이어져 있기라도 한 걸까요?','소금이라기엔 미역 냄새까지 나는걸요.'],
   '새벽마다 광장을 산책하는 굿플렉티스님이라면 뭔가 봤을 거예요.']},
 {who:'굿플렉티스님',steps:['멍! 요즘 새벽 산책 때 광장만 가면 코가 근질근질해.',
   ['무슨 냄새가 나는데요?','혹시 뭘 보셨어요?','비릿한 바다 냄새! 그리고 분수대에서 길 쪽으로 축축한 자국이 나 있었어.','봤지! 분수대에서 길 쪽으로 축축한 자국이 쭉 나 있더라고.'],
   '발자국이 아니었어. 둥글둥글한 빨판 자국이 줄줄이… 여덟 줄이나!',
   ['빨판이면… 문어?!','여덟 줄이면 다리가 여덟 개라는 거네요.','문어라기엔 자국 하나가 내 머리만 했어. 멍…','맞아. 그런데 자국 하나가 내 머리만큼 컸어. 멍…'],
   '예전에도 이런 일이 있었는지는 경제 신문 기자 롱베이케이션님이 알 거야.']},
 {who:'롱베이케이션님',steps:['특종 냄새를 맡고 왔군요? 마침 오래된 신문 창고를 뒤지고 있었어요.',
   ['빨판 자국에 대한 기사가 있나요?','옛날에도 이상한 일이 있었어요?','바로 그 얘기예요. 100년 전 신문을 보세요.','있었죠. 100년 전 신문 1면에 실렸어요.'],
   '「바다 괴물 섬에 오르다 — 마을 사람들 힘 모아 샘에 가둬」 괴물 이름은 "꾸르륵"이래요.',
   ['꾸르륵! 카페에서 들은 소리랑 같아요!','가뒀다면… 그 샘이 어디예요?','그렇다면 이건 100년 만의 특종이군요!','기사에는 "마을 한가운데 샘"이라고만 적혀 있어요.'],
   '괴물이 어떻게 잠들었는지는 옛이야기를 모으는 동화 작가 윈터드림이 알 거예요.']},
 {who:'윈터드림',steps:['꾸르륵 이야기? 우리 할머니가 들려주던 동화가 있어.',
   ['어떤 동화예요?','동화가 진짜일 수도 있나요?','「샘물 아래 잠든 거인」이야. 들어 봐.','동화는 늘 진짜에서 시작하는걸. 「샘물 아래 잠든 거인」 들어 볼래?'],
   '거인은 겨울엔 깊이 잠들고, 꽃이 피면 조금씩 눈을 떠. 그리고 백 번째 봄에 완전히 깨어난대.',
   ['올해가 혹시 백 번째 봄…?','그래서 요즘 소리가 나는 거군요.','신문이 100년 전이었다면… 맞아, 바로 올봄이야!','맞아. 거인이 기지개를 켜고 있는 거야.'],
   '밤마다 섬을 떠도는 료멘스쿠나가 뭔가 봤다고 자랑하더라.']},
 {who:'료멘스쿠나',steps:['크크큭. 너도 그걸 보러 왔구나?',
   ['그거라니요? 뭘 보셨는데요?','장난치지 말고 알려 주세요!','한밤중 광장 분수에서 노란 눈 두 개가 번쩍! 날 쳐다봤지.','장난 아니야, 크크. 한밤중 분수에서 노란 눈 두 개가 번쩍했어.'],
   '돌멩이를 던졌더니 눈이 번쩍 빛나면서 쏙 숨더라. 빛날 때 맞으면 아픈가 봐.',
   ['눈이 빛날 때가 약점이군요!','돌을 던지다니, 용감하시네요.','그래, 기억해 둬. 빛나는 눈을 노려!','크크, 무모한 거지. 하지만 빛나는 눈이 약점인 건 확실해.'],
   '더 옛날 얘기는 시를 쓰는 해의호흡님한테 물어봐.']},
 {who:'해의호흡님',steps:['바람이 전해 준 오래된 시가 있어요. 들려 드릴까요?',
   ['네, 들려주세요.','시에 힌트가 있나요?','귀를 기울여 보세요.','시는 언제나 힌트예요. 들어 보세요.'],
   '"물이 솟는 곳 아래 / 여덟 팔이 잠들고 / 다이아의 빛이 문을 잠그네"',
   ['물이 솟는 곳… 광장 분수!','다이아의 빛이 문을 잠근다…?','그래요. 이 섬에서 물이 솟는 곳은 광장 분수뿐이죠.','옛사람들이 다이아몬드로 봉인을 했다는 뜻 같아요.'],
   '요즘 분수 물이 이상하게 줄어든대요. 숫자를 잘 보는 원조익평님께 물어보세요.']},
 {who:'원조익평',steps:['어흥, 숫자는 거짓말을 안 하지. 분수 물 사용량 차트를 봤나?',
   ['차트요? 어떻게 나오는데요?','물이 줄어든다는 게 사실이에요?','봄이 오고 나서 매일 급락이야. 바닥이 안 보여.','사실이지. 봄부터 매일 급락, 바닥이 안 보여.'],
   '누가 물을 마시고 있는 거야. 그것도 하루에 호수 하나만큼!',
   ['괴물이 몸을 키우고 있는 거군요.','그럼 곧 분수가 말라 버리겠어요.','정답. 물을 먹고 덩치를 불리는 중이지.','마르기 전에 뭔가 튀어나올 거야. 길게 보고 대비하자고.'],
   '사진사 우울라프님이 밤새 분수를 찍었다던데, 증거를 확인해 봐.']},
 {who:'우울라프님',steps:['쉿, 이 사진 좀 봐요. 분수를 밤새 장노출로 찍은 거예요.',
   ['물 위에 뭔가 번져 있네요?','어… 이거 촉수 아니에요?','자세히 보면 긴 팔 여러 개가 물 밖으로 뻗어 있어요.','맞아요. 긴 팔이 물 밖으로 여러 개 뻗어 있죠.'],
   '새벽 3시에 팔이 제일 많이 나와 있었어요. 뭔가를 찾는 것처럼 더듬더듬.',
   ['뭘 찾는 걸까요?','무섭지만… 사진은 멋지네요.','선물을 잃어버렸다는 산타우찬이 얘기가 떠오르네요.','고마워요. 이 팔이 뭘 찾는지는 산타우찬이가 알지도 몰라요.'],
   '산타우찬이를 만나 보세요. 작년 크리스마스에 광장에서 무슨 일이 있었대요.']},
 {who:'산타우찬이',steps:['호호호! 작년 크리스마스 얘기 들으러 왔구나?',
   ['선물을 잃어버리셨다면서요?','크리스마스에 무슨 일이 있었어요?','분수 옆에 선물 자루를 잠깐 내려놨는데, 첨벙! 물속으로 끌려 들어갔지.','선물 자루를 분수 옆에 내려놨는데, 첨벙! 물속으로 사라졌어.'],
   '그 자루엔 반짝이 장식이 가득했어. 괴물은 반짝이는 걸 좋아하면서도 눈부셔하나 봐.',
   ['그래서 다이아몬드 빛에 약한가 봐요.','반짝이는 걸로 유인할 수도 있겠네요.','맞아, 좋아하면서도 눈이 부셔서 꼼짝 못 하지. 호호!','호호, 좋은 생각이야. 반짝이 별을 기억해 둬.'],
   '그 뒤로 이상한 편지가 온다던 엽서 배달부 까미유데물랭님을 만나 봐.']},
 {who:'까미유데물랭님',steps:['마침 잘 왔어요! 주소가 이상한 편지들이 자꾸 와요.',
   ['어디로 가는 편지인데요?','누가 보낸 편지예요?','받는 곳이 전부 "광장 분수 아래"예요.','보낸 사람은 "바다 친척들"… 받는 곳은 "광장 분수 아래"예요.'],
   '봉투는 젖어 있고, 미역이 붙어 있고, 글씨는 "꾸르륵 꾸르륵"뿐이에요.',
   ['바다 친척들이 깨우러 오는 거군요.','편지를 읽을 수 있는 사람이 있을까요?','그런 것 같아요. 봉인이 약해졌다는 뜻이겠죠.','옛날 글을 읽는 사서님이라면 알 거예요.'],
   '도서관 사서 편안하게님께 이 편지를 보여 드려요.']},
 {who:'편안하게님',steps:['부엉, 이 책을 찾아 두었어요. 『섬의 전설』 마지막 장이에요.',
   ['봉인에 대해 나와 있나요?','편지 글씨도 읽을 수 있어요?','네. "마을 사람들이 다이아몬드로 샘을 잠갔다"고 적혀 있어요.','"깨어나라, 백 번째 봄이다"라는 뜻이에요. 그리고 봉인은 다이아몬드였대요.'],
   '그런데 다이아몬드가 섬 곳곳으로 흩어지면서 봉인이 약해졌어요. 숨은 다이아몬드들이 바로 그 조각이에요.',
   ['다이아를 모은 게 봉인을 풀어 버린 거예요?!','그럼 다시 봉인할 수 있을까요?','걱정 마요. 흩어진 순간부터 이미 풀리고 있었어요.','다시 잠그려면 먼저 괴물을 얌전하게 만들어야 해요.'],
   '괴물의 몸에 대해선 연구원 티바이러스가 분수 물을 조사하고 있어요.']},
 {who:'티바이러스',steps:['흐흥, 분수 물 분석 결과가 나왔어. 놀라지 마.',
   ['뭐가 나왔어요?','괴물의 정체가 밝혀졌나요?','끈적끈적한 점액! 거대한 문어의 것이야.','정체는 거대한 문어형 생물이야. 물속에 점액이 가득해.'],
   '게다가 점액에 빛 반응이 있어. 빛을 받으면 몸이 딱딱하게 굳어서 잠깐 움직이질 못해.',
   ['빛이 약점이군요.','그럼 낮에 싸우는 게 유리하겠네요.','정확해. 눈이 빛날 때가 바로 몸이 굳는 순간이야.','맞아. 그리고 눈이 빛나는 순간을 노려.'],
   '괴물이 싫어하는 게 또 있는지는 꽃집 아울러님께 물어봐.']},
 {who:'아울러님',steps:['음메… 광장 화단 꽃들이 자꾸 시들어서 속상했는데, 이유가 있었군요.',
   ['괴물 때문에 꽃이 시든 거예요?','괴물이 싫어하는 꽃이 있을까요?','네, 짠물이 흙으로 스며들었어요. 그런데 한 가지 꽃만은 멀쩡했어요.','있어요! 딱 한 가지 꽃만은 멀쩡했거든요.'],
   '바로 해바라기요. 해를 닮은 꽃 근처엔 빨판 자국이 하나도 없었어요.',
   ['역시 빛을 싫어하는군요.','해바라기를 들고 가야 할까요?','네. 괴물은 빛과 반짝임을 겁내요.','호호, 대신 반짝이 별을 던지는 게 더 좋을 거예요.'],
   '괴물을 이기는 방법이 적힌 책장이 있대요. 책방 주인 오키오키님께 가 봐요.']},
 {who:'오키오키님',steps:['찾았어요! 『섬의 전설』에서 찢겨 나간 한 장이 우리 책방 헌책 속에 있었어요.',
   ['뭐라고 적혀 있어요?','어떻게 이기는지 나와 있나요?','"괴물과 맞서는 법"이라는 제목이에요!','네! "괴물과 맞서는 법" 세 줄이 적혀 있어요.'],
   '하나, 바닥에 붉은 그림자가 생기면 피하라. 둘, 눈이 빛날 때 반짝이 별을 던져라. 셋, 혼자 싸우지 마라.',
   ['혼자 싸우지 말라니… 친구가 필요하겠네요.','붉은 그림자, 빛나는 눈. 외웠어요!','맞아요. 마을 모두가 응원하고 있어요.','좋아요! 그리고 행운도 조금 필요할 거예요.'],
   '행운이라면 복권 꿈나무 스피또꿈나무가 최고죠.']},
 {who:'스피또꿈나무',charm:1,steps:['긁어 볼까? 대박! 너 주려고 행운의 부적을 뽑아 뒀어!',
   ['행운의 부적이요?','저한테 주는 거예요?','응! 전투에서 한 번 더 버틸 수 있게 해 줘. (하트 +1 ❤️)','당연하지! 전투에서 하트가 하나 더 생겨. (하트 +1 ❤️)'],
   '그리고 이상한 꿈을 꿨어. 분수가 하늘까지 솟구치고, 그 안에서 노란 눈이 날 봤어.',
   ['곧 깨어날 거라는 예지몽이네요.','꿈이 맞으면 대박이 아니라 대참사인데요.','응, 오늘 아침 신문에도 뭔가 났대.','헤헤, 그래도 네가 있으니 대박일 거야!'],
   '신문 배달부 조만간은퇴님이 오늘 신문을 가지고 있어!']},
 {who:'조만간은퇴님',steps:['호외요, 호외! 따끈따끈한 오늘 신문이에요.',
   ['뭐라고 났어요?','괴물 얘기예요?','「광장 분수 수위 급상승! 바닥에서 거품이 부글부글」','바로 그거예요. 「광장 분수 수위 급상승, 거품 부글부글」'],
   '이제 시간이 없어요. 오늘 밤이 되기 전에 깨어날 거예요.',
   ['제가 막을게요!','마을 사람들을 대피시켜야 해요.','든든하네요! 은퇴는 조금 미뤄야겠어요.','제가 신문으로 알릴게요. 당신은 괴물을 막아 줘요.'],
   '마지막으로 마을 마스코트 포롱이를 만나요. 포롱이가 모두의 응원을 모아 두었대요.']},
 {who:'포롱이',final:1,steps:['포롱! 드디어 왔구나! 섬 사람들 모두 네 얘기를 하고 있어.',
   ['비밀을 다 알아냈어. 괴물은 분수 아래에 있어!','꾸르륵을 막으러 가야 해.','맞아! 100년 동안 분수 아래 잠든 문어 괴물 꾸르륵!','맞아! 백 번째 봄에 깨어나는 분수 괴물 꾸르륵!'],
   '모두의 응원을 모았어. 붉은 그림자를 피하고, 눈이 빛날 때 반짝이 별을 던져! (F 키 · ⭐ 버튼)',
   ['좋아, 광장 분수로 가자!','모두 고마워. 꼭 이기고 올게!','뽀잉! 광장에 가면 괴물이 나타날 거야!','포롱! 광장 분수에서 응원할게!']]}];
const N=CAST.length;
const ROAD_TXT={'부동산':'북서쪽 길','예금':'남서쪽 길','증권':'북동쪽 길','장기':'남동쪽 호수 길','부채':'남쪽 선착장 길','north':'북쪽 길'};
function where(name){const L=NPC_LANES[name];if(!L)return '섬 어딘가';const r=ROAD_TXT[L[0]]||'길';return r+' '+(L[1]<.3?'광장 가까운 쪽':L[1]>.55?(L[0]==='north'?'끝 전망대 쪽':'바닷가 쪽 끝'):'가운데쯤')}
const npcBy=name=>npcGroups.find(n=>n.name===name);
const hero=()=>characterGroups.find(c=>c.root.visible)||characterGroups[0];
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const beep=(f,d,len=.14,type='triangle',v=.04)=>{try{if(playLoud())tone(f,d,len,type,v)}catch{}};
const target=()=>S.stage==='chain'&&S.i<N?CAST[S.i].who:null;

/* ── 머리 위 ❗ — 다음에 만날 주민 ── */
const markTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#ffd23f';x.strokeStyle='#8a5a00';x.lineWidth=8;x.beginPath();x.arc(64,64,54,0,7);x.fill();x.stroke();x.fillStyle='#5a3a00';x.font='900 84px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('!',64,70);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t})();
const mark=new THREE.Sprite(new THREE.SpriteMaterial({map:markTex,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));mark.scale.setScalar(1.1);mark.renderOrder=9;mark.visible=false;scene.add(mark);

/* ── 대화 화면 ── */
const box=document.createElement('div');box.id='storyTalk';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
box.innerHTML=`<div class="st-bg"></div><div class="st-stage">
<figure class="st-p st-me"><div class="st-img"><img alt=""></div><figcaption><b>나</b><small>탐험가</small></figcaption></figure>
<section class="st-chat"><div class="st-head"><span class="st-title">🔎 클라라를 찾아라</span><span class="st-prog"></span><button class="st-x" aria-label="대화 닫기">✕</button></div>
<div class="st-log" aria-live="polite"></div><div class="st-choices"></div></section>
<figure class="st-p st-npc"><div class="st-img"><img alt=""></div><figcaption><b></b><small></small></figcaption></figure></div>`;
document.body.appendChild(box);
const $b=q=>box.querySelector(q),log=$b('.st-log'),choices=$b('.st-choices');
const T={on:false,npc:null,run:0,pick:null,cool:0};

// 초상화 — 캐릭터 정면을 한 번 그려 가운데를 잘라 쓴다(대화 화면이 덮으니 깜빡임이 보이지 않는다)
const _bb=new THREE.Box3(),_cv=new THREE.Vector3(),_sz=new THREE.Vector3();
function portrait(root,side,hide){const hv=hide&&hide.visible;try{if(hide)hide.visible=false;const c=camera,sp=c.position.clone(),sq=c.quaternion.clone(),sf=c.fov,va=c.view&&c.view.enabled;
  _bb.setFromObject(root);_bb.getCenter(_cv);_bb.getSize(_sz);const h=Math.max(1.2,_sz.y),ry=root.rotation.y+side*.45,fov=30,d=h*.62/Math.tan(fov*Math.PI/360)+.6;
  if(va)c.clearViewOffset();c.fov=fov;c.position.set(_cv.x+Math.sin(ry)*d,_cv.y+h*.12,_cv.z+Math.cos(ry)*d);c.lookAt(_cv.x,_cv.y+h*.02,_cv.z);c.updateProjectionMatrix();c.updateMatrixWorld();
  const labels=[];scene.traverse(o=>{if(o.isSprite&&o.visible&&o!==mark){labels.push(o);o.visible=false}});mark.visible=false;
  renderScene();const src=renderer.domElement,s=Math.min(src.width,src.height),cv=document.createElement('canvas');cv.width=cv.height=300;cv.getContext('2d').drawImage(src,(src.width-s)/2,(src.height-s)/2,s,s,0,0,300,300);
  labels.forEach(o=>o.visible=true);c.position.copy(sp);c.quaternion.copy(sq);c.fov=sf;c.updateProjectionMatrix();if(va)resize();return cv.toDataURL('image/jpeg',.86)}catch(e){console.error(e);return ''}finally{if(hide)hide.visible=hv}}

const wait=ms=>new Promise(r=>setTimeout(r,ms));
function bubble(who,text,cls=''){const m=document.createElement('div');m.className='st-msg '+who+' '+cls;m.innerHTML=`<span class="st-name">${who==='npc'?esc(T.npc.name):'나'}</span><p>${esc(text)}</p>`;log.appendChild(m);log.scrollTop=log.scrollHeight;return m}
async function npcSay(text,run){const t=bubble('npc','','typing');t.querySelector('p').innerHTML='<i></i><i></i><i></i>';beep(660,0,.05,'sine',.02);
  await wait(Math.min(1300,450+text.length*14));if(run!==T.run)throw 0;t.classList.remove('typing');t.querySelector('p').textContent=text;log.scrollTop=log.scrollHeight;beep(880,0,.08,'sine',.03)}
function choose(opts,run){return new Promise((ok,no)=>{choices.innerHTML=opts.map((o,k)=>`<button class="st-c" data-k="${k}"><kbd>${k+1}</kbd>${esc(o)}</button>`).join('');choices.classList.add('on');
  T.pick=k=>{if(run!==T.run)return no(0);T.pick=null;choices.classList.remove('on');choices.innerHTML='';ok(k)};
  choices.querySelectorAll('.st-c').forEach(b=>b.onclick=()=>T.pick&&T.pick(+b.dataset.k))})}
function finishCard(html,label,run){return new Promise((ok,no)=>{const card=document.createElement('div');card.className='st-next';card.innerHTML=html;log.appendChild(card);log.scrollTop=log.scrollHeight;
  choices.innerHTML=`<button class="st-c go"><kbd>↵</kbd>${esc(label)}</button>`;choices.classList.add('on');T.pick=()=>{if(run!==T.run)return no(0);T.pick=null;choices.classList.remove('on');choices.innerHTML='';ok()};choices.querySelector('.st-c').onclick=()=>T.pick&&T.pick(0)})}

async function talk(npc){const idx=S.i,entry=CAST[idx],run=++T.run,h=hero();T.on=true;T.npc=npc;
  // 서로 마주 보게 하고, 주민은 대화 동안 멈춘다
  const hp=h.root.position,np=npc.root.position;T.freeze={x:np.x,z:np.z,y:np.y,ry:Math.atan2(hp.x-np.x,hp.z-np.z)};npc.root.rotation.y=T.freeze.ry;player.angle=Math.atan2(np.x-hp.x,np.z-hp.z);try{placeCharacters(0,false)}catch{}keys={};
  const e=(ANIMALS[npc.animal]||{}).e||'';
  $b('.st-me img').src=portrait(h.root,1,npc.root);$b('.st-npc img').src=portrait(npc.root,-1,h.root);
  $b('.st-me b').textContent='나';$b('.st-me small').textContent=window.dpHero==='wife'?'탐험가 · 여':'탐험가 · 남';
  $b('.st-npc b').textContent=`${e} ${npc.name}`;$b('.st-npc small').textContent=npc.role||'';
  $b('.st-title').textContent=idx===0?'🔎 클라라를 찾아라':'🔎 섬의 비밀';$b('.st-prog').textContent=`비밀 조각 ${idx} / ${N-1}`;
  log.innerHTML='';choices.innerHTML='';choices.classList.remove('on');box.classList.remove('on');void box.offsetWidth;box.classList.add('on');try{sfx('news')}catch{}
  try{await wait(650);
    for(const st of entry.steps){if(typeof st==='string')await npcSay(st,run);else{const k=await choose(st.slice(0,2),run);bubble('me',st[k]);beep(523,0,.06,'triangle',.03);await wait(250);await npcSay(st[2+k],run)}}
    const last=entry.final,next=last?null:CAST[idx+1].who;
    if(entry.charm)S.charm=1;
    $b('.st-prog').textContent=`비밀 조각 ${idx+1} / ${N-1}`;
    await finishCard(last?`<b>🔓 섬의 비밀을 모두 알아냈어요!</b><span>광장 분수 아래에 100년 동안 잠든 문어 괴물 꾸르륵. 광장 분수로 가면 전투가 시작돼요.</span>`
      :`<b>🧩 비밀 조각 ${idx+1}</b><span>다음에 만날 주민: <em>${esc(next)}</em> · ${esc(where(next))}</span>`,last?'광장 분수로!':'알겠어, 찾아갈게!',run);
    S.i=idx+1;if(last)S.stage='battle';save();close(true);
    if(last){toast('⚔️ 광장 분수로 가세요 — 괴물 꾸르륵이 깨어나고 있어요!');}else toast(`🧩 비밀 조각 ${S.i} / ${N-1} — 다음은 ${next} (${where(next)})`,'gem');
    hud()}catch(err){if(err!==0)console.error(err)}}
function close(done){if(!T.on)return;T.run++;T.on=false;T.pick=null;box.classList.remove('on');T.freeze=null;T.cool=performance.now()+(done?1500:7000);T.away=!done;hud()}
$b('.st-x').onclick=()=>close(false);
addEventListener('keydown',e=>{if(!T.on)return;const k=e.key;if(k==='Escape'){close(false)}else if((k==='1'||k==='2')&&T.pick&&choices.querySelector('.st-c:not(.go)'))T.pick(+k-1);else if((k==='Enter'||k===' ')&&T.pick&&choices.querySelector('.st-c.go'))T.pick(0);else if(k==='Tab')return;e.preventDefault();e.stopImmediatePropagation()},true);
const _ib=inputBusy;inputBusy=function(){return _ib()||T.on};
// 퀘스트 주민과 대화 중이거나 곧 만날 때는 원래 도움말 창을 띄우지 않는다
const _on=openNewsForNpc;openNewsForNpc=function(npc){if(T.on||(npc&&npc.name===target()))return;return _on(npc)};
const _un=updateNpcs;updateNpcs=function(dt){_un(dt);if(T.freeze&&T.npc){const f=T.freeze,r=T.npc.root;r.position.set(f.x,f.y,f.z);r.rotation.y=f.ry}};

/* ═══════ 분수대 괴물 꾸르륵 ═══════ */
const FX0=0,FZ0=0;
const MON=new THREE.Group();MON.visible=false;scene.add(MON);
const skin=new THREE.MeshStandardMaterial({color:'#6d4fb0',roughness:.45,metalness:.05,emissive:new THREE.Color('#000000')}),belly=new THREE.MeshStandardMaterial({color:'#b79be6',roughness:.5}),
  spotM=new THREE.MeshStandardMaterial({color:'#4b3486',roughness:.5}),eyeW=new THREE.MeshStandardMaterial({color:'#fffbe8',roughness:.2,emissive:new THREE.Color('#ffd23f'),emissiveIntensity:0}),
  pupilM=new THREE.MeshStandardMaterial({color:'#15101f',roughness:.2}),suckM=new THREE.MeshStandardMaterial({color:'#e7c8f0',roughness:.5});
const body=new THREE.Group();MON.add(body);
const head=new THREE.Mesh(new THREE.SphereGeometry(2.4,32,24),skin);head.scale.set(1,1.18,1);head.position.y=2.3;head.castShadow=true;body.add(head);
const bel=new THREE.Mesh(new THREE.SphereGeometry(1.9,24,18),belly);bel.scale.set(1,.8,.6);bel.position.set(0,1.3,1.35);body.add(bel);
[[.9,3.6,1.9,.35],[-1.3,3.1,1.8,.28],[1.6,2.2,1.6,.22],[-.4,4.3,1.3,.3],[1.9,3.4,.4,.3],[-1.9,3.6,.6,.25]].forEach(([x,y,z,r])=>{const s=new THREE.Mesh(new THREE.SphereGeometry(r,12,10),spotM);s.position.set(x,y,z);s.scale.z=.35;s.lookAt(x*2,y,z*2);body.add(s)});
const eyes=[];for(const sx of [-1,1]){const g=new THREE.Group();g.position.set(sx*.95,2.75,2.02);body.add(g);const w=new THREE.Mesh(new THREE.SphereGeometry(.66,20,16),eyeW);g.add(w);const p=new THREE.Mesh(new THREE.SphereGeometry(.34,16,12),pupilM);p.position.set(0,-.05,.46);g.add(p);const lid=new THREE.Mesh(new THREE.SphereGeometry(.7,20,12,0,Math.PI*2,0,Math.PI/2),skin);lid.rotation.x=-.5;g.add(lid);eyes.push({g,p,lid})}
const mouth=new THREE.Mesh(new THREE.TorusGeometry(.55,.12,8,20,Math.PI),pupilM);mouth.position.set(0,1.75,2.3);mouth.rotation.z=Math.PI;body.add(mouth);
const arms=[];for(let a=0;a<8;a++){const ang=a/8*Math.PI*2+Math.PI/8,g=new THREE.Group();g.position.set(Math.sin(ang)*1.7,.5,Math.cos(ang)*1.7);g.rotation.y=ang;body.add(g);const segs=[];let par=g;
  for(let k=0;k<8;k++){const r=.55*(1-k/9.5),s=new THREE.Group();s.position.z=k?r*1.7:0;par.add(s);const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,10),skin);m.scale.z=1.3;m.castShadow=k<3;s.add(m);if(k>0&&k%2===0){const c=new THREE.Mesh(new THREE.SphereGeometry(r*.35,8,6),suckM);c.position.set(0,-r*.8,0);c.scale.y=.4;s.add(c)}segs.push(s);par=s}
  arms.push({g,segs,ph:a*.8})}
// 물 기둥 · 물보라
const spout=new THREE.Mesh(new THREE.CylinderGeometry(1.6,2.1,9,24,1,true),new THREE.MeshStandardMaterial({color:'#bfe9f0',transparent:true,opacity:.0,roughness:.1,depthWrite:false,side:THREE.DoubleSide}));spout.position.set(FX0,4.5,FZ0);spout.visible=false;scene.add(spout);
const drops=[];const dropM=new THREE.SpriteMaterial({map:dotTex,color:'#dff6fb',transparent:true,depthWrite:false});
function splash(x,y,z,n=24,sp=5){for(let i=0;i<n;i++){const s=new THREE.Sprite(dropM.clone());s.scale.setScalar(.35+Math.random()*.4);s.position.set(x,y,z);scene.add(s);const a=Math.random()*Math.PI*2,v=sp*(.4+Math.random()*.8);drops.push({s,vx:Math.cos(a)*v*.5,vy:v*(.8+Math.random()*.6),vz:Math.sin(a)*v*.5,t:0})}}
function dropTick(dt){for(let i=drops.length-1;i>=0;i--){const d=drops[i];d.t+=dt;d.vy-=14*dt;d.s.position.x+=d.vx*dt;d.s.position.y+=d.vy*dt;d.s.position.z+=d.vz*dt;d.s.material.opacity=Math.max(0,1-d.t/1.2);if(d.t>1.2){scene.remove(d.s);d.s.material.dispose();drops.splice(i,1)}}}
// 붉은 그림자(경고) · 물폭탄 · 별
const warnGeo=new THREE.CircleGeometry(1,40),ringGeo=new THREE.RingGeometry(.92,1,48);
function warnAt(x,z,r,dur){const g=new THREE.Group();const y=Math.max(terrainHeight(x,z),.12)+.14;g.position.set(x,y,z);g.rotation.x=-Math.PI/2;
  const f=new THREE.Mesh(warnGeo,new THREE.MeshBasicMaterial({color:'#ff3b3b',transparent:true,opacity:.18,depthWrite:false,toneMapped:false}));const ring=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:'#ff5a4a',transparent:true,opacity:.85,depthWrite:false,toneMapped:false}));
  f.scale.setScalar(r);ring.scale.setScalar(r);g.add(f,ring);g.renderOrder=3;scene.add(g);return {g,f,ring,r,x,z,t:0,dur}}
function killWarn(w){scene.remove(w.g);w.f.material.dispose();w.ring.material.dispose()}
const ballM=new THREE.MeshStandardMaterial({color:'#5fc3d6',roughness:.1,transparent:true,opacity:.85,emissive:new THREE.Color('#1c6f80'),emissiveIntensity:.4});
const starTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.translate(64,64);x.fillStyle='#fff3a0';x.shadowColor='#ffd23f';x.shadowBlur=18;x.beginPath();for(let i=0;i<10;i++){const r=i%2?22:54,a=i/10*Math.PI*2-Math.PI/2;x.lineTo(Math.cos(a)*r,Math.sin(a)*r)}x.fill();const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t})();

const B={on:false,phase:'',hp:36,max:36,hearts:3,maxHearts:3,t:0,next:0,glow:0,inv:0,cool:0,warns:[],balls:[],stars:[],slam:null,rise:0,flash:0,won:false,atk:0};
const bar=document.createElement('div');bar.id='bossBar';bar.innerHTML=`<div class="bb-top"><b>🐙 꾸르륵</b><span class="bb-hearts"></span></div><div class="bb-hp"><i></i></div><div class="bb-tip"></div>`;document.body.appendChild(bar);
const atkBtn=document.createElement('button');atkBtn.id='bossAtk';atkBtn.innerHTML='⭐<small>F</small>';atkBtn.setAttribute('aria-label','반짝이 별 던지기');document.body.appendChild(atkBtn);
const hurt=document.createElement('div');hurt.id='bossHurt';document.body.appendChild(hurt);
atkBtn.addEventListener('pointerdown',e=>{e.preventDefault();attack()});
atkBtn.addEventListener('click',e=>{if(e.detail===0)attack()});   // 키보드로 누른 경우
function tip(t){bar.querySelector('.bb-tip').textContent=t}
function barHud(){bar.querySelector('.bb-hp i').style.width=(B.hp/B.max*100).toFixed(1)+'%';bar.querySelector('.bb-hearts').textContent='❤️'.repeat(Math.max(0,B.hearts))+'🤍'.repeat(Math.max(0,B.maxHearts-B.hearts));bar.classList.toggle('glow',B.glow>0)}
function startBattle(){if(B.on)return;const G=window.dpGame||{};try{if(PLAY.mode)endPlay();if(riding)toggleBike(false);if(G.closeModal)G.closeModal()}catch{}
  Object.assign(B,{on:true,phase:'rise',hp:B.max,hearts:3+(S.charm?1:0),t:0,next:2.2,glow:0,inv:0,cool:0,rise:0,flash:0,atk:0});B.maxHearts=B.hearts;S.tries++;save();
  MON.visible=true;MON.scale.setScalar(1);MON.position.set(FX0,-9,FZ0);skin.color.set('#6d4fb0');spout.visible=true;bar.classList.add('on');atkBtn.classList.add('on');document.body.classList.add('boss-on');barHud();tip('분수가 부글부글 끓어올라요…');
  toast('🌊 광장 분수가 솟구쳐요 — 꾸르륵이 깨어났어요!');[196,165,131].forEach((f,i)=>beep(f,i*.18,.35,'sawtooth',.05));splash(FX0,1.5,FZ0,40,9)}
function endBattle(){B.on=false;B.warns.forEach(killWarn);B.warns=[];B.balls.forEach(b=>scene.remove(b.m));B.balls=[];B.stars.forEach(s=>scene.remove(s.s));B.stars=[];if(B.slam){B.slam=null}
  bar.classList.remove('on','glow');atkBtn.classList.remove('on');document.body.classList.remove('boss-on');spout.visible=false}
function attack(){if(!B.on||B.phase==='rise'||B.phase==='end'||B.cool>0)return;const h=hero();if(!h)return;const d=Math.hypot(player.x-FX0,player.z-FZ0);if(d>17){tip('너무 멀어요 — 분수 가까이 가서 던져요!');return}
  B.cool=.42;const p=h.root.position,s=new THREE.Sprite(new THREE.SpriteMaterial({map:starTex,transparent:true,depthWrite:false,toneMapped:false}));s.scale.setScalar(.9);s.position.set(p.x,p.y+1.4,p.z);scene.add(s);
  const tg=new THREE.Vector3();eyes[Math.random()<.5?0:1].g.getWorldPosition(tg);B.stars.push({s,a:s.position.clone(),b:tg,t:0});try{h.st.wave=.6}catch{}beep(1319,0,.08,'triangle',.035)}
function hitMonster(){const big=B.glow>0,dmg=big?3:1;B.hp=Math.max(0,B.hp-dmg);B.flash=.25;splash(FX0,4,FZ0+2,big?14:5,4);beep(big?1568:988,0,.1,'square',.03);if(big){beep(2093,.08,.12,'square',.03)}
  tip(big?`명중! 눈이 빛날 때라 ${dmg}배로 아파해요!`:'팅! 눈이 빛날 때 던지면 더 아파해요.');barHud();if(B.hp<=0)win()}
function hurtHero(){if(B.inv>0||B.phase==='end')return;B.hearts--;B.inv=1.3;hurt.classList.remove('on');void hurt.offsetWidth;hurt.classList.add('on');const h=hero();try{emote(h,'아야!')}catch{}beep(220,0,.25,'sawtooth',.05);barHud();
  if(B.hearts<=0)lose()}
function win(){B.phase='end';B.won=true;B.t=0;B.glow=0;eyeW.emissiveIntensity=0;tip('꾸르륵이 작아지고 있어요…');S.stage='done';S.won=(S.won||0)+1;save();
  setTimeout(()=>{try{gameFireworks(FX0,2,FZ0,9,10,18,1.2)}catch{}[784,988,1175,1568].forEach((f,i)=>beep(f,i*.12,.3,'sine',.05))},900);
  setTimeout(()=>{endBattle();hud();if(window.dpGame)dpGame.showModal(`<div class="eyebrow">QUEST CLEAR</div><h2>🎉 섬의 비밀을 파헤쳤어요!</h2><p>100년 동안 광장 분수 아래 잠들어 있던 문어 괴물 <b>꾸르륵</b>을 얌전하게 만들었어요. 이제 꾸르륵은 작고 착한 <b>분수 요정</b>이 되어 광장 분수에서 살아요.</p><p>클라라와 마을 주민 ${N-1}명이 모두 고마워해요. 🐙💕</p><div class="gm-actions"><button class="primary" data-act="close">좋아요!</button></div>`)},4200)}
function lose(){B.phase='end';B.won=false;B.t=0;tip('쓰러졌어요… 꾸르륵이 물속으로 숨어요.');save();
  setTimeout(()=>{endBattle();MON.visible=false;if(window.dpGame){dpGame.showModal(`<div class="eyebrow">TRY AGAIN</div><h2>💦 꾸르륵이 너무 강해요</h2><p>붉은 그림자가 생기면 재빨리 피하고, <b>눈이 노랗게 빛날 때</b> ⭐ 반짝이 별을 던지면 3배로 아파해요.</p><div class="gm-actions"><button data-act="close">나중에</button><button class="primary" data-act="retry">다시 도전</button></div>`);const r=document.querySelector('.game-modal [data-act=retry]');if(r)r.onclick=()=>{dpGame.closeModal();B.cool=0;setTimeout(startBattle,300)}}},2600)}

const _v=new THREE.Vector3();
function attackPattern(){const hp=B.hp/B.max,angry=hp<.5,px=player.x,pz=player.z;B.atk++;
  if(B.atk%3===0){// 촉수 내려치기
    const w=warnAt(px,pz,2.6,1.5);B.warns.push(w);B.slam={w,arm:arms[Math.floor(Math.random()*8)],t:0,x:px,z:pz};tip('촉수가 올라가요 — 붉은 그림자에서 벗어나요!');beep(147,0,.4,'sawtooth',.04)}
  else{const n=angry?5:3;for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,r=i?1.5+Math.random()*3:0;const w=warnAt(px+Math.cos(a)*r,pz+Math.sin(a)*r,1.5,1.2+i*.12);B.warns.push(w);
      const m=new THREE.Mesh(new THREE.SphereGeometry(.5,14,10),ballM);m.position.set(FX0,4.5,FZ0+1.5);m.visible=false;scene.add(m);B.balls.push({m,w,t:0,launch:w.dur-.55})}
    tip('물폭탄이에요 — 붉은 그림자를 피해요!');beep(262,0,.2,'sine',.04)}
  B.next=(angry?3.2:4)+Math.random()}

let lastT=performance.now();
function battleTick(dt){B.t+=dt;B.cool=Math.max(0,B.cool-dt);B.inv=Math.max(0,B.inv-dt);B.flash=Math.max(0,B.flash-dt);
  const gy=.2,sway=Math.sin(time*1.3)*.25;
  if(B.phase==='rise'){B.rise=Math.min(1,B.t/2.6);MON.position.y=-9+9.3*(1-Math.pow(1-B.rise,3));spout.material.opacity=.55*Math.sin(B.rise*Math.PI);spout.scale.y=.3+B.rise;if(Math.random()<dt*10)splash(FX0+(Math.random()-.5)*3,1.2,FZ0+(Math.random()-.5)*3,3,6);
    if(B.rise>=1){B.phase='fight';B.t=0;B.next=1.5;spout.visible=false;tip('붉은 그림자를 피하고, 눈이 빛날 때 ⭐ 던지기! (F 키 · 별 버튼)')}}
  else if(B.phase==='fight'){MON.position.y=gy+.3+Math.sin(time*1.7)*.25;
    const d=Math.hypot(player.x-FX0,player.z-FZ0);if(d>45){endBattle();MON.visible=false;toast('꾸르륵이 다시 분수 속으로 숨었어요 — 광장으로 돌아가면 다시 나타나요');return}
    if(B.glow>0){B.glow-=dt;if(B.glow<=0){tip('다시 공격해 와요 — 조심!')}}
    B.next-=dt;if(B.next<=0&&!B.warns.length)attackPattern()}
  else if(B.phase==='end'){if(B.won){const k=Math.min(1,B.t/2.5);MON.scale.setScalar(1-.8*k);MON.position.y=gy+.6+k*.9;skin.color.set('#6d4fb0').lerp(new THREE.Color('#f59ac0'),k);eyeW.emissiveIntensity=0}else{MON.position.y-=dt*4}}
  // 몸짓 — 좌우로 흔들고, 주인공을 바라본다
  if(B.phase!=='end'||B.won){const face=Math.atan2(player.x-FX0,player.z-FZ0);MON.rotation.y+=((face-MON.rotation.y+Math.PI*3)%(Math.PI*2)-Math.PI)*Math.min(1,dt*2);}
  body.rotation.z=sway*.12;skin.emissive.setRGB(B.flash*4,B.flash*4,B.flash*4);
  const glowK=B.glow>0?1:0;eyeW.emissiveIntensity+=((glowK?2.4:0)-eyeW.emissiveIntensity)*Math.min(1,dt*8);eyes.forEach(e=>{e.lid.rotation.x=B.glow>0?-1.3:-.5+Math.max(0,Math.sin(time*.9))*.08;_v.set(player.x,1.2,player.z);e.p.position.x=THREE.MathUtils.clamp(Math.sin(time*.7)*.08,-.12,.12)});
  arms.forEach((A,i)=>A.segs.forEach((s,k)=>{s.rotation.x=Math.sin(time*2.2+A.ph+k*.55)*.22+.12*(k>0);s.rotation.y=Math.cos(time*1.7+A.ph+k*.4)*.18}));
  // 경고 · 물폭탄 · 촉수
  for(let i=B.warns.length-1;i>=0;i--){const w=B.warns[i];w.t+=dt;const k=w.t/w.dur;w.ring.scale.setScalar(w.r*(1-.25*Math.sin(time*14)*.2));w.f.material.opacity=.15+.35*k;if(w.t>=w.dur){if(Math.hypot(player.x-w.x,player.z-w.z)<w.r+.25)hurtHero();splash(w.x,Math.max(terrainHeight(w.x,w.z),.1)+.2,w.z,12,5);killWarn(w);B.warns.splice(i,1);
      if(!B.warns.length&&B.phase==='fight'){B.glow=3;tip('지금이에요! 눈이 노랗게 빛나요 — ⭐ 던지기!');beep(1175,0,.1,'sine',.04);beep(1568,.1,.14,'sine',.04)}}}
  for(let i=B.balls.length-1;i>=0;i--){const b=B.balls[i];b.t+=dt;if(b.t<b.launch)continue;const f=Math.min(1,(b.t-b.launch)/.55);b.m.visible=true;const sx=FX0,sz=FZ0,sy=MON.position.y+2.2;b.m.position.set(sx+(b.w.x-sx)*f,sy+(terrainHeight(b.w.x,b.w.z)-sy)*f+Math.sin(f*Math.PI)*6,sz+(b.w.z-sz)*f);if(f>=1||!B.warns.includes(b.w)){scene.remove(b.m);b.m.geometry.dispose();B.balls.splice(i,1)}}
  if(B.slam){const s=B.slam;s.t+=dt;const k=Math.min(1,s.t/1.5),A=s.arm;const up=k<.8?k/.8:1-(k-.8)/.2*1.6;A.segs.forEach((g,j)=>{g.rotation.x-=up*.35})
    if(k>=1||!B.warns.includes(s.w)){B.slam=null;try{renderer.shadowMap.needsUpdate=true}catch{}}}
  for(let i=B.stars.length-1;i>=0;i--){const s=B.stars[i];s.t+=dt/.38;s.s.position.lerpVectors(s.a,s.b,Math.min(1,s.t));s.s.position.y+=Math.sin(Math.min(1,s.t)*Math.PI)*1.2;s.s.material.rotation+=dt*12;if(s.t>=1){scene.remove(s.s);s.s.material.dispose();B.stars.splice(i,1);if(B.phase==='fight')hitMonster()}}}

/* 이긴 뒤 — 작고 착한 분수 요정 꾸르륵 */
function fairyTick(){if(S.stage!=='done'||B.on)return;if(!MON.visible){MON.visible=true;MON.scale.setScalar(.2);skin.color.set('#f59ac0')}MON.position.set(FX0,1.35+Math.sin(time*2)*.12,FZ0);MON.rotation.y+=.004;
  eyeW.emissiveIntensity=0;arms.forEach((A,i)=>A.segs.forEach((s,k)=>{s.rotation.x=Math.sin(time*2.2+A.ph+k*.55)*.25+.1;s.rotation.y=Math.cos(time*1.7+A.ph+k*.4)*.18}))}
// 분수 꼭대기 장식 공(나무 모양)은 괴물이 나오면 가린다
let topper=null;scene.children.forEach(o=>{if(!topper&&o.isMesh&&o.geometry&&o.geometry.type==='SphereGeometry'&&Math.abs(o.position.x)<.01&&Math.abs(o.position.z)<.01&&Math.abs(o.position.y-1.9)<.01)topper=o});

/* ── 미니게임판 한 줄 · 팝업 ── */
$('#ghTip').insertAdjacentHTML('beforebegin','<div class="gh-row" id="ghStoryRow" hidden><span><b id="ghStoryT">🔎 클라라를 찾아라</b><small id="ghStory"></small></span><button class="gh-btn" id="ghStoryBtn">찾아가기</button></div>');
$('#ghStoryBtn').onclick=()=>{if(S.stage==='battle'){if(B.on)return;if(PLAY.mode)endPlay();beginWalk(true);travelTo({x:FX0+7,z:FZ0+7},null);return}
  if(S.stage==='done'){if(PLAY.mode)endPlay();beginWalk(true);travelTo({x:FX0+6,z:FZ0+6},null);return}
  const n=npcBy(target());if(!n)return;if(PLAY.mode)endPlay();beginWalk(true);travelTo({x:n.root.position.x,z:n.root.position.z},null)};
function hud(){const row=$('#ghStoryRow');if(!row)return;row.hidden=S.stage==='locked';if(row.hidden)return;const t=$('#ghStory'),b=$('#ghStoryBtn'),h=$('#ghStoryT');
  if(S.stage==='chain'){h.textContent=S.i===0?'🔎 클라라를 찾아라':'🔎 섬의 비밀';t.textContent=S.i===0?`클라라 · ${where('클라라')}`:`조각 ${S.i}/${N-1} · 다음 ${target()} · ${where(target())}`;b.textContent='찾아가기'}
  else if(S.stage==='battle'){h.textContent='⚔️ 분수 괴물 꾸르륵';t.textContent=B.on?'전투 중! 붉은 그림자를 피하고 빛나는 눈에 ⭐':'광장 분수로 가면 전투가 시작돼요';b.textContent='광장으로'}
  else{h.textContent='🐙 분수 요정 꾸르륵';t.textContent='섬의 비밀을 파헤쳤어요! 광장 분수에 살아요';b.textContent='보러 가기'}}
function unlockPopup(){S.stage='chain';S.i=0;save();hud();beep(784,0,.2,'sine',.04);beep(1175,.15,.3,'sine',.04);
  if(!window.dpGame)return;dpGame.showModal(`<div class="eyebrow">NEW QUEST</div><h2>🔎 클라라를 찾아라</h2><p>포토 스팟 10곳을 모두 찍었더니, 사진 한 장에 수상한 그림자가 찍혔어요.</p><p>북쪽 길을 걷는 발레리나 <b>🐰 클라라</b>가 뭔가 알고 있대요. 머리 위에 <b>❗</b>가 뜬 주민을 만나면 이야기가 시작돼요.</p><div class="gm-actions"><button data-act="close">나중에</button><button class="primary" data-act="story">찾아가기</button></div>`);
  const g=document.querySelector('.game-modal [data-act=story]');if(g)g.onclick=()=>{dpGame.closeModal();$('#ghStoryBtn').click()}}

/* ── 매 프레임 ── */
let unlockAt=0,hudT=0;
const _da=doAction;doAction=function(){if(B.on){attack();return}return _da()};
addEventListener('keydown',e=>{if(!B.on||T.on||e.repeat)return;if(e.key==='f'||e.key==='F'||e.code==='KeyF'){e.preventDefault();e.stopImmediatePropagation();attack()}},true);
// 다른 창(주인공 고르기·안내 창 등)이 떠 있으면 퀘스트 이벤트를 미룬다
const free=()=>walkish()&&!inputBusy()&&!document.querySelector('.game-modal.on,#heroPick.on');
const _ue=updateExtras;updateExtras=function(dt){_ue(dt);try{
  const now=performance.now(),rdt=Math.min(.1,(now-lastT)/1000);lastT=now;dropTick(rdt);
  // 잠금 풀기 — 포토 스팟을 다 찍고, 다른 창이 모두 닫힌 뒤 조금 있다가
  if(S.stage==='locked'){const P=window.dpPhoto&&dpPhoto.P;if(P&&P.open&&free()){if(!unlockAt)unlockAt=now+2500;else if(now>unlockAt)unlockPopup()}else unlockAt=0}
  // ❗ 표시 · 만나면 대화
  const who=target(),n=who&&npcBy(who);if(n&&prefs.light&&!n.root.visible)n.root.visible=true;
  if(n&&n.root.visible&&!T.on){const p=n.root.position;mark.visible=true;mark.position.set(p.x,p.y+3.1+Math.sin(time*3)*.15,p.z);
    const d=Math.hypot(p.x-player.x,p.z-player.z);if(T.away&&d>5)T.away=false;
    if(!T.away&&d<3.2&&now>T.cool&&free()&&!PLAY.mode)talk(n)}else mark.visible=false;
  // 전투
  if(S.stage==='battle'&&!B.on&&free()&&Math.hypot(player.x-FX0,player.z-FZ0)<13)startBattle();
  if(B.on)battleTick(rdt);else fairyTick();
  if(topper)topper.visible=!(B.on||S.stage==='done');
  if((hudT-=rdt)<=0){hudT=.5;hud()}
}catch(e){console.error(e)}};
hud();
window.dpStory={S,CAST,B,T,talk,startBattle,save,hud,unlock:()=>{if(S.stage==='locked')unlockPopup()},reset:()=>{Object.assign(S,{stage:'locked',i:0,won:0,tries:0,charm:0});save();hud()},
  jump:i=>{S.stage='chain';S.i=i;save();hud()}};
})();
