#!/usr/bin/env python3
"""
Regenerates the "-blurred.jpg" board-background assets (assets/calendar/
BGAssets/*-blurred.jpg) from their sharp, full-resolution source photos.

Why this exists: these blurred assets are what .eu-board::before (style.css)
uses as the Weekly Lineup board's background image (behind a near-opaque
dark scrim, .eu-board::after -- see that rule's own comment). They used to
be generated once, ad hoc, with no script or documented blur radius
checked into the repo -- which meant "make the blur lighter/heavier" had
no reliable starting point. 2026-09-08, per Eric ("reduce the amount of
blur on the background, since we want to see a little bit more detail"):
regenerated every pair at BLUR_RADIUS below (was effectively much heavier
before -- monitors/text/wall texture were unrecognizable blobs). Re-verified
via the pixel-based WCAG contrast audit (tools/audit/run.sh) after this
change: 0 failures across all 5 pages -- the dark scrim already does most
of the contrast work, so the raw background's blur level has little effect
on text legibility. If Eric asks to go lighter/heavier again, just change
BLUR_RADIUS and rerun this script, then re-run the contrast audit.

Usage: python3 scripts/regenerate-board-backgrounds.py
Requires: Pillow (pip install Pillow --break-system-packages)
"""
import os
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BGDIR = os.path.join(ROOT, 'assets', 'calendar', 'BGAssets')

# Gaussian blur radius (PIL, in px, applied AFTER resizing to the target
# width below) baked into each "-blurred.jpg" asset. Lower = more detail
# visible; raise it back toward ~15-20 to return to the original, heavier
# look. 5 was picked 2026-09-08 as a middle ground: real shapes (neon bars,
# wall texture, monitor glow) read clearly without the image competing
# with the board's own text once the dark scrim is layered on top.
BLUR_RADIUS = 5

# (sharp source, blurred asset to regenerate). Every "-blurred.jpg" file
# actually referenced by style.css (.eu-board::before, .cal-board::before)
# should have an entry here -- add a new pair whenever a new themed
# background is added to data/events.json's weeklyThemes[].bg or similar.
PAIRS = [
    ('dailyplay-bg.jpg', 'dailyplay-bg-blurred.jpg'),
    ('event-update-bg-week1.jpg', 'event-update-bg-week1-blurred.jpg'),
   ('event-update-bg-week2.jpg', 'event-update-bg-week2-blurred.jpg'),
    ('event-update-bg-week3.jpg', 'event-update-bg-week3-blurred.jpg'),
    ('event-update-bg-week4.jpg', 'event-update-bg-week4-blurred.jpg'),
    ('freeplay-bg2.jpg', 'freeplay-bg2-blurred.jpg'),
    ('freeplay-bg3.jpg', 'freeplay-bg3-blurred.jpg'),
    ('majorevent2-bg.jpg', 'majorevent2-bg-blurred.jpg'),
    ('tournament-major-bg.jpg', 'tournament-major-bg-blurred.jpg'),
    ('training-bg.jpg', 'training-bg-blurred.jpg'),
 ]

DEFAULT_TARGET_WIDTH = 1280  # only used if the existing blurred asset is missing


def main():
    for src_name, dst_name in PAIRS:
        src_path = os.path.join(BGDIR, src_name)
        dst_path = os.path.join(BGDIR, dst_name)
        if not os.path.exists(src_path):
            print(f'SKIP (no source): {src_name}')
            continue
        im = Image.open(src_path).convert('RGB')
        w, h = im.size
        try:
            target_w = Image.open(dst_path).size[0]
        except Exception:
            target_w = DEFAULT_TARGET_WIDTH
        target_h = round(h * target_w / w)
        resized = im.resize((target_w, target_h), Image.LANCZOS)
        blurred = resized.filter(ImageFilter.GaussianBlur(radius=BLUR_RADIUS))
        blurred.save(dst_path, quality=85)
        print(f'OK: {dst_name} ({target_w}x{target_h}, radius={BLUR_RADIUS})')


if __name__ == '__main__':
    main()
