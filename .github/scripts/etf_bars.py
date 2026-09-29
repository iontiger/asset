#!/usr/bin/env python3
"""
연금 리밸런싱 차트용 ETF · ETN 일봉 — <출력폴더>/{code}.json 에 최근 100거래일 [ymd, 시가, 고가, 저가, 종가, 거래량].
 - 종목 목록: NH Plug 종목마스터 m_new_stock.mst 의 ETF · ETN (연금 리밸런서의 prices.json 과 같은 기준)
 - 일봉: 네이버 fchart. 오늘(KST) 봉은 빼서 전 영업일 종가까지만 — 신호 판단이 스크린(stoch_screen.py)과 같게
 - 못 받은 종목은 폴더에 이미 있던 파일(이전 캐시)을 그대로 둔다. 어떤 경우에도 실패 코드로 끝내지 않는다 (배포를 막지 않게)
사용: python3 .github/scripts/etf_bars.py <출력폴더>
"""
import concurrent.futures as cf, datetime as dt, json, os, re, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stoch_screen import FIELDS, RECORD, MST_URL, get  # noqa: E402

FCHART = "https://fchart.stock.naver.com/sise.nhn?symbol={}&timeframe=day&count=130&requestType=0"
KST = dt.timezone(dt.timedelta(hours=9))
KEEP = 100


def etf_codes():
    buf = get(MST_URL, 60)
    codes = []
    for i in range(0, len(buf) - len(buf) % RECORD, RECORD):
        rec, off, r = buf[i:i + RECORD], 0, {}
        for name, n in FIELDS:
            r[name] = rec[off:off + n].decode("cp949", "replace").strip()
            off += n
        if r["gVenture"] in ("8", "E") or r["sMarket"] == "A":
            codes.append(r["sCode"])
    return codes


def one(code, today, out):
    for attempt in range(3):
        try:
            xml = get(FCHART.format(code)).decode("euc-kr", "replace")
            rows = []
            for m in re.finditer(r'data="([^"]+)"', xml):
                d, o, h, l, c, v = m.group(1).split("|")
                if d < today and c and float(c) > 0:
                    rows.append([d, int(float(o or c)), int(float(h or c)), int(float(l or c)), int(float(c)), int(float(v or 0))])
            if not rows:
                return "empty"
            with open(os.path.join(out, code + ".json"), "w", encoding="utf-8") as f:
                json.dump({"code": code, "b": rows[-KEEP:]}, f, separators=(",", ":"))
            return "ok"
        except Exception:
            time.sleep(1 + attempt)
    return "fail"


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "rbbars"
    os.makedirs(out, exist_ok=True)
    try:
        codes = etf_codes()
    except Exception as e:
        print(f"::warning::종목마스터를 못 받아 ETF 일봉을 갱신하지 않았어요 — {e}")
        return
    today = dt.datetime.now(KST).strftime("%Y%m%d")
    t0 = time.time()
    with cf.ThreadPoolExecutor(8) as ex:
        res = list(ex.map(lambda c: one(c, today, out), codes))
    n = {k: res.count(k) for k in ("ok", "empty", "fail")}
    with open(os.path.join(out, "_meta.json"), "w", encoding="utf-8") as f:
        json.dump({"at": dt.datetime.now(KST).isoformat(timespec="seconds"), "codes": len(codes), **n}, f)
    print(f"ETF 일봉: {len(codes)}종목 · 성공 {n['ok']} · 비어 있음 {n['empty']} · 실패 {n['fail']} ({time.time() - t0:.0f}초)")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"::warning::ETF 일봉 갱신 중 오류 — {e}")
