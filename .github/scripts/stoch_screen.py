#!/usr/bin/env python3
"""
코스피·코스닥 슬로우 스토캐스틱(14,3,3) 신호 스크린 — 전 영업일 종가 기준, 시가총액 순 상위 5개.
 - 종목·시가총액: NH Plug 종목마스터 m_new_stock.mst (인증 불필요, 전일 시가총액 prdy_avls)
 - 일봉(고가·저가·종가): 네이버 fchart
 - 매수 = %K 가 %D 를 위로 돌파(골든크로스), 매도 = 아래로 돌파(데드크로스). 마지막 완성 봉(오늘 봉 제외) 기준.
사용: python3 .github/scripts/stoch_screen.py [출력폴더]   → result.json, result.md
     python3 .github/scripts/stoch_screen.py _site --site <사이트 주소>   → _site/stoch.json (Pages 배포용, 휴대폰 투자 탭 카드)
"""
import datetime as dt, json, os, re, sys, urllib.request

MST_URL = "https://www.nhplug.com/instruments/m_new_stock.mst"
FCHART = "https://fchart.stock.naver.com/sise.nhn?symbol={}&timeframe=day&count=60&requestType=0"
FIELDS = [
    ("sCode", 6), ("sMarket", 1), ("sKorName", 41), ("sEngName", 41), ("sOldName", 40),
    ("eCapSize", 1), ("sUpCodeM", 6), ("sUpCodeS", 6), ("sGroup", 2), ("gManuf", 1),
    ("sParvalue", 7), ("sPrePrice", 7), ("eRights", 1), ("eUnder", 1), ("eStop", 1),
    ("eWarn", 1), ("eGongsi", 1), ("gTonghap", 1), ("gVenture", 1), ("gKrx300", 1),
    ("gKospi50", 1), ("eAccept", 1), ("gKospiIT", 1), ("gKospiBD", 1), ("gIT", 1),
    ("gKosdaq150", 1), ("gKospi100", 1), ("prdy_avls", 12), ("invt_epmd_issu_yn", 1),
    ("short_over_issu_cls_code", 1), ("alert_gb", 1), ("sltr_yn", 1), ("stck_sdpr", 7),
    ("nxt_yn", 1), ("eNXTStop", 1), ("sUpCodeL", 6), ("nxt_comp_deal_tr_code", 2),
    ("filler", 29), ("dummy", 1),
]
RECORD = sum(n for _, n in FIELDS)  # 237
MARKET = {"1": "코스피", "4": "코스닥"}
KST = dt.timezone(dt.timedelta(hours=9))
N, KS, DS, TOP = 14, 3, 3, 5
UA = {"User-Agent": "Mozilla/5.0"}


def get(url, timeout=30):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return r.read()


def universe():
    buf = get(MST_URL, 60)
    if len(buf) % RECORD:
        raise SystemExit(f"마스터 파일 크기({len(buf)})가 {RECORD}의 배수가 아닙니다")
    out = []
    for i in range(0, len(buf), RECORD):
        rec, off, r = buf[i:i + RECORD], 0, {}
        for name, n in FIELDS:
            r[name] = rec[off:off + n].decode("cp949", "replace").strip()
            off += n
        if r["sMarket"] not in MARKET or r["gVenture"] in ("8", "E") or r["eStop"] == "Y":
            continue
        try:
            cap = int(r["prdy_avls"])
        except ValueError:
            continue
        if cap > 0:
            out.append({"code": r["sCode"], "name": r["sKorName"].lstrip(" *#"), "market": MARKET[r["sMarket"]], "cap": cap})
    return sorted(out, key=lambda s: -s["cap"])


def bars(code):
    xml = get(FCHART.format(code)).decode("euc-kr", "replace")
    rows = []
    for m in re.finditer(r'data="([^"]+)"', xml):
        d, o, h, l, c, v = m.group(1).split("|")
        if c and float(c) > 0:
            rows.append((d, float(h), float(l), float(c)))
    return rows


def sma(xs, n):
    return [sum(xs[i - n + 1:i + 1]) / n for i in range(n - 1, len(xs))]


def slow_stoch(rows):
    fk = []
    for i in range(N - 1, len(rows)):
        w = rows[i - N + 1:i + 1]
        hh, ll = max(r[1] for r in w), min(r[2] for r in w)
        fk.append(100 * (rows[i][3] - ll) / (hh - ll) if hh > ll else 50.0)
    k = sma(fk, KS)
    return k, sma(k, DS)


def signal(rows):
    if len(rows) < N + KS + DS + 1:
        return None
    k, d = slow_stoch(rows)
    (k0, k1), (d0, d1) = k[-2:], d[-2:]
    if k0 <= d0 and k1 > d1:
        return "buy", k1, d1
    if k0 >= d0 and k1 < d1:
        return "sell", k1, d1
    return None


def cap_str(eok):
    return f"{eok / 10000:,.1f}조" if eok >= 10000 else f"{eok:,}억"


def screen():
    now = dt.datetime.now(KST)
    today = now.strftime("%Y%m%d")
    stocks = universe()
    ref = bars(stocks[0]["code"])  # 시총 1위 일봉으로 오늘 장이 열렸는지 확인
    trading_today = bool(ref) and ref[-1][0] == today
    picks = {"buy": [], "sell": []}
    basis, scanned = None, 0
    for s in stocks:
        if all(len(v) >= TOP for v in picks.values()):
            break
        try:
            rows = [r for r in bars(s["code"]) if r[0] < today]
        except Exception as e:
            print(f"skip {s['code']}: {e}", file=sys.stderr)
            continue
        scanned += 1
        if not rows:
            continue
        basis = max(basis or "", rows[-1][0])
        if rows[-1][0] < (basis or ""):  # 거래정지 등으로 최근 봉이 없는 종목 제외
            continue
        sig = signal(rows)
        if sig and len(picks[sig[0]]) < TOP:
            picks[sig[0]].append({**s, "close": rows[-1][3], "k": round(sig[1], 1), "d": round(sig[2], 1)})
    b = f"{basis[:4]}-{basis[4:6]}-{basis[6:]}" if basis else None
    return {"runDate": now.date().isoformat(), "runAt": now.isoformat(timespec="seconds"),
            "tradingToday": trading_today, "basisDate": b, "scanned": scanned, **picks}


def to_md(res):
    lines = [f"슬로우 스토캐스틱(14,3,3) 신호, {res['basisDate']} 종가 기준, 시가총액 순 상위 {TOP}개"]
    for key, title in (("buy", "매수 (골든크로스)"), ("sell", "매도 (데드크로스)")):
        lines.append(f"\n**{title}**")
        if not res[key]:
            lines.append("- 해당 종목 없음")
        for i, p in enumerate(res[key], 1):
            lines.append(f"{i}. {p['name']} ({p['market']}) 시총 {cap_str(p['cap'])}, 종가 {p['close']:,.0f}원, %K {p['k']} / %D {p['d']}")
    return "\n".join(lines)


def slot(run_at):
    """같은 날 08시(KST) 전/후로 한 번씩만 새로 뽑는다 — 기준(전 영업일 종가)은 자정에만 바뀐다"""
    d = dt.datetime.fromisoformat(run_at)
    return d.date().isoformat() + ("am" if d.hour >= 8 else "early")


def site_mode(outdir, site):
    """Pages 배포용: <outdir>/stoch.json 을 쓰고 GITHUB_OUTPUT 에 changed=true|false.
    이번 시간대에 이미 뽑아 둔 결과가 사이트에 있으면 다시 뽑지 않고, 못 뽑으면 사이트 것을 그대로 쓴다."""
    live = None
    try:
        live = json.loads(get(f"{site.rstrip('/')}/stoch.json?t={int(dt.datetime.now().timestamp())}", 20).decode("utf-8"))
    except Exception as e:
        print(f"사이트에 있는 stoch.json 을 못 읽음 — {e}")
    data = None
    if live and live.get("runAt") and slot(live["runAt"]) == slot(dt.datetime.now(KST).isoformat()):
        print("이번 시간대 결과가 이미 사이트에 있어 그대로 씁니다.")
        data = live
    else:
        try:
            data = screen()
        except Exception as e:
            print(f"::warning::스토캐스틱 신호를 뽑지 못했어요 — {e}")
            data = live
    if data:
        os.makedirs(outdir, exist_ok=True)
        json.dump(data, open(os.path.join(outdir, "stoch.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(to_md(data))
    same = bool(live and data) and all(live.get(k) == data.get(k) for k in ("basisDate", "buy", "sell"))
    with open(os.environ.get("GITHUB_OUTPUT") or os.devnull, "a") as f:
        f.write(f"changed={'false' if same else 'true'}\n")
    print(f"changed={'false' if same else 'true'}")


def main():
    args = sys.argv[1:]
    if "--site" in args:
        i = args.index("--site")
        site = args[i + 1]
        del args[i:i + 2]
        return site_mode(args[0] if args else ".", site)
    outdir = args[0] if args else "."
    res = screen()
    md = to_md(res)
    os.makedirs(outdir, exist_ok=True)
    json.dump(res, open(os.path.join(outdir, "result.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    open(os.path.join(outdir, "result.md"), "w", encoding="utf-8").write(md + "\n")
    print(md)
    print(f"\n(tradingToday={res['tradingToday']}, scanned={res['scanned']})")


if __name__ == "__main__":
    main()
