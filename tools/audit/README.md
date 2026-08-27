# Pixel-verified contrast audit

This is the tool CLAUDE.md's "Mandatory: run the pixel-verified contrast
audit on every passover" rule refers to. It checks every real text node on
every real page against WCAG 2.1 AAA (7:1 normal text, 4.5:1 large text)
by actually rendering the page and sampling real pixels — not by reading
CSS color values in isolation, which already missed a real, live failure
once (see the "Readability" section of `CLAUDE.md` for that story).

It does **not** check non-text UI elements (borders, focus rings, icons,
chart slices) — those have no AAA tier and need a separate manual check
against the AA 3:1 floor whenever a session touches them.

## First-time setup (once per fresh environment)

```
bash tools/audit/setup.sh
```

Installs Puppeteer. If headless Chrome can't launch because of missing
shared libraries (common in a minimal sandbox with no root access),
this also fetches just those `.deb` packages with `apt-get download`
(no root needed — download only, not install) and extracts them locally
into `tools/audit/.deps/` with `dpkg-deb -x`. Both `node_modules/` and
`.deps/` are gitignored — this step needs re-running in a fresh sandbox
that doesn't persist `tools/audit/` install state (it's cheap, a few
seconds).

## Running the audit

```
bash tools/audit/run.sh
```

Serves the repo root over HTTP, walks all 5 real pages, and prints any
failures with the page, the text, the element, the measured ratio, and
where it fell short. Exits non-zero if anything fails. Results (including
the two screenshots per page collect.js used to sample from) land in
`tools/audit/out/` (gitignored — regenerated every run).

To check a subset of pages, or run against a server you already have up:

```
BASE_URL=http://127.0.0.1:8821/ node tools/audit/collect.js
python3 tools/audit/analyze.py
```

## How it works

1. **`collect.js`** opens each page in headless Chrome, scrolls all the
   way through it first (so scroll-triggered `.reveal` fade-ins are
   actually visible when the DOM is walked), then walks every real text
   node (`document.createTreeWalker(..., NodeFilter.SHOW_TEXT)`),
   recording its computed color/fontSize/fontWeight and its precise glyph
   position (`Range.getClientRects()`, not the parent element's box).
   It then screenshots the page twice: once normally, and once with a
   temporary stylesheet forcing every text node transparent — isolating
   the true rendered background (gradients, photo overlays, opacity
   stacking, decorative effects) with the text removed.
2. **`analyze.py`** samples the background-only screenshot at each text
   node's exact position (a small median-based pixel window, to dodge
   anti-aliasing noise), computes the real WCAG contrast ratio between
   that sampled background and the text's own computed color (relative
   luminance formula implemented directly, no external library), and
   checks it against 7:1 or 4.5:1 depending on font size/weight.

## When to run this

Per `CLAUDE.md`: on every content update and every page change, not just
dedicated color-audit or visual-redesign sessions. A copy edit, a new
card, or a background swap can introduce a real contrast failure just as
easily as a deliberate color-system change can.
