#!/usr/bin/env python3
"""Pixel-verified contrast audit — step 2 of 2 (see collect.js for step 1).

Reads the text-node inventory (items.json) and the two full-page
screenshots (*.normal.png / *.bgonly.png) collect.js produced, samples the
REAL rendered background pixels behind each text node from the bg-only
screenshot (text hidden, so gradients/photo overlays/opacity stacking are
all still visible), computes the true WCAG contrast ratio between each
text node's own computed color and that sampled background, and checks it
against WCAG 2.1 AAA: 7:1 for normal text, 4.5:1 for large text (>=24px,
or >=18.66px bold). Non-text UI/graphical elements (borders, focus rings,
icons) have no AAA tier and are NOT covered by this script — check those
separately against the AA 3:1 floor (see CLAUDE.md's "Readability"
section) whenever a session touches them.

Usage: see README.md for full setup.
    BASE_URL=http://127.0.0.1:8821/ node collect.js
    python3 analyze.py
"""
import json
import os
import re
import sys
from pathlib import Path

from PIL import Image

OUT_DIR = Path(os.environ.get("OUT_DIR", Path(__file__).parent / "out"))
EPSILON = 0.05  # small tolerance for anti-aliasing/rounding noise at a pass/fail boundary


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def parse_rgb(s):
    m = re.match(r"rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)", s)
    if not m:
        return None
    r, g, b = float(m.group(1)), float(m.group(2)), float(m.group(3))
    return (r, g, b)


def srgb_to_linear(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def rel_lum(rgb):
    r, g, b = (srgb_to_linear(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(rgb1, rgb2):
    l1, l2 = rel_lum(rgb1), rel_lum(rgb2)
    lighter, darker = max(l1, l2), min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


def sample_bg(img, x, y, window=3):
    """Median-based sample over a small window around (x, y), to dodge
    anti-aliasing noise at glyph edges rather than reading one raw pixel.
    A text node's recorded (x, y) can fall outside the screenshot's actual
    bounds -- e.g. a GZ.marquee track duplicates its content and lays the
    second copy out well past the viewport's right edge in the DOM, while
    Puppeteer's fullPage screenshot only captures the page's normal
    scrollable box. Clamp the *window itself* into the image first so
    crop() never receives an inverted/out-of-range box, rather than
    clamping x0/x1 independently (which is what let x0 end up > x1 when x
    was beyond the image entirely)."""
    w, h = img.size
    if w == 0 or h == 0:
        return (0, 0, 0)
    cx = max(0, min(x, w - 1))
    cy = max(0, min(y, h - 1))
    x0, x1 = max(0, cx - window), min(w, cx + window + 1)
    y0, y1 = max(0, cy - window), min(h, cy + window + 1)
    region = img.crop((x0, y0, x1, y1)).convert("RGB")
    pixels = list(region.getdata())
    if not pixels:
        return (0, 0, 0)
    rs = sorted(p[0] for p in pixels)
    gs = sorted(p[1] for p in pixels)
    bs = sorted(p[2] for p in pixels)
    mid = len(pixels) // 2
    return (rs[mid], gs[mid], bs[mid])


def main():
    items_path = OUT_DIR / "items.json"
    if not items_path.exists():
        print(f"No {items_path} found — run collect.js first (see README.md).", file=sys.stderr)
        sys.exit(1)

    all_items = json.loads(items_path.read_text())
    total_checked = 0
    failures = []

    for page, items in all_items.items():
        bg_path = OUT_DIR / f"{page}.bgonly.png"
        if not bg_path.exists():
            print(f"WARNING: missing {bg_path}, skipping {page}", file=sys.stderr)
            continue
        bg_img = Image.open(bg_path)

        for item in items:
            fg = parse_rgb(item["color"])
            if fg is None:
                continue
            bg = sample_bg(bg_img, item["x"], item["y"])
            ratio = contrast(fg, bg)

            fs_px = item["fontSize"]
            is_bold = item["fontWeight"] not in ("400", "normal", "300", "200", "100")
            large = fs_px >= 24 or (fs_px >= 18.66 and is_bold)
            threshold = 4.5 if large else 7.0

            total_checked += 1
            if ratio < threshold - EPSILON:
                failures.append({
                    "page": page,
                    "text": item["text"],
                    "tag": item["tag"],
                    "cls": item["cls"],
                    "color": item["color"],
                    "sampled_bg": bg,
                    "fontSize": fs_px,
                    "bold": is_bold,
                    "large_text": large,
                    "ratio": round(ratio, 2),
                    "threshold": threshold,
                    "pos": [item["x"], item["y"]],
                })

    print(f"Checked {total_checked} text items across {len(all_items)} pages")
    print(f"Failures: {len(failures)}")
    print()
    for f in failures:
        print(f"  [{f['page']}] \"{f['text']}\" <{f['tag']} class=\"{f['cls']}\"> "
              f"{f['ratio']}:1 (need {f['threshold']}:1) — color {f['color']} on sampled bg {f['sampled_bg']} "
              f"@ {f['pos']} {'[large text]' if f['large_text'] else ''}")

    (OUT_DIR / "failures.json").write_text(json.dumps(failures, indent=2))
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
