/* ═══════ 주인공 고르기 — 처음 들어오면 남 · 여 중 한 명을 고르고, 고른 한 명만 마을을 걷는다 ═══════
   고른 주인공은 이 브라우저에 기억한다 (window.dpHero 는 원본 스크립트보다 먼저 읽어 첫 화면부터 한 명만 보이게 한다).
   건물은 소유자와 상관없이 모두 그대로다 (mode 는 'all' 그대로 두고 캐릭터만 숨긴다). */
'use strict';
(function(){
const KEY='asset-village-3d-hero';
const pick=document.createElement('div');pick.id='heroPick';pick.setAttribute('role','dialog');pick.setAttribute('aria-label','주인공 고르기');
pick.innerHTML=`<div class="hp-card"><div class="hp-logo">DENTPHOTO VILLAGE</div><h2>DentPhoto 마을</h2><p>함께 걸을 주인공을 골라 주세요</p><div class="hp-row"><button type="button" data-hero="me"><div class="hp-face">👦</div><b>남자 주인공</b><small>동글동글 모험가</small></button><button type="button" data-hero="wife"><div class="hp-face">👧</div><b>여자 주인공</b><small>똥머리 탐험가</small></button></div></div>`;
document.body.appendChild(pick);
function apply(h){window.dpHero=h;try{REWARDS[0].name=h==='wife'?'꽃 화관':'탐험가 모자';REWARDS[0].sub=h==='wife'?'반짝이는 꽃 화관을 써요':'멋진 탐험가 모자를 써요';if(!$('#gemPanel').hidden)renderGemPanel()}catch{}characterGroups.forEach(c=>{c.root.visible=c.owner===h;c.shadow&&(c.shadow.visible=c.root.visible)});const t=$('#ghHero');if(t)t.textContent=h==='wife'?'👧 여자 주인공':'👦 남자 주인공';if(PLAY.mode)endPlay();try{placeCharacters(0,false);dressChibis()}catch(e){console.error(e)}}
function choose(h){try{localStorage.setItem(KEY,h)}catch{}apply(h);pick.classList.remove('on');toast(h==='wife'?'👧 여자 주인공과 함께 DentPhoto 마을을 걸어요':'👦 남자 주인공과 함께 DentPhoto 마을을 걸어요');try{$('#world').focus()}catch{}}
pick.querySelectorAll('[data-hero]').forEach(b=>b.onclick=()=>choose(b.dataset.hero));
// 숨긴 주인공 자리에서 말풍선이 뜨지 않게
const _emote=emote;emote=function(ch,kind){if(ch&&ch.root&&!ch.root.visible&&characterGroups.includes(ch))return;return _emote(ch,kind)};
window.dpPickHero=()=>{pick.classList.add('on');const b=pick.querySelector(`[data-hero="${window.dpHero||'me'}"]`);b&&b.focus()};
// 시작할 때마다 고른다 — 지난번 주인공이 먼저 골라져 있어 Enter 만 눌러도 된다
const saved=window.dpHero==='wife'?'wife':'me';apply(saved);pick.classList.add('on');setTimeout(()=>{const b=pick.querySelector(`[data-hero="${saved}"]`);b&&b.focus()},50);
addEventListener('keydown',e=>{if(!pick.classList.contains('on'))return;if(e.key==='Escape'&&window.dpHero){pick.classList.remove('on');e.preventDefault();e.stopImmediatePropagation()}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopImmediatePropagation();const bs=[...pick.querySelectorAll('[data-hero]')];bs[e.key==='ArrowLeft'?0:1].focus()}else if(['ArrowUp','ArrowDown','w','a','s','d','f',' ','b','h'].includes(e.key.toLowerCase?e.key.toLowerCase():e.key)){e.stopImmediatePropagation()}},true);
})();
