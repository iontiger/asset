#!/usr/bin/env python3
"""CNN 공포·탐욕 지수 → _site/fg.json {score, prev, ts}.

브라우저에서 CNN 을 바로 못 부를 때(CORS · 차단) 앱이 이 파일을 대신 읽는다.
CNN 에서 못 받으면 지금 사이트의 fg.json 을 그대로 둔다 — 배포는 멈추지 않는다.
사용: fear_greed.py <out.json> [site_base_url]
"""
import json, sys, time, urllib.request

UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/124.0 Safari/537.36')
URL = 'https://production.dataviz.cnn.io/index/fearandgreed/graphdata'


def get(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode('utf-8'))


def main():
    out = sys.argv[1]
    site = sys.argv[2].rstrip('/') if len(sys.argv) > 2 else ''
    try:
        d = get(URL, {'User-Agent': UA, 'Accept': 'application/json',
                      'Origin': 'https://edition.cnn.com', 'Referer': 'https://edition.cnn.com/'})
        fg = d['fear_and_greed']
        res = {'score': float(fg['score']), 'prev': fg.get('previous_close'), 'ts': int(time.time() * 1000),
               'rating': fg.get('rating')}
        print('CNN fear & greed:', res)
    except Exception as e:
        print('CNN fetch failed:', e)
        if not site:
            return
        try:
            res = get(site + '/fg.json?t=%d' % time.time())
            print('kept site fg.json:', res)
        except Exception as e2:
            print('no previous fg.json:', e2)
            return
    with open(out, 'w') as f:
        json.dump(res, f)


if __name__ == '__main__':
    main()
