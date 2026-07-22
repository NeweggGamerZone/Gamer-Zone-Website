#!/usr/bin/env python3
"""Write today's Verkada guest sign-in link into data/config.json.

Manual:   python scripts/update_verkada.py "https://newegg.command.verkada.com/guest/site/....?token=..."
Clear:    python scripts/update_verkada.py --clear   (fall back to static link)

The site's Visit CTA uses verkadaDailyUrl only when verkadaDailyDate == today;
otherwise it falls back to the static verkadaUrl, then the reservation page.
The link rotates ~2x/week, so re-run whenever Verkada issues a new one (or let the
scheduled Cowork task do it — see docs/06-VERKADA.md).
"""
import json, os, sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = os.path.join(ROOT, "data", "config.json")

def main():
    if len(sys.argv) < 2:
        print(__doc__); return 1
    cfg = json.load(open(CFG))
    if sys.argv[1] == "--clear":
        cfg["verkadaDailyUrl"] = ""; cfg["verkadaDailyDate"] = ""
        print("Cleared daily link — site falls back to static Verkada link.")
    else:
        cfg["verkadaDailyUrl"] = sys.argv[1].strip()
        cfg["verkadaDailyDate"] = date.today().isoformat()
        print(f"Set daily Verkada link for {cfg['verkadaDailyDate']}.")
    json.dump(cfg, open(CFG, "w"), indent=2)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
