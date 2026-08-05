#!/usr/bin/env node
/**
 * Capture the "Weekly lineup" events board as two social-ready PNGs:
 *   - 1:1  (1200x1200)  -> out/<mondayDate>-1x1.png
 *   - 16:9 (1920x1080)  -> out/<mondayDate>-16x9.png
 *
 * Renders the live home page (index.html) itself with the `board-mode`
 * class applied — the same CSS aspect-ratio machinery (@media
 * max-aspect-ratio: 6/5 / min-aspect-ratio: 3/2 in style.css) that lets
 * the Weekly Lineup board reflow between near-square and widescreen
 * layouts. Capturing straight from the real page (rather than a separate
 * mirror page) means the social screenshots always match what's actually
 * live — nothing to keep hand-in-sync.
 *
 * Also does a quick responsive sanity sweep across a handful of
 * intermediate viewport widths (desktop -> mobile) and reports any
 * horizontal overflow, so a broken breakpoint doesn't ship silently.
 *
 * Usage:
 *   node scripts/capture-social-images.mjs [--out <dir>] [--date YYYY-MM-DD]
 *
 * No dependencies beyond the `playwright` package (already resolvable
 * globally in this environment) and Node's built-in http server.
 */
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function serveStatic(root) {
  return http.createServer((req, res) => {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(root, reqPath);
    if (!filePath.startsWith(root)) { res.writeHead(403); res.end(); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found: ' + reqPath); return; }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
}

function mondayOf(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const args = { out: path.join(ROOT, 'out'), date: null, weeks: 0 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') args.out = path.resolve(argv[++i]);
    else if (argv[i] === '--date') args.date = argv[++i];
    // --weeks N: in addition to the usual "current week" 1:1 + 16:9 pair,
    // also render a 1:1 square for each of the next N upcoming weekly
    // themes (data/events.json's weeklyThemes) — one social image per
    // week, e.g. `--weeks 4` for this week plus the next three.
    else if (argv[i] === '--weeks') args.weeks = parseInt(argv[++i], 10) || 0;
  }
  return args;
}

const SWEEP_WIDTHS = [1920, 1440, 1280, 1024, 834, 768, 430, 375, 320];

async function main() {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.out, { recursive: true });

  const server = serveStatic(ROOT);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
    // Turn on board-mode (normally toggled by hand via devtools before a
    // manual screenshot) and wait for event-update.js to finish rendering
    // #eu-list from data/events.json before capturing anything.
    await page.evaluate(() => document.documentElement.classList.add('board-mode'));
    // Every headless run looks like a "first visit" (fresh, storage-less
    // context), which would otherwise hold the #gz-veil load-in animation
    // on screen for ~900ms+transition. Drop it immediately so captures
    // never include that transient veil graphic.
    await page.evaluate(() => document.getElementById('gz-veil')?.remove());
    await page.waitForFunction(() => {
      const list = document.getElementById('eu-list');
      return !!list && list.children.length > 0;
    }, { timeout: 10000 });
    await page.waitForTimeout(300); // let web fonts finish swapping in

    const monday = mondayOf(args.date);

    // Wait for the board-logo <img> itself to finish decoding — separate
    // from the #eu-list data-render wait above — so a slow/late-loading
    // logo can never end up half-painted (or missing) in a capture.
    async function waitForLogo() {
      await page.waitForFunction(() => {
        const img = document.querySelector('.board-logo');
        return !!img && img.complete && img.naturalWidth > 0;
      }, { timeout: 10000 });
    }

    // Captured via a page-level clip at (0,0,W,H) rather than an
    // .eu-board element screenshot — in board-mode .eu-board is styled to
    // exactly fill the viewport (width:100vw;height:100vh), but 100vw can
    // come out a couple pixels wider than the real viewport in headless
    // Chromium, which made an element screenshot occasionally emit an
    // off-by-a-few-px canvas instead of an exact 1200x1200 / 1920x1080.
    // Clipping to the viewport itself guarantees the exact target pixel
    // dimensions and can't crop the logo, since we've confirmed .board-logo
    // always sits fully inside those bounds at every size tested.
    async function captureViewport(w, h, outPath) {
      await page.setViewportSize({ width: w, height: h });
      await waitForLogo();
      await page.waitForTimeout(200); // let layout/fonts settle post-resize
      await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: w, height: h } });
    }

    // --- 1:1 ---
    const oneToOnePath = path.join(args.out, `${monday}-1x1.png`);
    await captureViewport(1200, 1200, oneToOnePath);

    // --- 16:9 ---
    const sixteenNinePath = path.join(args.out, `${monday}-16x9.png`);
    await captureViewport(1920, 1080, sixteenNinePath);

    // --- responsive sanity sweep (desktop -> mobile), same board-mode page ---
    const overflowWarnings = [];
    for (const w of SWEEP_WIDTHS) {
      const h = Math.round(w * (w >= 1000 ? 9 / 16 : 1)); // widescreen-ish above 1000px, square-ish below
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(80);
      const overflowing = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth + 1; // +1px rounding tolerance
      });
      if (overflowing) overflowWarnings.push(w);
    }

    // --- optional: one 1:1 square per upcoming weekly theme (--weeks N) ---
    const weekCaptures = [];
    if (args.weeks > 0) {
      let themes = [];
      try {
        const eventsData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'events.json'), 'utf8'));
        themes = (eventsData.weeklyThemes || []).slice().sort((a, b) => a.start.localeCompare(b.start));
      } catch {}
      const todayIso = args.date || new Date().toISOString().slice(0, 10);
      const upcoming = themes.filter(t => t.end >= todayIso).slice(0, args.weeks);
      for (let i = 0; i < upcoming.length; i++) {
        const theme = upcoming[i];
        // Fake the page clock to a moment inside this theme's window (noon
        // on its start date) so event-update.js's GZ.todayISO() — and the
        // board-background week-of-month rotation — pick this week's
        // events/art instead of whatever week it really is right now.
        await page.clock.setFixedTime(new Date(`${theme.start}T12:00:00Z`));
        await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.documentElement.classList.add('board-mode'));
        await page.evaluate(() => document.getElementById('gz-veil')?.remove());
        await page.waitForFunction(() => {
          const list = document.getElementById('eu-list');
          return !!list && list.children.length > 0;
        }, { timeout: 10000 });
        await page.waitForTimeout(300);
        const weekPath = path.join(args.out, `week${i + 1}-${theme.start}-1x1.png`);
        await captureViewport(1200, 1200, weekPath);
        weekCaptures.push({ week: i + 1, weekStart: theme.start, weekEnd: theme.end, theme: theme.theme, path: weekPath });
      }
    }

    console.log(JSON.stringify({
      ok: true,
      monday,
      oneToOne: oneToOnePath,
      sixteenNine: sixteenNinePath,
      overflowWarnings,
      weekCaptures,
    }));
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(err => {
  console.error(JSON.stringify({ ok: false, error: String(err && err.stack || err) }));
  process.exit(1);
});
