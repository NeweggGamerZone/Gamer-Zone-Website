#!/usr/bin/env python3
"""Scan calendar image drop folders and regenerate data/calendar-manifest.json.

Naming convention:
  assets/calendar/monthly/YYYY-MM*.png|jpg          e.g. 2026-07.png
  assets/calendar/weekly/YYYY-MM-DD*.png|jpg        date = Monday of that week

Run from repo root:  python scripts/update_manifest.py
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}

MONTH_RE = re.compile(r"^(\d{4}-\d{2})")
WEEK_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})")


def scan(folder: Path, pattern: re.Pattern) -> list[dict]:
    items = []
    if not folder.exists():
        return items
    for f in sorted(folder.iterdir()):
        if f.suffix.lower() not in EXTS:
            continue
        m = pattern.match(f.name)
        if not m:
            print(f"  ! Skipping (bad name, needs date prefix): {f.name}")
            continue
        items.append({"file": f.name, "date": m.group(1)})
    return items


def main() -> int:
    monthly = scan(ROOT / "assets/calendar/monthly", MONTH_RE)
    weekly = scan(ROOT / "assets/calendar/weekly", WEEK_RE)

    manifest = {
        "generated": date.today().isoformat(),
        "monthly": monthly,
        "weekly": weekly,
    }
    out = ROOT / "data/calendar-manifest.json"
    out.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out.relative_to(ROOT)}: {len(monthly)} monthly, {len(weekly)} weekly image(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
