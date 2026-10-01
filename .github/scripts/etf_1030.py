#!/usr/bin/env python3
"""
연금 정기투자용 ETF · ETN 10:30 가격 — <출력폴더>/index.json + <출력폴더>/{ymd}.json
 - 평일 10:31(KST) 이후 첫 실행에서 오늘 10:30 가격을 받는다: 네이버 fchart 분봉에서 10:30 이전 마지막 분봉의 종가
 - 장이 안 열린 날(공휴일 등)은 대표 종목(KODEX 200) 분봉이 없으니 아무것도 쓰지 않는다
 - 지난 날짜는 지금 사이트의 파일을 내려받아 그대로 이어 쓴다 (최근 KEEP 거래일). 사이트에서 못 받으면 그 날은 빠진다
 - 오늘 파일에 빠진 종목은 12:00 전까지의 실행에서 그 종목만 다시 받는다
 - 어떤 경우에도 실패 코드로 끝내지 않는다 (배포를 막지 않게)
사용: python3 .github/scripts/etf_1030.py <출력폴더> <사이트 주소>
     python3 .github/scripts/etf_1030.py <출력폴더> --probe [종목코드...]   → 오늘 10:30 가격만 찍어 본다 (PR 확인용)
GITHUB_OUTPUT 에 changed=true|false (오늘 파일을 새로 쓰거나 고쳤으면 true)
"""
import concurrent.futures as cf, datetime as dt, json, os, re, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stoch_screen import get  # noqa: E402
from etf_bars import etf_codes  # noqa: E402

MINUTE = "https://fchart.stock.naver.com/sise.nhn?symbol={}&timeframe=minute&count=420&requestType=0"
KST = dt.timezone(dt.timedelta(hours=9))
PROBE = "069500"   # KODEX 200 — 이 종목에 오늘 분봉이 없으면 장이 안 열린 날
AT = "1030"
KEEP = 30


def price_at(code, ymd):
    """ymd 의 10:30 가격 (10:30 이전 마지막 분봉 종가). 분봉이 없으면 None"""
    for attempt in range(3):
        try:
            xml = get(MINUTE.format(code)).decode("euc-kr", "replace")
            best = None
            for m in re.finditer(r'data="([^"]+)"', xml):
                parts = m.group(1).split("|")
                d, c = parts[0], parts[4] if len(parts) > 4 else ""
                if d[:8] == ymd and d[8:12] <= AT and c not in ("", "null") and float(c) > 0:
                    best = int(float(c))
            return best
        except Exception:
            time.sleep(1 + attempt)
    return None


def output(changed):
    with open(os.environ.get("GITHUB_OUTPUT") or os.devnull, "a") as f:
        f.write("changed=%s\n" % ("true" if changed else "false"))


def restore(out, site):
    """지금 사이트의 index.json 과 날짜별 파일을 내려받는다 → 날짜 목록"""
    days = []
    try:
        idx = json.loads(get("%s/rb1030/index.json?t=%d" % (site, time.time())))
        for d in idx.get("days", [])[-KEEP:]:
            try:
                body = get("%s/rb1030/%s.json" % (site, d))
                json.loads(body)
                with open(os.path.join(out, d + ".json"), "wb") as f:
                    f.write(body)
                days.append(d)
            except Exception as e:
                print(f"  {d}.json 못 받음 — {e}")
    except Exception as e:
        print(f"사이트의 rb1030/index.json 을 못 받았어요 (처음이면 정상) — {e}")
    return days


def write_index(out, days):
    days = sorted(set(days))[-KEEP:]
    with open(os.path.join(out, "index.json"), "w", encoding="utf-8") as f:
        json.dump({"at": dt.datetime.now(KST).isoformat(timespec="seconds"), "time": "10:30", "days": days}, f, separators=(",", ":"))


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "rb1030"
    os.makedirs(out, exist_ok=True)
    now = dt.datetime.now(KST)
    today = now.strftime("%Y%m%d")

    if len(sys.argv) > 2 and sys.argv[2] == "--probe":
        codes = sys.argv[3:] or [PROBE, "195920", "360200"]
        for c in codes:
            print(f"{c} {today} 10:30 = {price_at(c, today)}")
        return

    site = (sys.argv[2] if len(sys.argv) > 2 else "").rstrip("/")
    days = restore(out, site) if site else []
    changed = False
    path = os.path.join(out, today + ".json")
    have = {}
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as f:
                have = json.load(f).get("p", {})
        except Exception:
            have = {}
    hm = now.strftime("%H%M")
    due = now.weekday() < 5 and hm > AT and (not have or hm < "1200")
    if due:
        if price_at(PROBE, today) is None and not have:
            print(f"{today}: {PROBE} 의 오늘 분봉이 없어요 — 장이 안 열린 날로 보고 건너뜀")
        else:
            try:
                codes = etf_codes()
            except Exception as e:
                codes = []
                print(f"::warning::종목마스터를 못 받아 10:30 가격을 받지 않았어요 — {e}")
            todo = [c for c in codes if c not in have]
            if todo:
                t0 = time.time()
                with cf.ThreadPoolExecutor(8) as ex:
                    got = dict(zip(todo, ex.map(lambda c: price_at(c, today), todo)))
                new = {c: p for c, p in got.items() if p}
                print(f"{today} 10:30 가격: {len(todo)}종목 시도 · {len(new)}종목 받음 ({time.time() - t0:.0f}초)")
                if new:
                    have.update(new)
                    with open(path, "w", encoding="utf-8") as f:
                        json.dump({"d": today, "t": "10:30", "at": now.isoformat(timespec="seconds"), "p": have}, f, separators=(",", ":"))
                    days.append(today)
                    changed = True
    else:
        print(f"{today} {hm}: 10:30 가격을 받을 때가 아니에요 (평일 10:31~ · 빠진 종목은 12:00 전까지)")
    if os.path.exists(path):
        days.append(today)
    # 오래된 날짜 파일 정리
    keep = sorted(set(days))[-KEEP:]
    for name in os.listdir(out):
        if re.fullmatch(r"\d{8}\.json", name) and name[:8] not in keep:
            os.remove(os.path.join(out, name))
    write_index(out, keep)
    print(f"rb1030: {len(keep)}일치 ({keep[0] if keep else '-'} ~ {keep[-1] if keep else '-'})")
    output(changed)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"::warning::10:30 가격 갱신 중 오류 — {e}")
        output(False)
