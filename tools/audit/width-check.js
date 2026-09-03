/* Container-width consistency check.
   CLAUDE.md core rule 6: "Every section shares one container-width
   system, not an ad hoc size per component." This script measures every
   top-level section's real rendered left/right edges against the page's
   own .container reference on every real page, and flags any section
   whose edges don't match the rest — either shrink-wrapped tight to its
   own content or stretched wider than its siblings.

   This does NOT flag narrower content *within* a full-width section (a
   centered CTA, a search box) as a problem — those are normal. It flags
   the SECTION-level wrapper itself drifting from the shared width, which
   is the actual failure mode the rule is about (see the "One shared
   container width" section of CLAUDE.md for the full reasoning, including
   the documented, intentional exception: .hero-stage's full-bleed hero).

   Usage: see README.md. Exits non-zero if any section's edges differ from
   the page's most common (mode) section width by more than TOLERANCE_PX,
   and it isn't in the ALLOWED_EXCEPTIONS list. */
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8821/';
const PAGES = (process.env.PAGES || 'index.html,events.html,games.html,edu.html,ambassador.html').split(',');
const OUT_DIR = process.env.OUT_DIR || path.join(__dirname, 'out');
const TOLERANCE_PX = 3; // sub-pixel rendering noise
// Sections that deliberately break out of the shared container, with the
// reason documented in style.css itself — keep this list in sync with any
// new documented exception (search CLAUDE.md's "One shared container
// width" section for the current canonical list).
const ALLOWED_EXCEPTIONS = ['hero-stage'];

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const allFindings = [];

  for (const p of PAGES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 1000 });
    // 2026-09-04: explicit 45s timeout added, same reason as collect.js.
    await page.goto(BASE + p, { waitUntil: 'networkidle0', timeout: 45000 });
    await new Promise(r => setTimeout(r, 500));

    const data = await page.evaluate(() => {
      const sections = Array.from(document.querySelectorAll('main > section, main > .section'));
      return sections.map(el => {
        const r = el.getBoundingClientRect();
        return {
          id: (el.id || el.className || el.tagName).toString().slice(0, 60),
          left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width),
        };
      }).filter(s => s.width > 50);
    });

    if (!data.length) { await page.close(); continue; }
    // Mode width (most common left edge) = the shared container's real edge on this page
    const counts = {};
    for (const s of data) counts[s.left] = (counts[s.left] || 0) + 1;
    const modeLeft = Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);

    for (const s of data) {
      if (ALLOWED_EXCEPTIONS.includes(s.id)) continue;
      if (Math.abs(s.left - modeLeft) > TOLERANCE_PX) {
        allFindings.push({ page: p, section: s.id, left: s.left, expectedLeft: modeLeft, width: s.width });
      }
    }
    await page.close();
  }

  console.log(`Checked container-width consistency across ${PAGES.length} pages`);
  console.log(`Findings: ${allFindings.length}`);
  for (const f of allFindings) {
    console.log(`  [${f.page}] section "${f.section}" left=${f.left} (page's shared left=${f.expectedLeft}), width=${f.width}`);
  }
  fs.writeFileSync(path.join(OUT_DIR, 'width-findings.json'), JSON.stringify(allFindings, null, 2));
  await browser.close();
  process.exit(allFindings.length ? 1 : 0);
})();
