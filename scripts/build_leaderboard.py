#!/usr/bin/env python3
"""Build data/leaderboard.json from the newest SENET export in assets/Leaderboard/.

Zone Points per player:
  session hours total   -> 10 pts / hour      (total = avg session hours * # sessions)
  average session time  -> 10 pts / hour       (rounded up)
  friends referred      -> 100 pts / visitor   (manual, from data/referrals.json)

Run:  python scripts/build_leaderboard.py
"""
import glob, json, math, os
from datetime import date
import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LB_DIR = os.path.join(ROOT, "assets", "Leaderboard")
REFERRALS = os.path.join(ROOT, "data", "referrals.json")
OUT = os.path.join(ROOT, "data", "leaderboard.json")
PTS_HOUR, PTS_AVG, PTS_REF = 10, 10, 100


def newest_xlsx():
    files = [f for f in glob.glob(os.path.join(LB_DIR, "*.xlsx")) if not os.path.basename(f).startswith("~$")]
    return max(files, key=os.path.getmtime) if files else None


def col_map(header):
    m = {}
    for i, h in enumerate(header):
        if not h:
            continue
        k = str(h).strip().lower()
        if k == "user login": m["user"] = i
        elif "average session time" in k: m["avg"] = i
        elif "number of sessions" in k: m["sessions"] = i
    return m


def main():
    path = newest_xlsx()
    if not path:
        print("No xlsx found in assets/Leaderboard/")
        return 1
    referrals = {}
    if os.path.exists(REFERRALS):
        referrals = {k.lower(): int(v) for k, v in json.load(open(REFERRALS)).get("referrals", {}).items()}

    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    c = col_map(rows[0])
    players = []
    for r in rows[1:]:
        user = r[c["user"]]
        if not user:
            continue
        avg = float(r[c["avg"]] or 0)
        sessions = int(r[c["sessions"]] or 0)
        total_hours = avg * sessions
        refs = referrals.get(str(user).lower(), 0)
        pts = round(total_hours * PTS_HOUR) + math.ceil(avg) * PTS_AVG + refs * PTS_REF
        players.append({
            "username": str(user),
            "sessions": sessions,
            "totalHours": round(total_hours, 1),
            "avgHours": round(avg, 1),
            "referrals": refs,
            "zonePoints": pts,
        })
    players.sort(key=lambda p: p["zonePoints"], reverse=True)
    top = players[:10]

    period = date.today().strftime("%B %Y")
    out = {
        "period": period,
        "generated": date.today().isoformat(),
        "source": os.path.basename(path),
        "scoring": {"pointsPerHour": PTS_HOUR, "pointsPerAvgHour": PTS_AVG, "pointsPerReferral": PTS_REF},
        "players": top,
    }
    json.dump(out, open(OUT, "w"), indent=2)
    print(f"Wrote {OUT}: {len(top)} of {len(players)} players from {os.path.basename(path)}")
    for i, p in enumerate(top, 1):
        print(f"  {i:2}. {p['username']:<16} {p['zonePoints']:>6} pts  ({p['totalHours']}h, avg {p['avgHours']}h, {p['referrals']} refs)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
