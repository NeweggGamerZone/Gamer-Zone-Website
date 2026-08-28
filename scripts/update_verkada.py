#!/usr/bin/env python3
"""Write a fresh Verkada guest sign-in link into data/config.json.

Manual:   python scripts/update_verkada.py "https://command.verkada.com/checkin.html?...&token=..."
Clear:    python scripts/update_verkada.py --clear   (fall back to the static reservation link)

As of 2026-08-26, Verkada's guest self-registration link (the one behind
"Get QR code" -> "Print a sign-in page" in the Guest module) is long-lived --
about a year -- not a daily-rotating token. The site's Visit CTA
(assets/js/main.js, assets/js/calendar.js) reads `verkadaUrl` directly:

    cfg.verkadaUrl || cfg.reservationUrl

There is no daily-link priority in the live code (an earlier plan described
in docs/06-VERKADA.md for a `verkadaDailyUrl`/`verkadaDailyDate` pair was
never wired up and has been removed from config.json as dead weight).

So: just refresh `verkadaUrl` directly, roughly once a year (or whenever
Verkada issues a new one / the stored `verkadaUrlExpires` date approaches).
This script also stamps `verkadaUrlUpdated` (today) and, optionally,
`verkadaUrlExpires` if you pass it as a second argument.
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
        cfg.pop("verkadaUrl", None)
        cfg.pop("verkadaUrlUpdated", None)
        cfg.pop("verkadaUrlExpires", None)
        print("Cleared Verkada link — site falls back to the static reservation link.")
    else:
        cfg["verkadaUrl"] = sys.argv[1].strip()
        cfg["verkadaUrlUpdated"] = date.today().isoformat()
        if len(sys.argv) > 2:
            cfg["verkadaUrlExpires"] = sys.argv[2].strip()
        print(f"Set Verkada link, updated {cfg['verkadaUrlUpdated']}.")
    json.dump(cfg, open(CFG, "w"), indent=2)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
