#!/usr/bin/env python3
# 네이버페이 증권 "AI 브리핑"(시황)의 가장 최신 글 하나를 briefing.json 으로 저장한다 — 휴대폰 투자 탭 맨 위 카드 뉴스.
# 브라우저에서는 네이버 API 를 바로 부를 수 없어서(CORS 막힘) 배포할 때와 매시 정각 무렵(3 · 23 · 43분)에 GitHub Actions 가 받아 둔다.
#
#   python3 briefing.py <저장할 파일> <사이트 주소> <이벤트 이름> <커밋 7자리>
#
# - 오늘(한국 시간) 글이 아직 없으면(자정 넘어 첫 글 전 · 글이 없는 날) 하루씩 거슬러 올라가 찾는다
# - 그 시의 첫 예약 실행(20분 전)인데 바로 전 시 글까지만 있으면(한 시간마다 올라오는 중) 이번 시 글을 15분까지 기다린다
#   (정각 글은 보통 10분 안에 올라온다. 장 마감 뒤처럼 더 안 올라오면 기다리기만 하고 끝)
# - 네이버에서 못 받으면 지금 사이트에 있는 briefing.json 을 그대로 쓴다 (카드가 사라지지 않게)
# - GITHUB_OUTPUT 에 deploy=true|false — 예약 실행에서 글이 그대로이고 사이트도 이 커밋이면 다시 올리지 않는다
import datetime, html, json, os, re, sys, time, urllib.request

API = 'https://m.stock.naver.com/front-api/briefing/market/list?date={}&pageSize=1'
POST = 'https://m.stock.naver.com/briefing/market/posts/{}'
UA = ('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 '
      '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
KST = datetime.timezone(datetime.timedelta(hours=9))
WAIT = 15 * 60   # 이번 시 글을 기다리는 최대 시간 (초)


def get(url, as_json=True):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Referer': 'https://m.stock.naver.com/briefing/market'})
    with urllib.request.urlopen(req, timeout=20) as r:
        body = r.read().decode('utf-8')
    return json.loads(body) if as_json else body


def clean(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', s or ''))).strip()


def newest():
    """가장 최신 글 — 오늘 글이 없으면 하루씩 거슬러 (최대 7일 전까지)"""
    today = datetime.datetime.now(KST).date()
    for back in range(8):
        items = get(API.format(today - datetime.timedelta(days=back)))['result']['items']
        if items:
            return items[0]
    return None


def posted(it):
    return datetime.datetime.strptime(it['briefingDate'] + ' ' + it['briefingHour'], '%Y-%m-%d %H').replace(tzinfo=KST)


def fetch(event):
    it = newest()
    now = datetime.datetime.now(KST)
    if it and event == 'schedule' and now.minute < 20:   # 그 시의 첫 확인에서만 (23 · 43분 확인은 기다리지 않음)
        hour = now.replace(minute=0, second=0, microsecond=0)
        if posted(it) == hour - datetime.timedelta(hours=1):   # 한 시간마다 올라오는 중인데 이번 시 글은 아직
            print('이번 시 글을 기다려요 (지금 최신: %s시)' % it['briefingHour'])
            end = time.time() + WAIT
            while time.time() < end:
                time.sleep(30)
                nxt = newest()
                if nxt and nxt['id'] != it['id']:
                    it = nxt
                    break
    if not it:
        return None
    lines = [clean(s) for s in (it.get('summary') or '').split('\n')]
    return {
        'id': it['id'],
        'date': it['briefingDate'],
        'hour': int(it['briefingHour']),
        'title': clean(it['title']),
        'points': [s for s in lines if s],   # 요약 한 줄 = 카드 한 장
        'url': POST.format(it['id']),
        'fetched': datetime.datetime.now(KST).isoformat(timespec='seconds'),
    }


def main():
    out, site, event, sha = sys.argv[1:5]
    site = site.rstrip('/')
    new = live = None
    try:
        new = fetch(event)
    except Exception as e:
        print('::warning::네이버 AI 브리핑을 받지 못했어요 — %s' % e)
    try:
        live = get('%s/briefing.json?t=%d' % (site, time.time()))
    except Exception as e:
        print('사이트에 있는 briefing.json 을 못 읽음 — %s' % e)
    data = new or live
    if data:
        with open(out, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
        print(json.dumps(data, ensure_ascii=False, indent=1))
    deploy = True
    if event == 'schedule':
        same = bool(live and data) and all(live.get(k) == data.get(k) for k in ('id', 'title', 'points'))
        if same:
            try:
                m = re.search(r'name="app-build" content="([0-9a-f]{7})', get('%s/?t=%d' % (site, time.time()), as_json=False))
                same = bool(m) and m.group(1) == sha
            except Exception:
                same = False
        deploy = not same
    print('deploy=%s' % ('true' if deploy else 'false (글도 사이트도 그대로)'))
    with open(os.environ.get('GITHUB_OUTPUT') or os.devnull, 'a') as f:
        f.write('deploy=%s\n' % ('true' if deploy else 'false'))


if __name__ == '__main__':
    main()
