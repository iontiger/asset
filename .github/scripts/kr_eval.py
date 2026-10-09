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
 - ETF (NH Plug 마스터의 ETF, ETN 은 뺌): 재무 대신 ETF 끼리 비교 — 네이버 integration 의 etfKeyIndicator + etfAnalysis
     추세 25        : 6개월 수익률 10 · 이동평균 정배열 8 · 52주 고점 근접 7
     위험 대비 성과 15: 1년 수익률 ÷ 1년 변동성 (변동성은 10% 를 바닥으로)
     비용 · 추적 20 : 총보수 10 · 추적오차 5 · 괴리율 5 (낮을수록)
     규모 · 유동성 15: 순자산 8 · 20일 평균 거래대금 7
     자금 흐름 15   : 최근 1개월 순유입 ÷ 순자산 8 · 외국인+기관 5일 순매수 ÷ 시총 7
     타이밍 10      : 주식과 같은 스토캐스틱
     감점           : 레버리지 · 인버스 −5 (오래 들고 있으면 기초지수와 어긋나기 쉬움)
 - 묶음(순위 탐색용): 주식은 네이버 업종 이름, ETF 는 이름 · 기초지수로 나눈 테마 (미국 · 채권 · 반도체 …)
 - 점수 기록: 상세 파일에 기준일마다 [날짜, 점수] 를 최근 60개까지 이어 붙인다 (폴더에 있던 이전 파일에서 이어 받음)
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
ETFAN = "https://m.stock.naver.com/api/stock/{}/etfAnalysis"
UPJONG = "https://m.stock.naver.com/api/stocks/industry?page={}&pageSize=20"
HIST = 60    # 상세 파일에 남기는 점수 기록 수
KST = dt.timezone(dt.timedelta(hours=9))
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}
KEEP = 130   # 상세 화면 차트용으로 담는 일봉 수
CATS = [("가치", 25), ("수익성", 20), ("성장성", 15), ("추세", 20), ("수급", 10), ("타이밍", 10)]
ECATS = [("추세", 25), ("위험대비", 15), ("비용", 20), ("규모", 15), ("자금흐름", 15), ("타이밍", 10)]
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
        etf = r["sMarket"] == "1" and r["gVenture"] == "8"
        if r["sMarket"] not in MARKET or (r["gVenture"] in ("8", "E", "F") and not etf) or r["eStop"] == "Y":
            continue
        try:
            cap = int(r["prdy_avls"])
        except ValueError:
            continue
        if cap > 0:
            out.append({"code": r["sCode"], "name": r["sKorName"].lstrip(" *#"), "market": "ETF" if etf else MARKET[r["sMarket"]], "cap": cap, "etf": etf})
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
        fin = json.loads(get((ETFAN if s.get("etf") else ANNUAL).format(code)))
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


# ── ETF ──
def eok(s):
    """'1조 7,416억' · '-669억' → 억원 (float), 없으면 None"""
    if s is None:
        return None
    t = str(s).replace(",", "").replace(" ", "")
    neg = t.startswith("-")
    t = t.lstrip("+-")
    m = re.match(r"^(?:(\d+(?:\.\d+)?)조)?(?:(\d+(?:\.\d+)?)억)?$", t)
    if not m or not (m.group(1) or m.group(2)):
        return None
    v = float(m.group(1) or 0) * 10000 + float(m.group(2) or 0)
    return -v if neg else v


LEV = re.compile(r"레버리지|인버스|2X|곱버스", re.I)
# ETF 테마 — 위에서부터 처음 맞는 것 (이름 + 기초지수). 업종 테마가 지역보다 먼저: '미국반도체' → 반도체 · AI
THEMES = [
    ("레버리지 · 인버스", LEV),
    ("머니마켓 · 금리", r"CD금리|KOFR|머니마켓|MMF|초단기|단기채|단기통안|SOFR|금리액티브|발행어음"),
    ("채권", r"국고채|국채|채권|회사채|크레딧|Treasury|TIPS|국공채|특수채|은행채|통안채|금융채|채 ?액티브|미국채|장기채|중기채"),
    ("금 · 원자재", r"골드|금선물|금현물|KRX금|은선물|실버|원유|WTI|구리|원자재|농산물|천연가스|팔라듐|금광"),
    ("리츠 · 인프라", r"리츠|REITs?|부동산"),
    ("배당 · 커버드콜", r"배당|커버드콜|인컴|프리미엄|타겟위클리|위클리"),
    ("반도체 · AI", r"반도체|(?-i:(?<![A-Za-z])(?:AI|IT)(?![A-Za-z]))|인공지능|필라델피아|빅테크|테크|소프트웨어|클라우드|로봇|양자"),
    ("2차전지 · 전기차", r"2차전지|이차전지|배터리|리튬|전기차|자율주행|수소"),
    ("헬스케어 · 바이오", r"헬스케어|바이오|제약|의료|비만"),
    ("조선 · 방산 · 원전", r"조선|방산|방위|원자력|원전|우주|항공|기계|전력|에너지|건설|인프라|소재|철강|화학"),
    ("금융", r"은행|증권|보험|금융|지주"),
    ("소비 · 미디어", r"소비|여행|화장품|미디어|엔터|게임|K-?컬처|음식|자동차|운송|유통"),
    ("미국", r"미국|S&P|나스닥|NASDAQ|다우|(?-i:(?<![A-Za-z])US(?![A-Za-z]))"),
    ("중국 · 홍콩", r"중국|차이나|항셍|홍콩|CSI|China"),
    ("일본", r"일본|니케이|TOPIX|Japan"),
    ("인도 · 신흥국", r"인도|베트남|신흥|이머징|브라질|인도네시아|멕시코|아시아"),
    ("글로벌 · 선진국", r"글로벌|선진|World|유로|유럽|독일|MSCI"),
    ("국내 대표지수", r"200|코스피|코스닥|KRX|TOP ?10|대형|중소형|밸류업|KOSPI|KOSDAQ|MSCI ?Korea"),
]
THEMES = [(t, re.compile(r, re.I) if isinstance(r, str) else r) for t, r in THEMES]


def etf_theme(name, base):
    txt = f"{name} {base or ''}"
    return next((t for t, rx in THEMES if rx.search(txt)), "기타 테마")


def upjong_names():
    """네이버 업종 번호 → 이름 (integration 의 industryCode 와 같은 번호). 못 받으면 빈 사전"""
    try:
        out, page = {}, 1
        while page <= 20:
            d = json.loads(get(UPJONG.format(page)))
            gs = d.get("groups") or []
            out.update({str(g["no"]): g["name"] for g in gs if g.get("no") is not None and g.get("name")})
            if not gs or len(out) >= (d.get("totalCount") or 0):
                break
            page += 1
        return out
    except Exception as e:
        print(f"업종 이름을 못 받음 — {e}")
        return {}


def metrics_etf(it):
    bars, integ, an = it["bars"], it["integ"] or {}, it["fin"] or {}
    key = integ.get("etfKeyIndicator") or {}
    closes = [b[4] for b in bars]
    c = closes[-1]
    m = {"close": c, "chg": (c / closes[-2] - 1) * 100 if len(closes) > 1 and closes[-2] else 0.0}
    m["r6"] = c / closes[-121] - 1 if len(closes) > 120 and closes[-121] else None
    m["r1y"] = c / closes[-250] - 1 if len(closes) >= 250 and closes[-250] else (key.get("returnRate1y") / 100 if key.get("returnRate1y") is not None else None)
    m["ma"] = [sma(closes, n) for n in (20, 60, 120)]
    m["hi52"], m["lo52"] = max(b[2] for b in bars[-250:]), min(b[3] for b in bars[-250:])
    m["fromHi"] = c / m["hi52"] - 1 if m["hi52"] else None
    rets = [closes[i] / closes[i - 1] - 1 for i in range(max(1, len(closes) - 250), len(closes)) if closes[i - 1]]
    m["vol"] = (sum(r * r for r in rets) / len(rets)) ** 0.5 * math.sqrt(250) if len(rets) >= 60 else None
    # 변동성은 연 10% 를 바닥으로 — 머니마켓 · 채권처럼 거의 안 움직이는 ETF 가 이 항목을 휩쓸지 않게
    m["sharpe"] = m["r1y"] / max(m["vol"], 0.10) if m["r1y"] is not None and m["vol"] else None
    m["fee"] = key.get("totalFee") if key.get("totalFee") is not None else num(next((x.get("value") for x in integ.get("totalInfos") or [] if x.get("code") == "fundPay"), None))
    m["track"] = an.get("chaseErrorRate")
    m["dev"] = abs(key["deviationRate"]) if key.get("deviationRate") is not None else None
    m["nav"] = eok(key.get("totalNav") or an.get("totalNav")) or float(it["cap"])
    m["tv20"] = sum(b[4] * b[5] for b in bars[-20:]) / min(20, len(bars)) / 1e8
    inflow = eok(((an.get("cumulativeNetInflowList") or {}).get("cumulativeNetInflow1m")))
    m["inflow1m"] = inflow
    m["inflowR"] = inflow / m["nav"] if inflow is not None and m["nav"] else None
    deals = integ.get("dealTrendInfos") or []
    fo = sum(((num(d.get("foreignerPureBuyQuant")) or 0) + (num(d.get("organPureBuyQuant")) or 0)) * (num(d.get("closePrice")) or 0) for d in deals)
    m["flow"] = fo / 1e8 if deals else None
    m["flowR"] = fo / (it["cap"] * 1e8) if deals and it["cap"] else None
    m["deals"] = [[d.get("bizdate"), num(d.get("foreignerPureBuyQuant")), num(d.get("organPureBuyQuant")),
                   num(d.get("individualPureBuyQuant")), num(d.get("closePrice"))] for d in deals]
    st = stoch(bars)
    m["k"], m["d"] = (st[0], st[1]) if st else (None, None)
    m["lev"] = bool(LEV.search(it["name"]))
    desc = integ.get("description") or an.get("etfSummary") or ""
    m["summary"] = [x.strip() for x in re.split(r"<br\s*/?>|\n", desc) if x.strip()][:3]
    perf = {x.get("periodTypeCode"): x.get("value") for x in an.get("returnPerformanceList") or []}
    m["etf"] = {"base": an.get("etfBaseIndex") or "", "issuer": an.get("issuerName") or key.get("issuerName") or "",
                "listed": an.get("listedDate") or "", "fee": m["fee"], "track": m["track"], "dev": key.get("deviationRate"),
                "devSign": key.get("deviationSign") or "", "nav": m["nav"], "div": key.get("dividendYieldTtm"), "tv20": round(m["tv20"], 1),
                "inflow1m": inflow, "inflow1y": eok(((an.get("cumulativeNetInflowList") or {}).get("cumulativeNetInflow1y"))),
                "perf": [[k, perf[k]] for k in ("M1", "M3", "M6", "YTD", "Y1", "Y3", "Y5") if perf.get(k) is not None],
                "top": [[x.get("itemName"), x.get("etfWeight")] for x in (an.get("etfTop10MajorConstituentAssets") or [])[:10]],
                "sector": [[x.get("detailTypeCode"), x.get("weight")] for x in (an.get("sectorPortfolioList") or []) if (x.get("weight") or 0) >= 1][:6]}
    return m


def stoch_item(m):
    if m["k"] is None:
        return {"n": f"스토캐스틱 ({SN},{SKS},{SDS})", "max": 10, "s": 4.0, "v": "자료 없음", "note": "자료가 없어 낮게 잡았어요"}
    (k0, k1), (d0, d1) = m["k"], m["d"]
    if k0 <= d0 and k1 > d1:
        s, why = (10 if k1 < 30 else 9 if k1 < 60 else 7), "골든크로스 — 매수 신호" + (" (낮은 자리)" if k1 < 30 else "")
    elif k0 >= d0 and k1 < d1:
        s, why = 1, "데드크로스 — 매도 신호"
    elif k1 > d1:
        s, why = (7, "%K 가 %D 위 — 오르는 흐름") if k1 < 80 else (5, "%K 가 %D 위지만 80 넘어 과열")
    else:
        s, why = (4, "%K 가 %D 아래지만 20 아래 과매도 — 반등 대기") if k1 <= 20 else (2, "%K 가 %D 아래 — 내리는 흐름")
    return {"n": f"스토캐스틱 ({SN},{SKS},{SDS})", "max": 10, "s": s, "v": f"%K {k1:.0f} / %D {d1:.0f}", "note": why}


def mk_item(name, mx, p, val, note=None, miss=0.4):
    if p is None:
        return {"n": name, "max": mx, "s": round(mx * miss, 1), "v": val or "자료 없음", "note": note or "자료가 없어 낮게 잡았어요"}
    return {"n": name, "max": mx, "s": round(mx * p, 1), "v": val, "note": note or pct_s(p)}


def finish(m, cats, flags, catdef):
    cs = [round(sum(x["s"] for x in g), 1) for g in cats]
    total = max(0, min(100, round(sum(cs) + sum(f["s"] for f in flags))))
    grade = next((g, t) for lim, g, t in GRADES if total >= lim)
    ratio = sorted(((cs[i] / mx, nm) for i, (nm, mx) in enumerate(catdef)), reverse=True)
    tag = f"{ratio[0][1]}↑ {ratio[-1][1]}↓"
    if m["k"] is not None:
        (k0, k1), (d0, d1) = m["k"], m["d"]
        if k0 <= d0 and k1 > d1:
            tag += " · 골든크로스"
        elif k0 >= d0 and k1 < d1:
            tag += " · 데드크로스"
    return {"score": total, "grade": grade[0], "gradeT": grade[1], "tag": tag, "cats": cs,
            "detail": [{"k": nm, "max": mx, "s": cs[i], "items": cats[i]} for i, (nm, mx) in enumerate(catdef)], "flags": flags}


def score_etf(items):
    """ETF 끼리 백분위로"""
    ms = {it["code"]: it["m"] for it in items}
    R = {k: Rank([m[k] for m in ms.values()]) for k in ("r6", "fromHi", "sharpe", "fee", "track", "dev", "nav", "tv20", "inflowR", "flowR")}
    low = lambda r, v: (1 - r(v)) if v is not None and r(v) is not None else None
    out = {}
    for code, m in ms.items():
        ma, c = m["ma"], m["close"]
        chain = [ma[0] is not None and c > ma[0], ma[0] is not None and ma[1] is not None and ma[0] > ma[1],
                 ma[1] is not None and ma[2] is not None and ma[1] > ma[2]]
        cats = [
            [mk_item("6개월 수익률", 10, R["r6"](m["r6"]), f"{m['r6'] * 100:+.1f}%" if m["r6"] is not None else None),
             {"n": "이동평균 정배열", "max": 8, "s": round(8 / 3 * sum(chain), 1), "v": f"{sum(chain)}/3",
              "note": " · ".join(t + ("○" if ok else "✕") for t, ok in zip(("종가>20일", "20일>60일", "60일>120일"), chain))},
             mk_item("52주 고점 대비", 7, R["fromHi"](m["fromHi"]), f"{m['fromHi'] * 100:+.1f}%" if m["fromHi"] is not None else None,
                     f"고점 {m['hi52']:,}원 · 가까운 쪽 {pct_s(R['fromHi'](m['fromHi']))}" if m["fromHi"] is not None else None)],
            [mk_item("1년 수익률 ÷ 변동성", 15, R["sharpe"](m["sharpe"]), f"{m['sharpe']:.2f}" if m["sharpe"] is not None else None,
                     (f"1년 {m['r1y'] * 100:+.1f}% · 변동성 연 {m['vol'] * 100:.0f}% · " + pct_s(R["sharpe"](m["sharpe"]))) if m["sharpe"] is not None else None)],
            [mk_item("총보수", 10, low(R["fee"], m["fee"]), f"연 {m['fee']:.3f}%" if m["fee"] is not None else None,
                     f"싼 쪽 {pct_s(low(R['fee'], m['fee']))}" if m["fee"] is not None else None),
             mk_item("추적오차", 5, low(R["track"], m["track"]), f"{m['track']:.2f}%" if m["track"] is not None else None,
                     f"작은 쪽 {pct_s(low(R['track'], m['track']))}" if m["track"] is not None else None),
             mk_item("괴리율", 5, low(R["dev"], m["dev"]), f"{m['dev']:.2f}%" if m["dev"] is not None else None,
                     f"작은 쪽 {pct_s(low(R['dev'], m['dev']))}" if m["dev"] is not None else None)],
            [mk_item("순자산", 8, R["nav"](m["nav"]), f"{m['nav']:,.0f}억" if m["nav"] else None),
             mk_item("20일 평균 거래대금", 7, R["tv20"](m["tv20"]), f"{m['tv20']:,.1f}억")],
            [mk_item("1개월 순유입", 8, R["inflowR"](m["inflowR"]), f"{m['inflow1m']:+,.0f}억" if m["inflow1m"] is not None else None,
                     (f"순자산 대비 {m['inflowR'] * 100:+.1f}% · " + pct_s(R["inflowR"](m["inflowR"]))) if m["inflowR"] is not None else None),
             mk_item("외국인+기관 5일 순매수", 7, R["flowR"](m["flowR"]), f"{m['flow']:+,.1f}억" if m["flow"] is not None else None,
                     (f"시총 대비 {m['flowR'] * 100:+.2f}% · " + pct_s(R["flowR"](m["flowR"]))) if m["flowR"] is not None else None)],
            [stoch_item(m)],
        ]
        flags = [{"n": "레버리지 · 인버스", "s": -5, "v": "장기 보유 주의"}] if m["lev"] else []
        out[code] = finish(m, cats, flags, ECATS)
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
            it["m"] = metrics_etf(it) if it["etf"] else metrics(it)
            items.append(it)
        except Exception as e:
            print(f"skip {it['code']}: {e}", file=sys.stderr)
    ups = upjong_names()
    print(f"업종 이름 {len(ups)}개")
    sc = {**score_all([it for it in items if not it["etf"]]), **score_etf([it for it in items if it["etf"]])}
    old_rows = {r[0]: r for r in old.get("s", [])}
    old_basis = old.get("basis")
    rows = []
    b = f"{basis[:4]}-{basis[4:6]}-{basis[6:]}"
    for it in items:
        code, m, s = it["code"], it["m"], sc[it["code"]]
        o = old_rows.get(code)
        # prev = 직전 기준일의 점수 (같은 기준일로 다시 돌면 그 전 값을 그대로)
        prev = (o[6] if old_basis != b else o[7]) if o else None
        mk = "E" if it["etf"] else "P" if it["market"] == "코스피" else "Q"
        grp = etf_theme(it["name"], m["etf"].get("base")) if it["etf"] else ups.get(str(m["industry"]), "")
        sig = ""
        if m["k"] is not None:
            (k0, k1), (d0, d1) = m["k"], m["d"]
            sig = "G" if k0 <= d0 and k1 > d1 else "D" if k0 >= d0 and k1 < d1 else ""
        rows.append([code, it["name"], mk, it["cap"], m["close"], round(m["chg"], 2), s["score"], prev, s["grade"], s["tag"], grp, sig])
        # 점수 기록 — 이전 상세 파일에서 이어 받는다
        path = os.path.join(out, "s", code + ".json")
        hist = []
        try:
            od = json.load(open(path, encoding="utf-8"))
            hist = od.get("hist") or ([[od["basis"], od["score"]]] if od.get("basis") and od.get("score") is not None else [])
        except Exception:
            pass
        hist = [h for h in hist if h[0] != b][-(HIST - 1):] + [[b, s["score"]]]
        detail = {"code": code, "name": it["name"], "market": it["market"], "cap": it["cap"], "basis": b, "runAt": now.isoformat(timespec="seconds"),
                  "close": m["close"], "chg": round(m["chg"], 2), "score": s["score"], "prev": prev, "grade": s["grade"], "gradeT": s["gradeT"],
                  "tag": s["tag"], "cats": s["detail"], "flags": s["flags"], "params": [SN, SKS, SDS],
                  "deals": m["deals"], "summary": m["summary"], "grp": grp, "sig": sig, "hist": hist}
        if it["etf"]:
            detail.update({"etf": m["etf"], "info": {"hi52": m["hi52"], "lo52": m["lo52"], "r6": m["r6"], "r1y": m["r1y"], "vol": m["vol"]}})
        else:
            detail.update({"info": {"per": m["per"], "perDesc": m["perDesc"], "cper": m["cper"], "pbr": m["pbr"], "div": m["div"], "frgn": m["frgn"],
                                    "hi52": m["hi52"], "lo52": m["lo52"], "r1": m["r1"], "r6": m["r6"], "industry": m["industry"]},
                           "fin": m["fin"], "research": m["research"]})
        detail["bars"] = it["bars"][-KEEP:]
        with open(path, "w", encoding="utf-8") as f:
            json.dump(detail, f, ensure_ascii=False, separators=(",", ":"))
    # 이번에 못 받은 종목은 이전 줄을 그대로 둔다 (자동완성에서 빠지지 않게)
    have = {r[0] for r in rows}
    rows += [r for c, r in old_rows.items() if c not in have and any(s["code"] == c for s in stocks)]
    rows.sort(key=lambda r: -r[3])
    idx = {"basis": b, "runAt": now.isoformat(timespec="seconds"), "params": [SN, SKS, SDS],
           "cats": [[n, mx] for n, mx in CATS], "ecats": [[n, mx] for n, mx in ECATS], "grades": [[lim, g, t] for lim, g, t in GRADES], "s": rows}
    with open(os.path.join(out, "index.json"), "w", encoding="utf-8") as f:
        json.dump(idx, f, ensure_ascii=False, separators=(",", ":"))
    dist = {g: sum(1 for r in rows if r[8] == g) for _, g, _ in GRADES}
    print(f"국내주식 평가: 기준일 {b} · {len(items)}종목 평가 · 등급 {dist} ({time.time() - t0:.0f}초)")
    sc_sorted = sorted(r[6] for r in rows)
    print("점수 분포 (5·25·50·75·95·99%):", [sc_sorted[int(len(sc_sorted) * q)] for q in (0.05, 0.25, 0.5, 0.75, 0.95, 0.99)])
    for r in sorted(rows, key=lambda r: -r[6])[:5]:
        print(f"  최고 {r[1]} {r[6]}점 · {r[9]}")
    er = sorted(r[6] for r in rows if r[2] == "E")
    if er:
        print(f"ETF {len(er)}개 점수 분포 (5·25·50·75·95%):", [er[int(len(er) * q)] for q in (0.05, 0.25, 0.5, 0.75, 0.95)],
              {g: sum(1 for r in rows if r[2] == "E" and r[8] == g) for _, g, _ in GRADES})
        for r in sorted((r for r in rows if r[2] == "E"), key=lambda r: -r[3])[:6]:
            print(f"  ETF {r[1]} ({r[0]}) {r[6]}점 {r[8]} · {r[9]}")
    for r in rows[:10]:
        print(f"  {r[1]} ({r[0]}) {r[6]}점 {r[8]} · {r[9]} · 전일 {r[7]} · {r[10] if len(r) > 10 else ''}")
    grps = {}
    for r in rows:
        if len(r) > 10:
            grps.setdefault((r[2] == "E", r[10]), []).append(r)
    for etf in (False, True):
        g = sorted(((k[1], len(v)) for k, v in grps.items() if k[0] == etf), key=lambda x: -x[1])
        print(("ETF 테마" if etf else "업종"), len(g), "개:", ", ".join(f"{n or '(없음)'} {c}" for n, c in g[:40]))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"::warning::국내주식 평가 갱신 중 오류 — {e}")
