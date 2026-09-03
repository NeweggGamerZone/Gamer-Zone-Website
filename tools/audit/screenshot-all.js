/* Full-page screenshot capture at every standard breakpoint, for every
   real page. Two consumers:
     1. This QA loop's own visual/persona review step (docs/QA-RUNBOOK.md)
        — Claude reads these images each run rather than reasoning about
        CSS values on paper, per CLAUDE.md's "never call a
        responsive/sizing change done without rendering it" rule.
     2. Anyone who wants a quick visual diff of the site at mobile
        (~390px), tablet (~800px), and desktop (~1400px) without spinning
        up a browser by hand.

   Usage: see README.md. Always exits 0 (this is a capture step, not a
   pass/fail check) — findings from what's IN the screenshots belong to
   the manual persona/visual-review step, not this script. */
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8821/';
const PAGES = (process.env.PAGES || 'index.html,events.html,games.html,edu.html,ambassador.html').split(',');
const OUT_DIR = process.env.OUT_DIR || path.join(__dirname, 'out');
const SHOT_DIR = path.join(OUT_DIR, 'screenshots');
const BREAKPOINTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 800, height: 1000 },
  { name: 'desktop', width: 1400, height: 1000 },
];

(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const paths = [];

  for (const p of PAGES) {
    for (const bp of BREAKPOINTS) {
      const page = await browser.newPage();
      await page.setViewport({ width: bp.width, height: bp.height });
      // 2026-09-04: timeout raised 20s -> 45s after the homepage hero photo
      // reel grew from 6 to 104 real photos (each duplicated once by
      // GZ.marquee for its seamless loop, so ~208 <img> requests on that
      // one page) -- networkidle0 genuinely needs more real time to settle
      // with that many requests in flight, this isn't masking a hang.
      await page.goto(BASE + p, { waitUntil: 'networkidle0', timeout: 45000 });
      await new Promise(r => setTimeout(r, 500));
      // Real scroll-through so scroll-triggered .reveal fade-ins are visible in the shot
      const h = await page.evaluate(() => document.body.scrollHeight);
      for (let y = 0; y < h; y += 350) { await page.evaluate(yy => window.scrollTo({ top: yy, behavior: 'instant' }), y); await new Promise(r => setTimeout(r, 40)); }
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await new Promise(r => setTimeout(r, 300));
      const filePath = path.join(SHOT_DIR, `${p.replace('.html', '')}.${bp.name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      paths.push(filePath);
      console.log(`${p} @ ${bp.name} -> ${filePath}`);
      await page.close();
    }
  }

  await browser.close();
  console.log(`\n${paths.length} screenshots written to ${SHOT_DIR}`);
})();
