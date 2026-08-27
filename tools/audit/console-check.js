/* Cross-page console smoke test.
   CLAUDE.md's QA workflow step 5 ("Cross-page smoke test"): load every
   page and confirm no console errors/warnings before pushing to main.
   Checking for the ABSENCE of console errors is not sufficient on its own
   for anything interactive (see the "Testing interactive features" rule
   — actually drive it with simulated input) but it IS a real, cheap,
   necessary floor for every page on every pass.

   Also does a real scroll-through per page (not just a static load) so
   any error that only fires on a scroll-triggered .reveal fade-in, a
   lazy-loaded image, or similar gets caught too — a plain page-load check
   would miss those.

   Usage: see README.md. Exits non-zero if any page logs a console error
   or an uncaught page error. */
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8821/';
const PAGES = (process.env.PAGES || 'index.html,events.html,games.html,edu.html,ambassador.html').split(',');
const OUT_DIR = process.env.OUT_DIR || path.join(__dirname, 'out');

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const allErrors = [];

  for (const p of PAGES) {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') pageErrors.push({ type: 'console.error', text: msg.text() }); });
    page.on('pageerror', err => pageErrors.push({ type: 'uncaught exception', text: err.message }));
    page.on('requestfailed', req => {
      // 404s on real assets are real bugs; ignore analytics/beacon-style
      // requests if this site ever adds any external ones.
      pageErrors.push({ type: 'request failed', text: `${req.method()} ${req.url()} — ${req.failure()?.errorText}` });
    });

    await page.goto(BASE + p, { waitUntil: 'networkidle0', timeout: 20000 });
    await new Promise(r => setTimeout(r, 500));
    const h = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 350) { await page.evaluate(yy => window.scrollTo({ top: yy, behavior: 'instant' }), y); await new Promise(r => setTimeout(r, 40)); }
    await new Promise(r => setTimeout(r, 300));

    if (pageErrors.length) allErrors.push({ page: p, errors: pageErrors });
    console.log(`${p}: ${pageErrors.length} error(s)`);
    await page.close();
  }

  console.log(`\nTotal pages with errors: ${allErrors.length} / ${PAGES.length}`);
  for (const { page, errors } of allErrors) {
    for (const e of errors) console.log(`  [${page}] ${e.type}: ${e.text}`);
  }
  fs.writeFileSync(path.join(OUT_DIR, 'console-findings.json'), JSON.stringify(allErrors, null, 2));
  await browser.close();
  process.exit(allErrors.length ? 1 : 0);
})();
