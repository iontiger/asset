#!/usr/bin/env python3
"""
투자 탭 '포트폴리오 투자' 카드용 미국 ETF 일별 종가 · 원/달러 환율 → portfolio.json
 - 종가: 야후 파이낸스 차트 API (배당을 다시 넣은 수정종가 adjclose 로 수익률, 마지막 종가 close 로 주식수 계산)
   야후가 막히면 stooq 일봉 CSV 로 (이때는 수정종가 대신 종가)
 - 환율: 야후 KRW=X (원/달러), 안 되면 stooq usdkrw
 - 모든 종목에 값이 있는 날부터(가장 늦게 상장한 BAI 기준) 미국 거래일마다 한 줄: [날짜, 환율, 종목별 수정종가…]
   그날 환율이 없으면 직전 환율을 쓴다
 - 비중 · 주식수 계산은 앱(index.html 의 PF)에서 한다. 여기서는 값만 모은다
사용: python3 .github/scripts/portfolio.py <출력폴더> [--site <사이트 주소>]
     --site 를 주면 같은 시간대(6시간 단위)에 이미 받아 둔 결과가 사이트에 있으면 그대로 쓰고, 못 받으면 사이트 것을 쓴다.
     GITHUB_OUTPUT 에 changed=true|false
"""
import csv, datetime as dt, io, json, os, sys, time, urllib.request

TICKERS = ["DYNF", "IEMG", "SCHF", "BAI", "IBB", "SPY"]   # SPY = S&P500 비교용
NAMES = {
    "DYNF": "iShares U.S. Equity Factor Rotation Active",
    "IEMG": "iShares Core MSCI Emerging Markets",
    "SCHF": "Schwab International Equity",
    "BAI": "iShares A.I. Innovation and Tech Active",
    "IBB": "iShares Biotechnology",
    "SPY": "SPDR S&P 500",
}
KST = dt.timezone(dt.timedelta(hours=9))
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}


def get(url, timeout=30):
    last = None
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
                return r.read()
        except Exception as e:
            last = e
            time.sleep(2 * (i + 1))
    raise last


def yahoo(sym):
    """{ymd: (close, adjclose)}"""
    for host in ("query1", "query2"):
        try:
            j = json.loads(get(f"https://{host}.finance.yahoo.com/v8/finance/chart/{sym}?range=5y&interval=1d&events=div%2Csplit&includeAdjustedClose=true"))
            break
        except Exception as e:
            err = e
    else:
        raise err
    r = j["chart"]["result"][0]
    off = r["meta"].get("gmtoffset", 0)
    q = r["indicators"]["quote"][0]["close"]
    adj = (r["indicators"].get("adjclose") or [{}])[0].get("adjclose") or q
    out = {}
    for t, c, a in zip(r.get("timestamp") or [], q, adj):
        if c is None:
            continue
        d = dt.datetime.fromtimestamp(t + off, dt.timezone.utc).strftime("%Y%m%d")
        out[d] = (round(c, 4), round(a if a is not None else c, 4))
    return out


def stooq(sym):
    txt = get(f"https://stooq.com/q/d/l/?s={sym}&i=d").decode("utf-8", "replace")
    out = {}
    for row in csv.DictReader(io.StringIO(txt)):
        try:
            c = float(row["Close"])
        except (KeyError, ValueError):
            continue
        out[row["Date"].replace("-", "")] = (round(c, 4), round(c, 4))
    if not out:
        raise RuntimeError(f"stooq {sym}: 데이터 없음 ({txt[:80]!r})")
    return out


def series(sym, alt):
    try:
        s = yahoo(sym)
        if len(s) > 20:
            return s, "yahoo"
        raise RuntimeError("행이 너무 적음")
    except Exception as e:
        print(f"야후 {sym} 실패 — {e} → stooq {alt}")
        return stooq(alt), "stooq"


def fetch():
    px, src = {}, set()
    for t in TICKERS:
        px[t], s = series(t, t.lower() + ".us")
        src.add(s)
        print(f"{t}: {len(px[t])}일 ({min(px[t])}~{max(px[t])}, {s})")
    fx, s = series("KRW=X", "usdkrw")
    src.add(s)
    print(f"KRW=X: {len(fx)}일 ({min(fx)}~{max(fx)}, {s})")
    start = max(min(px[t]) for t in TICKERS)
    days = sorted(d for d in px["SPY"] if d >= start and all(d in px[t] for t in TICKERS))
    fxd = sorted(fx)
    rows, k, cur = [], 0, None
    for d in days:
        while k < len(fxd) and fxd[k] <= d:
            cur = fx[fxd[k]][0]
            k += 1
        if cur is None:
            continue
        rows.append([d, round(cur, 2)] + [px[t][d][1] for t in TICKERS])
    if len(rows) < 20:
        raise RuntimeError(f"공통 거래일이 {len(rows)}일 뿐")
    last = rows[-1][0]
    return {
        "runAt": dt.datetime.now(KST).isoformat(timespec="seconds"),
        "basisDate": f"{last[:4]}-{last[4:6]}-{last[6:]}",
        "tickers": TICKERS,
        "names": NAMES,
        "close": {t: px[t][last][0] for t in TICKERS},   # 마지막 종가 (주식수 계산용, 수정 전)
        "fx": round(fx[fxd[-1]][0], 2),                    # 가장 최근 환율
        "fxDate": f"{fxd[-1][:4]}-{fxd[-1][4:6]}-{fxd[-1][6:]}",
        "src": "+".join(sorted(src)),
        "rows": rows,
    }


def slot(run_at):
    d = dt.datetime.fromisoformat(run_at)
    return d.date().isoformat() + "-" + str(d.hour // 6)


def summary(d):
    r0, r1 = d["rows"][0], d["rows"][-1]
    lines = [f"기간 {r0[0]}~{r1[0]} ({len(d['rows'])}거래일), 환율 {r0[1]} → {r1[1]} (최근 {d['fx']}, {d['fxDate']}), 출처 {d['src']}"]
    for i, t in enumerate(d["tickers"]):
        lines.append(f"  {t:5s} 종가 {d['close'][t]:>9.2f}  수익률(USD, 배당 포함) {(r1[i + 2] / r0[i + 2] - 1) * 100:+.1f}%")
    return "\n".join(lines)


def main():
    args = sys.argv[1:]
    site = None
    if "--site" in args:
        i = args.index("--site")
        site = args[i + 1]
        del args[i:i + 2]
    outdir = args[0] if args else "."
    live = None
    if site:
        try:
            live = json.loads(get(f"{site.rstrip('/')}/portfolio.json?t={int(time.time())}", 20).decode("utf-8"))
        except Exception as e:
            print(f"사이트에 있는 portfolio.json 을 못 읽음 — {e}")
    data = None
    if live and live.get("tickers") == TICKERS and live.get("runAt") and slot(live["runAt"]) == slot(dt.datetime.now(KST).isoformat()):
        print("이번 시간대 결과가 이미 사이트에 있어 그대로 씁니다.")
        data = live
    else:
        try:
            data = fetch()
        except Exception as e:
            print(f"::warning::포트폴리오 시세를 받지 못했어요 — {e}")
            data = live
            if not site:
                raise
    if data:
        os.makedirs(outdir, exist_ok=True)
        json.dump(data, open(os.path.join(outdir, "portfolio.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        print(summary(data))
    same = bool(live and data) and all(live.get(k) == data.get(k) for k in ("rows", "close", "fx"))
    with open(os.environ.get("GITHUB_OUTPUT") or os.devnull, "a") as f:
        f.write(f"changed={'false' if same else 'true'}\n")
    print(f"changed={'false' if same else 'true'}")


if __name__ == "__main__":
    main()
