#!/usr/bin/env node
/* Touch-target audit (F-14). Walks every clickable/tappable element across
 * all 5 pages at mobile (390px), tablet (800px), and desktop (1400px)
 * widths and flags anything whose real rendered box is smaller than
 * 44x44 CSS px (WCAG 2.5.5 AAA target size). For each mobile-width
 * failure, saves a cropped screenshot with generous padding so we can
 * see how the element actually reads in context before deciding whether
 * to grow the visible element or just pad its tap zone.
 *
 * Usage: BASE_URL=http://127.0.0.1:8821/ node tools/audit/touch-targets.js
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8821/';
const PAGES = ['index.html', 'events.html', 'games.html', 'edu.html', 'ambassador.html'];
const OUT_DIR = path.join(__dirname, 'out', 'touch-targets');
fs.mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS = {
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true },
  tablet: { width: 800, height: 1024, isMobile: true, hasTouch: true },
  desktop: { width: 1400, height: 900, isMobile: false, hasTouch: false },
};

const MIN = 44;

async function collectTargets(page) {
  return page.evaluate((MIN) => {
    const sel = 'a, button, [role="button"], input[type="checkbox"], input[type="radio"], label[for], select, [tabindex]:not([tabindex="-1"]), .cal-cell, .dot, [data-dot]';
    const els = Array.from(document.querySelectorAll(sel));
    const out = [];
    for (const el of els) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) continue;
      // sr-only labels are intentionally 1x1/clipped -- not a real visual
      // tap target, just an accessible-name association for a paired
      // control. Not an F-14 finding.
      if (el.className && typeof el.className === 'string' && el.className.includes('sr-only')) continue;
      // tabindex="-1" + aria-disabled="true" (the placeholder social icons
      // on Ambassador, e.g. Twitch) are deliberately non-interactive
      // stand-ins, not a real control someone will try to tap.
      if (el.getAttribute('aria-disabled') === 'true' && el.getAttribute('tabindex') === '-1') continue;
      const rects = el.getClientRects();
      if (!rects.length) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // Some elements (zone-stack-dot, pin-close) deliberately keep a small
      // *visual* size but grow their real tap zone via an absolutely
      // positioned ::before pseudo-element -- getBoundingClientRect() on
      // the element itself can't see that, so check the pseudo's own
      // computed box and treat that as the effective hit area when present.
      let effW = r.width, effH = r.height, hasPseudoZone = false;
      try {
        const before = getComputedStyle(el, '::before');
        if (before.content && before.content !== 'none' && before.position === 'absolute') {
          const bw = parseFloat(before.width), bh = parseFloat(before.height);
          if (bw > 0 && bh > 0) { effW = bw; effH = bh; hasPseudoZone = true; }
        }
      } catch (e) {}
      // NOTE: deliberately NOT filtering by current scroll position here --
      // this audit cares about every real rendered target's box size
      // regardless of whether it happens to be scrolled into view right
      // now (a bug in an earlier version of this script silently dropped
      // the Zone Stack's .zone-stack-dot nav, which only renders far below
      // the fold, because collectTargets() ran after scrolling back to 0).
      out.push({
        tag: el.tagName.toLowerCase(),
        cls: el.className && typeof el.className === 'string' ? el.className.slice(0, 80) : '',
        id: el.id || '',
        text: (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40),
        x: Math.round(r.left), y: Math.round(r.top),
        w: Math.round(r.width), h: Math.round(r.height),
        effW: Math.round(effW), effH: Math.round(effH), hasPseudoZone,
        under: effW < MIN || effH < MIN,
      });
    }
    return out;
  }, MIN);
}

(async () => {
  const LD = process.env.LD_LIBRARY_PATH;
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    env: LD ? { ...process.env, LD_LIBRARY_PATH: LD } : process.env,
  });

  const findings = [];

  for (const pageName of PAGES) {
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      const page = await browser.newPage();
      await page.setViewport(vp);
      await page.goto(BASE_URL + pageName, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 800)); // let reveal/fade-ins settle

      // scroll through full page once so lazily-revealed content is present
      await page.evaluate(async () => {
        const step = window.innerHeight;
        let y = 0;
        const max = document.body.scrollHeight;
        while (y < max) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); y += step; }
        window.scrollTo(0, 0);
      });
      await new Promise(r => setTimeout(r, 300));

      const targets = await collectTargets(page);
      const under = targets.filter(t => t.under);
      for (const t of under) {
        findings.push({ page: pageName, viewport: vpName, ...t });
      }

      if (vpName === 'mobile' && under.length) {
        for (let i = 0; i < under.length; i++) {
          const t = under[i];
          const pad = 60;
          const clip = {
            x: Math.max(0, t.x - pad),
            y: Math.max(0, t.y - pad),
            width: Math.min(vp.width, t.w + pad * 2),
            height: Math.min(vp.height * 3, t.h + pad * 2),
          };
          const safeName = `${pageName.replace('.html','')}_${i}_${(t.cls||t.tag).replace(/[^a-z0-9]+/gi,'-').slice(0,30)}.png`;
          try {
            await page.screenshot({ path: path.join(OUT_DIR, safeName), clip });
            t.screenshot = safeName;
          } catch (e) { t.screenshotError = e.message; }
        }
      }

      await page.close();
    }
  }

  await browser.close();

  fs.writeFileSync(path.join(OUT_DIR, 'findings.json'), JSON.stringify(findings, null, 2));

  console.log(`Total sub-44px findings: ${findings.length}`);
  const byKey = {};
  for (const f of findings) {
    const key = `${f.tag}.${f.cls}`;
    byKey[key] = byKey[key] || { count: 0, sample: f };
    byKey[key].count++;
  }
  console.log('\nGrouped by element type:');
  for (const [key, v] of Object.entries(byKey)) {
    console.log(`  ${v.count.toString().padStart(3)}x  ${key}  (e.g. ${v.sample.page}/${v.sample.viewport}: ${v.sample.w}x${v.sample.h} "${v.sample.text}")`);
  }
})();
