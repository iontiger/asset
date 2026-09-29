// 자산 현황 — 오프라인 실행용 서비스 워커.
// 같은 사이트의 파일(index.html · 아이콘 · briefing.json 등)은 늘 네트워크에서 먼저 받고 받은 것을 캐시에 둔다.
// 인터넷이 끊기면 캐시에 둔 마지막 것을 쓴다 — 그래서 새 버전 배포 · 새로고침 알림은 지금처럼 바로 반영된다.
// 서체(구글 폰트 · Pretendard)는 캐시에 있으면 그것을 쓴다. Supabase · 구글 시트 · 시세 API 등 다른 주소는 건드리지 않는다.
var CACHE = 'asset-v2';
var FONT_CACHE = 'asset-fonts-v1';
var SHELL = ['./', 'manifest.webmanifest', 'app-icon-192.png', 'app-icon-512.png', 'app-icon-180.png'];
var FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE && k !== FONT_CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// ?t= · ?build= 같은 캐시 무효화 꼬리표는 떼고 한 칸에 둔다
function cacheKey(url) {
  var u = new URL(url);
  u.search = '';
  u.hash = '';
  return u.href;
}

function networkFirst(req, key) {
  return fetch(req).then(function (res) {
    if (res && res.ok && res.type === 'basic') {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { return c.put(key, copy); });
    }
    return res;
  }, function (err) {
    return caches.open(CACHE).then(function (c) { return c.match(key); }).then(function (hit) {
      if (hit) return hit;
      if (req.mode === 'navigate') return caches.match(new URL('./', self.registration.scope).href);
      throw err;
    });
  });
}

function cacheFirst(req) {
  return caches.open(FONT_CACHE).then(function (c) {
    return c.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
        return res;
      });
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith('/sw.js')) return;
    // 페이지 자체는 주소 꼬리표와 상관없이 index.html 한 칸에 둔다
    var key = req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname === new URL('./', self.registration.scope).pathname
      ? new URL('./', self.registration.scope).href : cacheKey(req.url);
    e.respondWith(networkFirst(req, key));
    return;
  }
  if (FONT_HOSTS.indexOf(url.hostname) >= 0 && (url.hostname !== 'cdn.jsdelivr.net' || url.pathname.indexOf('/pretendard') >= 0)) {
    e.respondWith(cacheFirst(req));
  }
});
