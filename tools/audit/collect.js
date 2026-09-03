/* Pixel-verified contrast audit — step 1 of 2 (see analyze.py for step 2).
   Walks the LIVE, rendered DOM of every real page and records:
     - every real text node's computed color/fontSize/fontWeight and its
       precise glyph rect (via Range.getClientRects(), not the parent
       element's box, which can be much larger than the actual text)
     - two full-page screenshots per page: one normal, one with every
       text node forced transparent so only backgrounds/gradients/photo
       overlays/decorative effects remain (analyze.py samples real pixels
       from this second screenshot to find each text node's TRUE effective
       background, including things a CSS read-through can't see: photo
       overlays, opacity stacking, gradients).

   Why this exists / when to run it: see CLAUDE.md's "Readability" section
   ("Mandatory: run the pixel-verified contrast audit on every passover")
   — a grep/manual review of CSS color declarations already missed a real,
   live failure once (.reg-step-num white-on-orange, 2026-08-26) because it
   checked color variables in isolation instead of what's actually
   rendered. Run this on every content update and every page change, not
   only dedicated color-audit sessions.

   Usage (see README.md for full setup, including headless-Chrome
   dependencies in a minimal sandbox):
     BASE_URL=http://127.0.0.1:8821/ node tools/audit/collect.js
     python3 tools/audit/analyze.py

   Env vars:
     BASE_URL  - where the site is being served (default http://127.0.0.1:8821/)
     PAGES     - comma-separated list of pages to check (default: the 5 real pages)
     OUT_DIR   - where to write items.json + screenshots (default: tools/audit/out) */
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8821/';
const PAGES = (process.env.PAGES || 'index.html,events.html,games.html,edu.html,ambassador.html').split(',');
const OUT_DIR = process.env.OUT_DIR || path.join(__dirname, 'out');

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const allResults = {};

  for (const p of PAGES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 1000 });
    // 2026-09-04: explicit 45s timeout added (was the puppeteer default of
    // 30s) -- the homepage hero photo reel now carries ~208 real <img>
    // requests, same reason as screenshot-all.js/console-check.js.
    await page.goto(BASE + p, { waitUntil: 'networkidle0', timeout: 45000 });
    await new Promise(r => setTimeout(r, 500));

    // Real scroll-through so scroll-triggered .reveal fade-ins are all visible
    // behavior:'instant' matters a lot here -- this site sets
    // html{scroll-behavior:smooth} globally, so a plain window.scrollTo(0,0)
    // on a long page ANIMATES back to top instead of jumping, and a fixed
    // wait afterward isn't reliably long enough for that animation to
    // finish. If rect collection below runs while scrollY is still
    // mid-animation (not actually 0), every "document coordinate" computed
    // as rect.top + scrollY comes out wrong for EVERY element on the page --
    // this produced a batch of bogus contrast "failures" (nav links, the
    // floating Preregister button) the first time this script ran for
    // real, all traceable to this exact bug. See CLAUDE.md's note on
    // scroll-behavior:smooth under "Container & sizing discipline" --
    // same underlying gotcha, different context.
    const h = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 350) { await page.evaluate(yy => window.scrollTo({ top: yy, behavior: 'instant' }), y); await new Promise(r => setTimeout(r, 60)); }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await new Promise(r => setTimeout(r, 200));
    // Belt-and-suspenders: confirm scrollY is actually 0 before proceeding
    // rather than trusting the wait alone.
    await page.waitForFunction(() => window.scrollY === 0, { timeout: 3000 }).catch(() => {});
    // Same category of bug as the scroll-race above, different trigger:
    // anything that reacts to scroll position with an IntersectionObserver
    // + CSS transition (e.g. the floating Preregister node fading itself
    // out via .pin-node.yield while it's avoiding on-screen content, added
    // 2026-08-28) needs a moment to actually finish animating after the
    // scroll settles -- the IO callback itself fires async, then the CSS
    // transition takes its own .3s on top. Without this wait, this script
    // caught the fade mid-flight once (opacity 0.007, not yet the settled
    // 0) and produced a bogus "black text on black background" contrast
    // failure for text that's actually fully invisible a moment later.
    await new Promise(r => setTimeout(r, 400));

    // Collect every real text node's rect + computed style, in page (document) coordinates
    const items = await page.evaluate(() => {
      const results = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          const p = node.parentElement;
          if (!p) return NodeFilter.FILTER_REJECT;
          // checkVisibility() (Chrome 105+) walks the FULL ancestor chain for
          // display/visibility/opacity, not just the immediate parent -- the
          // older manual `getComputedStyle(p)` check here missed elements
          // hidden via an ANCESTOR's opacity/visibility rather than their own
          // (found 2026-08-28: the floating Preregister node fades itself out
          // via opacity:0 on the OUTER .pin-node wrapper while it's avoiding
          // on-screen content, but its text sits in the INNER .pin-btn, whose
          // own computed opacity is still 1 -- the old check missed this and
          // flagged real text with a real 1.04:1 contrast failure that no
          // visitor can actually see, since the whole button is invisible at
          // that moment). Fall back to the old direct-parent-only check on
          // older engines that lack checkVisibility.
          if (typeof p.checkVisibility === 'function') {
            if (!p.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true })) return NodeFilter.FILTER_REJECT;
          } else {
            const cs = getComputedStyle(p);
            if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      let node;
      let idx = 0;
      while ((node = walker.nextNode())) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const rects = Array.from(range.getClientRects());
        if (!rects.length) continue;
        const p = node.parentElement;
        const cs = getComputedStyle(p);
        // Use the largest rect (first line) as representative sample point
        let best = rects[0];
        for (const r of rects) if (r.width * r.height > best.width * best.height) best = r;
        if (best.width < 2 || best.height < 2) continue;
        const scrollX = window.scrollX, scrollY = window.scrollY;
        results.push({
          idx: idx++,
          text: node.nodeValue.trim().slice(0, 40),
          tag: p.tagName,
          cls: (p.className || '').toString().slice(0, 60),
          color: cs.color,
          fontSize: parseFloat(cs.fontSize),
          fontWeight: cs.fontWeight,
          // document-absolute coords (add scroll) so they map onto a full-page screenshot
          x: Math.round(best.left + best.width / 2 + scrollX),
          y: Math.round(best.top + best.height / 2 + scrollY),
          left: Math.round(best.left + scrollX), top: Math.round(best.top + scrollY),
          width: Math.round(best.width), height: Math.round(best.height)
        });
      }
      return results;
    });

    // Screenshot 1: normal page (for reference / visual check)
    await page.screenshot({ path: path.join(OUT_DIR, `${p}.normal.png`), fullPage: true });

    // Screenshot 2: all text made transparent so only backgrounds/gradients/images remain
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.id = '__hide_text__';
      style.textContent = '* { color: transparent !important; text-shadow: none !important; -webkit-text-fill-color: transparent !important; }';
      document.head.appendChild(style);
    });
    await new Promise(r => setTimeout(r, 150));
    await page.screenshot({ path: path.join(OUT_DIR, `${p}.bgonly.png`), fullPage: true });
    await page.evaluate(() => document.getElementById('__hide_text__')?.remove());

    allResults[p] = items;
    console.log(p, 'collected', items.length, 'text items');
    await page.close();
  }

  fs.writeFileSync(path.join(OUT_DIR, 'items.json'), JSON.stringify(allResults, null, 0));
  await browser.close();
})();
