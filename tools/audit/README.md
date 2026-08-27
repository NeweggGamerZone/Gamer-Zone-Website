# Site QA tooling

Scripted checks for the QA loop described in `docs/QA-RUNBOOK.md` — read
that file for the full loop (this tooling is step 1 of it; step 2 is
manual-judgment review these scripts structurally can't do, like the
persona walkthrough and interactive-feature playtesting).

Everything here only ever **reads/measures** — nothing in `tools/audit/`
writes to any site file. Findings get reported for review, per
`docs/QA-RUNBOOK.md`'s report-then-approve model; nothing here auto-fixes
anything.

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

## Running everything at once

```
bash tools/audit/run-full-qa.sh
```

Serves the repo root over HTTP once and runs all four scripted checks
below against all 5 real pages in one pass. Exits non-zero if any check
finds something. Results (JSON findings + screenshots) land in
`tools/audit/out/` (gitignored — regenerated every run).

To run one check on its own, or against a server you already have up:

```
BASE_URL=http://127.0.0.1:8821/ node tools/audit/collect.js && python3 tools/audit/analyze.py   # contrast
BASE_URL=http://127.0.0.1:8821/ node tools/audit/width-check.js                                  # container-width
BASE_URL=http://127.0.0.1:8821/ node tools/audit/console-check.js                                # console/error smoke test
BASE_URL=http://127.0.0.1:8821/ node tools/audit/screenshot-all.js                                # screenshots only
```

## What each script checks

- **`collect.js` + `analyze.py`** — pixel-verified WCAG 2.1 AAA contrast
  (7:1 normal text, 4.5:1 large text) for every real text node, by
  actually rendering the page and sampling real pixels — not by reading
  CSS color values in isolation, which already missed a real, live
  failure once (see `CLAUDE.md`'s "Readability" section). Does **not**
  check non-text UI elements (borders, focus rings, icons) — those have
  no AAA tier and need a separate manual check against the AA 3:1 floor.
- **`width-check.js`** — flags any section whose rendered left/right
  edges don't match the page's shared `.container`/`--safe-x` system
  (`CLAUDE.md` core rule 6), against a documented exception list.
- **`console-check.js`** — loads and scrolls through every page, fails on
  any console error, uncaught exception, or failed request.
- **`screenshot-all.js`** — captures every page at mobile/tablet/desktop
  for the manual visual/persona review step in `docs/QA-RUNBOOK.md`.

## How the contrast check works

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

The contrast check specifically: per `CLAUDE.md`, on every content update
and every page change, not just dedicated color-audit or visual-redesign
sessions — a copy edit, a new card, or a background swap can introduce a
real contrast failure just as easily as a deliberate color-system change
can. The full `run-full-qa.sh` pass: whenever Eric asks for a QA loop
run, or before pushing any layout/visual/interactive change to `main` —
see `docs/QA-RUNBOOK.md` for the complete loop this tooling is one half
of.
