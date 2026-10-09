#!/usr/bin/env python3
"""
투자 탭 '국내주식' 카드용 — 코스피 · 코스닥 전 종목 매력도 평가 (100점) → <출력폴더>/index.json + <출력폴더>/s/{code}.json
 - 종목 · 시가총액: NH Plug 종목마스터 m_new_stock.mst (stoch_screen.py 와 같은 기준, ETF · ETN · 거래정지 제외)
 - 일봉 260개: 네이버 fchart  /  PER · PBR · 배당 · 외국인 · 기관 5일 순매수: 네이버 증권 integration
 - 매출 · 영업이익 · ROE · 영업이익률 · 부채비율(최근 3년 + 올해 컨센서스): 네이버 증권 finance/annual
 - 평가 항목 (합 100점, 순위는 전 종목 · 같은 업종 안에서 백분위로)
     가치 25  : PER 10 (컨센서스 추정PER 이 있으면 그것, 업종 안 순위) · PBR 10 (업종 안) · 배당수익률 5
     수익성 20: ROE 10 · 영업이익률 10 (최근 결산)
     성장성 15: 매출 증가율 5 · 영업이익 증가율 10 (올해 컨센서스 ÷ 지난해, 없으면 지난해 ÷ 그 전해)
     추세 20  : 6개월 수익률 8 · 이동평균 정배열 6 (종가>20일>60일>120일) · 52주 고점 근접 6
     수급 10  : 최근 5거래일 외국인 순매수 5 · 기관 순매수 5 (금액 ÷ 시가총액)
     타이밍 10: 슬로우 스토캐스틱(10,5,5) %K · %D 위치와 교차
     감점     : 부채비율 200% 넘음 −3 · 60일 변동성 상위 10% −2
 - 등급: 70↑ A 매우 매력 · 60↑ B 매력 · 45↑ C 보통 · 35↑ D 주의 · 그 아래 E 약함
 - 오늘 봉은 16시(KST) 전이면 빼서 장이 끝난 종가로만 평가한다. 직전 평가와 기준일이 달라지면 그 점수를 prev 로 남겨 하루 변화를 보여 준다
 - 못 받은 종목은 폴더에 이미 있던 파일(이전 캐시)을 그대로 둔다. 어떤 경우에도 실패 코드로 끝내지 않는다 (배포를 막지 않게)
사용: python3 .github/scripts/kr_eval.py <출력폴더> [--limit N]
"""
import bisect, concurrent.futures as cf, datetime as dt, json, math, os, re, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stoch_screen import FIELDS, RECORD, MST_URL, MARKET, N as SN, KS as SKS, DS as SDS  # noqa: E402

FCHART = "https://fchart.stock.naver.com/sise.nhn?symbol={}&timeframe=day&count=260&requestType=0"
INTEG = "https://m.stock.naver.com/api/stock/{}/integration"
ANNUAL = "https://m.stock.naver.com/api/stock/{}/finance/annual"
KST = dt.timezone(dt.timedelta(hours=9))
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}
KEEP = 130   # 상세 화면 차트용으로 담는 일봉 수
CATS = [("가치", 25), ("수익성", 20), ("성장성", 15), ("추세", 20), ("수급", 10), ("타이밍", 10)]
# 백분위로 매기는 상대 평가라 가운데가 50점 안팎 — 2026-10-08 전 종목 기준 A 약 3% · B 약 15% · C · D 가 대부분
GRADES = [(70, "A", "매우 매력"), (60, "B", "매력"), (45, "C", "보통"), (35, "D", "주의"), (0, "E", "약함")]


def get(url, timeout=20):
    last = None
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
                return r.read()
        except Exception as e:
            last = e
            time.sleep(1 + i)
    raise last


def num(s):
    """'11.80배' · '1,668원' · '+5,259,380' · '46.38%' → float, 없으면 None"""
    if s is None:
        return None
    s = str(s).replace(",", "").strip()
    m = re.match(r"^[+-]?\d+(\.\d+)?", s)
    return float(m.group(0)) if m else None


def universe():
    buf = get(MST_URL, 60)
    out = []
    for i in range(0, len(buf) - len(buf) % RECORD, RECORD):
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


def fetch(s, cutoff):
    """한 종목의 일봉 · 지표 · 재무. 일봉을 못 받으면 None"""
    code = s["code"]
    try:
        xml = get(FCHART.format(code)).decode("euc-kr", "replace")
    except Exception:
        return None
    bars = []
    for m in re.finditer(r'data="([^"]+)"', xml):
        d, o, h, l, c, v = m.group(1).split("|")
        if d <= cutoff and c and float(c) > 0:
            c = float(c)
            bars.append([d, int(float(o or c)), int(float(h or c)), int(float(l or c)), int(c), int(float(v or 0))])
    if len(bars) < 2:
        return None
    integ, fin = {}, {}
    try:
        integ = json.loads(get(INTEG.format(code)))
    except Exception:
        pass
    try:
        fin = json.loads(get(ANNUAL.format(code)))
    except Exception:
        pass
    return {**s, "bars": bars, "integ": integ, "fin": fin}


# ── 지표 계산 ──
def sma(xs, n):
    return sum(xs[-n:]) / n if len(xs) >= n else None


def stoch(bars):
    """슬로우 스토캐스틱 (stoch_screen.py · index.html 의 INV_STO 와 같은 계산) → (K 마지막 두 개, D 마지막 두 개)"""
    if len(bars) < SN + SKS + SDS + 1:
        return None
    fk = []
    for i in range(SN - 1, len(bars)):
        w = bars[i - SN + 1:i + 1]
        hh, ll = max(r[2] for r in w), min(r[3] for r in w)
        fk.append(100 * (bars[i][4] - ll) / (hh - ll) if hh > ll else 50.0)
    k = [sum(fk[i - SKS + 1:i + 1]) / SKS for i in range(SKS - 1, len(fk))]
    d = [sum(k[i - SDS + 1:i + 1]) / SDS for i in range(SDS - 1, len(k))]
    return k[-2:], d[-2:]


def annual(fin):
    """finance/annual → {'keys': [...결산 키], 'cons': 컨센서스 키 또는 None, 'rows': {제목: {키: 값}}}"""
    info = (fin or {}).get("financeInfo") or {}
    titles = info.get("trTitleList") or []
    keys = [t["key"] for t in titles if t.get("isConsensus") == "N"]
    cons = next((t["key"] for t in titles if t.get("isConsensus") == "Y"), None)
    rows = {}
    for r in info.get("rowList") or []:
        rows[r.get("title")] = {k: num((v or {}).get("value")) for k, v in (r.get("columns") or {}).items()}
    return {"keys": sorted(keys), "cons": cons, "rows": rows}


def growth(row, a):
    """(증가율, 설명) — 올해 컨센서스가 있으면 지난 결산 대비, 없으면 지난 결산 ÷ 그 전 결산"""
    if not row or not a["keys"]:
        return None, None
    last = a["keys"][-1]
    if a["cons"] and row.get(a["cons"]) is not None and row.get(last) is not None:
        x, y, lbl = row[a["cons"]], row[last], f"{a['cons'][:4]} 예상 vs {last[:4]}"
    elif len(a["keys"]) >= 2 and row.get(last) is not None and row.get(a["keys"][-2]) is not None:
        x, y, lbl = row[last], row[a["keys"][-2]], f"{last[:4]} vs {a['keys'][-2][:4]}"
    else:
        return None, None
    if y > 0:
        return x / y - 1, lbl
    if y <= 0 < x:
        return 9.99, lbl + " (흑자 전환)"
    if y < 0 and x < 0:
        return (-1.0 if x < y else -0.2), lbl + " (적자 지속)"
    return None, None


def metrics(it):
    bars, integ = it["bars"], it["integ"] or {}
    ti = {x.get("code"): x for x in integ.get("totalInfos") or []}
    closes = [b[4] for b in bars]
    c = closes[-1]
    m = {"close": c, "chg": (c / closes[-2] - 1) * 100 if len(closes) > 1 and closes[-2] else 0.0, "basis": bars[-1][0]}
    m["industry"] = integ.get("industryCode") or ""
    per, cper = num((ti.get("per") or {}).get("value")), num((ti.get("cnsPer") or {}).get("value"))
    m["per"], m["cper"] = per, cper
    m["perUse"] = cper if cper is not None else per
    m["perDesc"] = (ti.get("per") or {}).get("valueDesc")
    m["pbr"] = num((ti.get("pbr") or {}).get("value"))
    m["div"] = num((ti.get("dividendYieldRatio") or {}).get("value"))
    m["frgn"] = num((ti.get("foreignRate") or {}).get("value"))
    a = annual(it["fin"])
    last = a["keys"][-1] if a["keys"] else None
    rows = a["rows"]
    m["finYear"] = last[:4] if last else None
    m["roe"] = (rows.get("ROE") or {}).get(last) if last else None
    m["opm"] = (rows.get("영업이익률") or {}).get(last) if last else None
    m["debt"] = (rows.get("부채비율") or {}).get(last) if last else None
    m["salesG"], m["salesGLbl"] = growth(rows.get("매출액"), a)
    m["opG"], m["opGLbl"] = growth(rows.get("영업이익"), a)
    m["fin"] = {"keys": a["keys"] + ([a["cons"]] if a["cons"] else []), "cons": a["cons"],
                "rows": {t: [rows.get(t, {}).get(k) for k in a["keys"] + ([a["cons"]] if a["cons"] else [])]
                         for t in ("매출액", "영업이익", "당기순이익", "영업이익률", "ROE", "부채비율", "EPS", "PER", "PBR", "주당배당금") if t in rows}}
    # 추세
    m["r6"] = c / closes[-121] - 1 if len(closes) > 120 and closes[-121] else None
    m["r1"] = c / closes[-21] - 1 if len(closes) > 20 and closes[-21] else None
    m["ma"] = [sma(closes, n) for n in (20, 60, 120)]
    hi52 = max(b[2] for b in bars[-250:])
    m["hi52"], m["lo52"] = hi52, min(b[3] for b in bars[-250:])
    m["fromHi"] = c / hi52 - 1 if hi52 else None
    rets = [closes[i] / closes[i - 1] - 1 for i in range(max(1, len(closes) - 60), len(closes)) if closes[i - 1]]
    m["vol"] = (sum(r * r for r in rets) / len(rets)) ** 0.5 * math.sqrt(250) if len(rets) >= 20 else None
    # 수급 — 최근 5거래일 순매수 수량 × 그날 종가 ÷ 시가총액(억원)
    deals = integ.get("dealTrendInfos") or []
    fq = sum((num(d.get("foreignerPureBuyQuant")) or 0) * (num(d.get("closePrice")) or 0) for d in deals)
    oq = sum((num(d.get("organPureBuyQuant")) or 0) * (num(d.get("closePrice")) or 0) for d in deals)
    capw = it["cap"] * 1e8
    m["frgnFlow"], m["orgFlow"] = (fq / 1e8, oq / 1e8) if deals else (None, None)
    m["frgnR"], m["orgR"] = (fq / capw, oq / capw) if deals and capw else (None, None)
    m["deals"] = [[d.get("bizdate"), num(d.get("foreignerPureBuyQuant")), num(d.get("organPureBuyQuant")),
                   num(d.get("individualPureBuyQuant")), num(d.get("closePrice"))] for d in deals]
    st = stoch(bars)
    m["k"], m["d"] = (st[0], st[1]) if st else (None, None)
    m["summary"] = [v for k, v in sorted(((it["fin"] or {}).get("corporationSummary") or {}).items()) if v]
    m["research"] = [{"t": r.get("tit"), "b": r.get("bnm"), "d": r.get("wdt"), "id": r.get("id")} for r in (integ.get("researches") or [])[:3]]
    return m


class Rank:
    """값 목록에서 백분위 (0~1, 클수록 값이 큼)"""
    def __init__(self, vals):
        self.v = sorted(v for v in vals if v is not None)

    def __call__(self, x):
        if x is None or not self.v:
            return None
        lo, hi = bisect.bisect_left(self.v, x), bisect.bisect_right(self.v, x)
        return ((lo + hi) / 2) / len(self.v)


def pct_s(p):
    """백분위 → '상위 12%'"""
    return f"상위 {max(1, round((1 - p) * 100))}%"


def score_all(items):
    ms = {it["code"]: it["m"] for it in items}
    allv = lambda k, f=lambda v: v: [f(m[k]) if m[k] is not None else None for m in ms.values()]
    pos = lambda v: v if v is not None and v > 0 else None
    # 업종 안 순위 (같은 업종에 값 있는 종목이 5개 이상이면 업종, 아니면 전 종목)
    by_ind = {}
    for m in ms.values():
        by_ind.setdefault(m["industry"], []).append(m)
    rk = {"per": Rank(allv("perUse", pos)), "pbr": Rank(allv("pbr", pos))}
    ind_rk = {}
    for ind, lst in by_ind.items():
        for k, src in (("per", "perUse"), ("pbr", "pbr")):
            vals = [pos(x[src]) for x in lst if pos(x[src]) is not None]
            if ind and len(vals) >= 5:
                ind_rk[(ind, k)] = Rank(vals)
    R = {k: Rank(allv(k)) for k in ("div", "roe", "opm", "salesG", "opG", "r6", "fromHi", "frgnR", "orgR", "vol")}
    vol90 = R["vol"].v[int(len(R["vol"].v) * 0.9)] if R["vol"].v else None

    def item(name, mx, p, val, note=None, miss=0.4):
        if p is None:
            return {"n": name, "max": mx, "s": round(mx * miss, 1), "v": val or "자료 없음", "note": note or "자료가 없어 낮게 잡았어요"}
        return {"n": name, "max": mx, "s": round(mx * p, 1), "v": val, "note": note or pct_s(p)}

    out = {}
    for code, m in ms.items():
        cats = []
        # 가치
        def lowp(k, src):
            v = pos(m[src])
            if v is None:
                return None, "전 종목"
            r = ind_rk.get((m["industry"], k))
            return (1 - (r or rk[k])(v)), ("업종 안" if r else "전 종목")
        g = []
        if m["perUse"] is not None and m["perUse"] <= 0:
            g.append({"n": "PER", "max": 10, "s": 0, "v": "적자", "note": "이익이 없어 0점"})
        else:
            p, where = lowp("per", "perUse")
            lbl = (f"추정 {m['cper']:.1f}배" if m["cper"] is not None else f"{m['per']:.1f}배") if m["perUse"] is not None else None
            if m["cper"] is not None and m["per"] is not None:
                lbl += f" (현재 {m['per']:.1f}배)"
            g.append(item("PER", 10, p, lbl, f"{where} 싼 쪽 {pct_s(p)}" if p is not None else None))
        p, where = lowp("pbr", "pbr")
        g.append(item("PBR", 10, p, f"{m['pbr']:.2f}배" if m["pbr"] is not None else None, f"{where} 싼 쪽 {pct_s(p)}" if p is not None else None))
        dv = m["div"]
        g.append(item("배당수익률", 5, R["div"](dv) if dv else 0.0, f"{dv:.2f}%" if dv is not None else "없음", None if dv else "배당 없음"))
        cats.append(g)
        # 수익성
        yr = f" ({m['finYear']})" if m["finYear"] else ""
        g = [item("ROE" + yr, 10, R["roe"](m["roe"]), f"{m['roe']:.1f}%" if m["roe"] is not None else None),
             item("영업이익률" + yr, 10, R["opm"](m["opm"]), f"{m['opm']:.1f}%" if m["opm"] is not None else None)]
        cats.append(g)
        # 성장성
        fmt_g = lambda x: "흑자 전환" if x == 9.99 else f"{x * 100:+.1f}%"
        g = [item("매출 증가율", 5, R["salesG"](m["salesG"]), fmt_g(m["salesG"]) if m["salesG"] is not None else None,
                  (m["salesGLbl"] + " · " + pct_s(R["salesG"](m["salesG"]))) if m["salesG"] is not None else None),
             item("영업이익 증가율", 10, R["opG"](m["opG"]), fmt_g(m["opG"]) if m["opG"] is not None else None,
                  (m["opGLbl"] + " · " + pct_s(R["opG"](m["opG"]))) if m["opG"] is not None else None)]
        cats.append(g)
        # 추세
        ma, c = m["ma"], m["close"]
        chain = [ma[0] is not None and c > ma[0], ma[0] is not None and ma[1] is not None and ma[0] > ma[1],
                 ma[1] is not None and ma[2] is not None and ma[1] > ma[2]]
        g = [item("6개월 수익률", 8, R["r6"](m["r6"]), f"{m['r6'] * 100:+.1f}%" if m["r6"] is not None else None),
             {"n": "이동평균 정배열", "max": 6, "s": 2.0 * sum(chain), "v": f"{sum(chain)}/3",
              "note": " · ".join(t + ("○" if ok else "✕") for t, ok in zip(("종가>20일", "20일>60일", "60일>120일"), chain))},
             item("52주 고점 대비", 6, R["fromHi"](m["fromHi"]), f"{m['fromHi'] * 100:+.1f}%" if m["fromHi"] is not None else None,
                  f"고점 {m['hi52']:,}원 · 가까운 쪽 {pct_s(R['fromHi'](m['fromHi']))}" if m["fromHi"] is not None else None)]
        cats.append(g)
        # 수급
        fl = lambda v: f"{v:+,.0f}억" if abs(v) >= 1 else f"{v:+,.1f}억"
        g = [item("외국인 5일 순매수", 5, R["frgnR"](m["frgnR"]), fl(m["frgnFlow"]) if m["frgnFlow"] is not None else None,
                  (f"시총 대비 {m['frgnR'] * 100:+.2f}% · " + pct_s(R["frgnR"](m["frgnR"]))) if m["frgnR"] is not None else None),
             item("기관 5일 순매수", 5, R["orgR"](m["orgR"]), fl(m["orgFlow"]) if m["orgFlow"] is not None else None,
                  (f"시총 대비 {m['orgR'] * 100:+.2f}% · " + pct_s(R["orgR"](m["orgR"]))) if m["orgR"] is not None else None)]
        cats.append(g)
        # 타이밍 (슬로우 스토캐스틱)
        if m["k"] is None:
            g = [item("스토캐스틱", 10, None, None)]
        else:
            (k0, k1), (d0, d1) = m["k"], m["d"]
            if k0 <= d0 and k1 > d1:
                s, why = (10 if k1 < 30 else 9 if k1 < 60 else 7), "골든크로스 — 매수 신호" + (" (낮은 자리)" if k1 < 30 else "")
            elif k0 >= d0 and k1 < d1:
                s, why = 1, "데드크로스 — 매도 신호"
            elif k1 > d1:
                s, why = (7, "%K 가 %D 위 — 오르는 흐름") if k1 < 80 else (5, "%K 가 %D 위지만 80 넘어 과열")
            else:
                s, why = (4, "%K 가 %D 아래지만 20 아래 과매도 — 반등 대기") if k1 <= 20 else (2, "%K 가 %D 아래 — 내리는 흐름")
            g = [{"n": f"스토캐스틱 ({SN},{SKS},{SDS})", "max": 10, "s": s, "v": f"%K {k1:.0f} / %D {d1:.0f}", "note": why}]
        cats.append(g)
        # 감점
        flags = []
        if m["debt"] is not None and m["debt"] > 200:
            flags.append({"n": "부채비율 높음", "s": -3, "v": f"{m['debt']:.0f}%"})
        if vol90 is not None and m["vol"] is not None and m["vol"] >= vol90:
            flags.append({"n": "변동성 큼 (상위 10%)", "s": -2, "v": f"연 {m['vol'] * 100:.0f}%"})
        cs = [round(sum(x["s"] for x in g), 1) for g in cats]
        total = max(0, min(100, round(sum(cs) + sum(f["s"] for f in flags))))
        grade = next((g, t) for lim, g, t in GRADES if total >= lim)
        # 한 줄 요약 — 만점 대비 가장 좋은 · 나쁜 항목
        ratio = sorted(((cs[i] / mx, nm) for i, (nm, mx) in enumerate(CATS)), reverse=True)
        tag = f"{ratio[0][1]}↑ {ratio[-1][1]}↓"
        if m["k"] is not None:
            (k0, k1), (d0, d1) = m["k"], m["d"]
            if k0 <= d0 and k1 > d1:
                tag += " · 골든크로스"
            elif k0 >= d0 and k1 < d1:
                tag += " · 데드크로스"
        out[code] = {"score": total, "grade": grade[0], "gradeT": grade[1], "tag": tag, "cats": cs,
                     "detail": [{"k": nm, "max": mx, "s": cs[i], "items": cats[i]} for i, (nm, mx) in enumerate(CATS)], "flags": flags}
    return out


def main():
    args = sys.argv[1:]
    limit = None
    if "--limit" in args:
        i = args.index("--limit")
        limit = int(args[i + 1])
        del args[i:i + 2]
    out = args[0] if args else "kr"
    os.makedirs(os.path.join(out, "s"), exist_ok=True)
    now = dt.datetime.now(KST)
    # 16시 전이면 오늘 봉(장중 · 장 마감 직후)은 빼고 전 영업일 종가까지만
    cutoff = now.strftime("%Y%m%d") if now.hour >= 16 else (now - dt.timedelta(days=1)).strftime("%Y%m%d")
    try:
        stocks = universe()
    except Exception as e:
        print(f"::warning::종목마스터를 못 받아 국내주식 평가를 갱신하지 않았어요 — {e}")
        return
    if limit:
        stocks = stocks[:limit]
    old = {}
    try:
        old = json.load(open(os.path.join(out, "index.json"), encoding="utf-8"))
    except Exception:
        pass
    t0 = time.time()
    with cf.ThreadPoolExecutor(12) as ex:
        got = [x for x in ex.map(lambda s: fetch(s, cutoff), stocks) if x]
    print(f"받기: {len(stocks)}종목 중 {len(got)}종목 ({time.time() - t0:.0f}초)")
    if len(got) < len(stocks) * 0.6:
        print(f"::warning::국내주식 평가 — 받은 종목이 너무 적어({len(got)}/{len(stocks)}) 이전 결과를 그대로 둡니다")
        return
    basis = max(it["bars"][-1][0] for it in got)
    items = []
    for it in got:
        if it["bars"][-1][0] < basis:   # 거래정지 등으로 최근 봉이 없는 종목은 빼고 이전 파일을 둔다
            continue
        try:
            it["m"] = metrics(it)
            items.append(it)
        except Exception as e:
            print(f"skip {it['code']}: {e}", file=sys.stderr)
    sc = score_all(items)
    old_rows = {r[0]: r for r in old.get("s", [])}
    old_basis = old.get("basis")
    rows = []
    b = f"{basis[:4]}-{basis[4:6]}-{basis[6:]}"
    for it in items:
        code, m, s = it["code"], it["m"], sc[it["code"]]
        o = old_rows.get(code)
        # prev = 직전 기준일의 점수 (같은 기준일로 다시 돌면 그 전 값을 그대로)
        prev = (o[6] if old_basis != b else o[7]) if o else None
        mk = "P" if it["market"] == "코스피" else "Q"
        rows.append([code, it["name"], mk, it["cap"], m["close"], round(m["chg"], 2), s["score"], prev, s["grade"], s["tag"]])
        detail = {"code": code, "name": it["name"], "market": it["market"], "cap": it["cap"], "basis": b, "runAt": now.isoformat(timespec="seconds"),
                  "close": m["close"], "chg": round(m["chg"], 2), "score": s["score"], "prev": prev, "grade": s["grade"], "gradeT": s["gradeT"],
                  "tag": s["tag"], "cats": s["detail"], "flags": s["flags"], "params": [SN, SKS, SDS],
                  "info": {"per": m["per"], "perDesc": m["perDesc"], "cper": m["cper"], "pbr": m["pbr"], "div": m["div"], "frgn": m["frgn"],
                           "hi52": m["hi52"], "lo52": m["lo52"], "r1": m["r1"], "r6": m["r6"], "industry": m["industry"]},
                  "fin": m["fin"], "deals": m["deals"], "summary": m["summary"], "research": m["research"],
                  "bars": it["bars"][-KEEP:]}
        with open(os.path.join(out, "s", code + ".json"), "w", encoding="utf-8") as f:
            json.dump(detail, f, ensure_ascii=False, separators=(",", ":"))
    # 이번에 못 받은 종목은 이전 줄을 그대로 둔다 (자동완성에서 빠지지 않게)
    have = {r[0] for r in rows}
    rows += [r for c, r in old_rows.items() if c not in have and any(s["code"] == c for s in stocks)]
    rows.sort(key=lambda r: -r[3])
    idx = {"basis": b, "runAt": now.isoformat(timespec="seconds"), "params": [SN, SKS, SDS],
           "cats": [[n, mx] for n, mx in CATS], "grades": [[lim, g, t] for lim, g, t in GRADES], "s": rows}
    with open(os.path.join(out, "index.json"), "w", encoding="utf-8") as f:
        json.dump(idx, f, ensure_ascii=False, separators=(",", ":"))
    dist = {g: sum(1 for r in rows if r[8] == g) for _, g, _ in GRADES}
    print(f"국내주식 평가: 기준일 {b} · {len(items)}종목 평가 · 등급 {dist} ({time.time() - t0:.0f}초)")
    sc_sorted = sorted(r[6] for r in rows)
    print("점수 분포 (5·25·50·75·95·99%):", [sc_sorted[int(len(sc_sorted) * q)] for q in (0.05, 0.25, 0.5, 0.75, 0.95, 0.99)])
    for r in sorted(rows, key=lambda r: -r[6])[:5]:
        print(f"  최고 {r[1]} {r[6]}점 · {r[9]}")
    for r in rows[:10]:
        print(f"  {r[1]} ({r[0]}) {r[6]}점 {r[8]} · {r[9]} · 전일 {r[7]}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"::warning::국내주식 평가 갱신 중 오류 — {e}")
