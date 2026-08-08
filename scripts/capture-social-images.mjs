#!/usr/bin/env node
/**
 * Capture the "Weekly lineup" events board as two social-ready PNGs:
 *   - 16:9 (1920x1080) -> out/<mondayDate>-16x9.png   ("basic desktop version")
 *   - 1:1  (1200x1200)  -> out/<mondayDate>-1x1.png    ("as it shrinks for mobile")
 *
 * Renders the live home page (index.html) itself with the `board-mode`
 * class applied. Board-mode does isolation ONLY (hides header/footer/hero,
 * lets .eu-board span the full viewport width) — it does not force a
 * height or an aspect ratio.
 *
 * FIXED capture widths, not a best-ratio search. An earlier version of
 * this script scanned a range of viewport widths per week and picked
 * whichever one's natural aspect ratio landed closest to the target —
 * which meant every week could render at a different width, and since
 * the board's type scale is clamp()-based (tied to viewport width), the
 * fonts/logo/layout proportions visibly shifted from week to week. That
 * read as "the design changed" even though nothing but the search result
 * had. Fixed widths trade a little aspect-ratio precision (a small,
 * consistent edge crop) for the thing that actually matters for a weekly
 * social series: every post looks like the same template. The two widths
 * below (FIXED_WIDTH_16X9, FIXED_WIDTH_1X1) were picked by checking that
 * every real week's content (including the busiest ones with 2-3 Special
 * Events rows) still fits within .eu-board's min-height at that width
 * without a title getting clipped — see the git history for the scan
 * that picked these numbers if content ever grows enough to need revisiting.
 *
 * Also does a quick responsive sanity sweep across a handful of
 * intermediate viewport widths (desktop -> mobile) and reports any
 * horizontal overflow, so a broken breakpoint doesn't ship silently.
 *
 * Usage:
 *   node scripts/capture-social-images.mjs [--out <dir>] [--date YYYY-MM-DD] [--weeks N]
 *
 * Dependencies: `playwright` (browser automation) and `sharp` (final
 * resize-to-exact-dimensions step), both already resolvable globally in
 * this environment via the node_modules/ symlinks alongside this script.
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
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

// Fixed capture widths — same every week, on purpose (see header comment).
const FIXED_WIDTH_16X9 = 1150;
const FIXED_WIDTH_1X1 = 660;
const TALL_ENOUGH = 2400; // viewport height, generous so nothing ever clips during capture

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
    // --weeks N: in addition to the usual "current week" 16:9 + 1:1 pair,
    // also render both for each of the next N upcoming weekly themes
    // (data/events.json's weeklyThemes) — one pair per week.
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

    async function loadBoard() {
      await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
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
    }

    async function waitForLogo() {
      await page.waitForFunction(() => {
        const img = document.querySelector('.board-logo');
        return !!img && img.complete && img.naturalWidth > 0;
      }, { timeout: 10000 });
    }

    // Capture .eu-board's natural rendering at a fixed width, then fit
    // (minimal center-crop) to the exact target pixel dimensions.
    async function captureBoardFit(width, targetW, targetH, outPath) {
      await page.setViewportSize({ width, height: TALL_ENOUGH });
      await waitForLogo();
      await page.waitForTimeout(150);
      const box = await page.locator('.eu-board').boundingBox();
      const buf = await page.locator('.eu-board').screenshot();
      await sharp(buf)
        .resize(targetW, targetH, { fit: 'cover', position: 'top' })
        .png()
        .toFile(outPath);
      return { width, naturalRatio: box ? +(box.width / box.height).toFixed(3) : null };
    }

    async function captureDesktopAndSquare(outPrefix) {
      const desktop = await captureBoardFit(FIXED_WIDTH_16X9, 1920, 1080, `${outPrefix}-16x9.png`);
      const square = await captureBoardFit(FIXED_WIDTH_1X1, 1200, 1200, `${outPrefix}-1x1.png`);
      return {
        sixteenNine: { path: `${outPrefix}-16x9.png`, ...desktop },
        oneToOne: { path: `${outPrefix}-1x1.png`, ...square },
      };
    }

    // --- current week ---
    await loadBoard();
    const monday = mondayOf(args.date);
    const current = await captureDesktopAndSquare(path.join(args.out, monday));

    // --- responsive sanity sweep (desktop -> mobile), same board-mode page ---
    const overflowWarnings = [];
    for (const w of SWEEP_WIDTHS) {
      const h = Math.round(w * (w >= 1000 ? 9 / 16 : 1));
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(80);
      const overflowing = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth + 1; // +1px rounding tolerance
      });
      if (overflowing) overflowWarnings.push(w);
    }

    // --- optional: one 16:9 + 1:1 pair per upcoming weekly theme (--weeks N) ---
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
        await loadBoard();
        const outPrefix = path.join(args.out, `week${i + 1}-${theme.start}`);
        const result = await captureDesktopAndSquare(outPrefix);
        weekCaptures.push({ week: i + 1, weekStart: theme.start, weekEnd: theme.end, theme: theme.theme, ...result });
      }
    }

    console.log(JSON.stringify({
      ok: true,
      monday,
      current,
      overflowWarnings,
      weekCaptures,
    }, null, 2));
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(err => {
  console.error(JSON.stringify({ ok: false, error: String(err && err.stack || err) }));
  process.exit(1);
});
