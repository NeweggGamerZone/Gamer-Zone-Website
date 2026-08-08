#!/usr/bin/env node
/**
 * Capture the "Weekly lineup" events board as two social-ready PNGs:
 *   - 16:9 (1920x1080) -> out/<mondayDate>-16x9.png   ("basic desktop version")
 *   - 1:1  (1200x1200)  -> out/<mondayDate>-1x1.png    ("as it shrinks for mobile")
 *
 * Renders the live home page (index.html) itself with the `board-mode`
 * class applied. Board-mode does isolation ONLY (hides header/footer/hero,
 * lets .eu-board span the full viewport width) — it does not force a
 * height or an aspect ratio, and there is no board-mode-only breakpoint.
 * The board's rendered width:height ratio at any given viewport width is
 * simply whatever the site's ordinary responsive CSS (the 900px/640px/
 * 400px width breakpoints already used for normal browsing) produces —
 * exactly like resizing a real browser window.
 *
 * So instead of forcing a square/widescreen viewport, this script scans a
 * range of viewport widths, measures the real rendered .eu-board element
 * at each one, and picks whichever width's natural aspect ratio lands
 * closest to the target (16:9 for desktop, 1:1 for mobile/square). That
 * width's actual rendering — same fonts, same CSS, same layout a visitor
 * would see at that width — is what gets captured. The element screenshot
 * is then fit to the exact target pixel dimensions (social platforms need
 * exact sizes) with a minimal center-crop, since the width search already
 * gets the aspect ratio close before any resizing happens.
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

// Desktop-to-mobile scan range. Wide enough steps to keep the search fast;
// the site's real breakpoints (900/640/400px) all fall inside this range,
// so the scan naturally samples both sides of every reflow.
const SCAN_WIDTHS = [1920, 1680, 1440, 1280, 1150, 1024, 900, 834, 768, 700, 640, 580, 520, 460, 400, 360, 320];
const SWEEP_WIDTHS = [1920, 1440, 1280, 1024, 834, 768, 430, 375, 320];
const TALL_ENOUGH = 2400; // viewport height, generous so nothing ever clips during measurement/capture

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

    // Measure .eu-board's real rendered box at a given viewport width —
    // no forced height, no aspect-ratio CSS; whatever the ordinary
    // responsive rules produce at that width.
    async function boardBoxAt(width) {
      await page.setViewportSize({ width, height: TALL_ENOUGH });
      await waitForLogo();
      await page.waitForTimeout(150); // let layout/fonts settle post-resize
      return page.locator('.eu-board').boundingBox();
    }

    // True if any event title (.eu-name) is wrapping to more than one line
    // at the current viewport width — e.g. a long title like "XP League
    // Fortnite Tournament" can wrap right above the 640px mobile-stack
    // breakpoint, where the row layout still puts date+title side by side
    // but hasn't got much width to spare. Checked at whatever width is
    // already set (no extra viewport switch), so it's free to call inside
    // the same scan loop that measures the board's aspect ratio.
    async function anyNameWraps() {
      return page.evaluate(() => {
        return [...document.querySelectorAll('.eu-name')].some(el => {
          const cs = getComputedStyle(el);
          const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
          return el.getBoundingClientRect().height > lineHeight * 1.4;
        });
      });
    }

    // Scan SCAN_WIDTHS and return the width whose natural aspect ratio
    // (rendered width / rendered height) is closest to targetRatio. When
    // avoidWrap is set, widths where any event title wraps to a second
    // line are skipped in favor of the closest-ratio width that keeps
    // every title on one line — falling back to the plain closest-ratio
    // pick only if every candidate wraps (e.g. a pathologically long title).
    async function findBestWidth(targetRatio, { avoidWrap = false } = {}) {
      let best = null;
      let bestNoWrap = null;
      let bestWraps = false;
      for (const w of SCAN_WIDTHS) {
        const box = await boardBoxAt(w);
        if (!box || !box.height) continue;
        const ratio = box.width / box.height;
        const diff = Math.abs(ratio - targetRatio);
        const wrapped = avoidWrap ? await anyNameWraps() : false;
        const candidate = { width: w, ratio, diff, box };
        if (!best || diff < best.diff) { best = candidate; bestWraps = wrapped; }
        if (avoidWrap && !wrapped && (!bestNoWrap || diff < bestNoWrap.diff)) bestNoWrap = candidate;
      }
      if (!avoidWrap || !bestWraps) return best;
      // The coarse SCAN_WIDTHS list's closest-ratio width wraps a title.
      // Whether text wraps flips on tiny width deltas (both the name
      // column's available space and its font size grow together as the
      // viewport widens, so the two don't cross the "fits on one line"
      // threshold at a single clean point) — so jumping straight to the
      // next coarse SCAN_WIDTHS entry can land somewhere with a much
      // worse aspect ratio than necessary. Do a fine local scan (8px
      // steps, ±80px around the coarse best) to look for a nearby width
      // that both avoids the wrap and keeps the ratio close to best's.
      const lo = Math.max(320, best.width - 80), hi = Math.min(1920, best.width + 80);
      let bestFine = null;
      for (let w = lo; w <= hi; w += 8) {
        const box = await boardBoxAt(w);
        if (!box || !box.height) continue;
        const ratio = box.width / box.height;
        const diff = Math.abs(ratio - targetRatio);
        if (await anyNameWraps()) continue;
        if (!bestFine || diff < bestFine.diff) bestFine = { width: w, ratio, diff, box };
      }
      if (bestFine && (!bestNoWrap || bestFine.diff <= bestNoWrap.diff)) return bestFine;
      return bestNoWrap || best;
    }

    // Capture .eu-board's natural rendering at the given width, then fit
    // (minimal center-crop) to the exact target pixel dimensions.
    async function captureBoardFit(width, targetW, targetH, outPath) {
      await page.setViewportSize({ width, height: TALL_ENOUGH });
      await waitForLogo();
      await page.waitForTimeout(150);
      const buf = await page.locator('.eu-board').screenshot();
      await sharp(buf)
        .resize(targetW, targetH, { fit: 'cover', position: 'top' })
        .png()
        .toFile(outPath);
    }

    async function captureDesktopAndSquare(outPrefix) {
      const desktop = await findBestWidth(16 / 9, { avoidWrap: true });
      await captureBoardFit(desktop.width, 1920, 1080, `${outPrefix}-16x9.png`);
      const square = await findBestWidth(1, { avoidWrap: true });
      await captureBoardFit(square.width, 1200, 1200, `${outPrefix}-1x1.png`);
      return {
        sixteenNine: { path: `${outPrefix}-16x9.png`, atWidth: desktop.width, naturalRatio: +desktop.ratio.toFixed(3) },
        oneToOne: { path: `${outPrefix}-1x1.png`, atWidth: square.width, naturalRatio: +square.ratio.toFixed(3) },
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
