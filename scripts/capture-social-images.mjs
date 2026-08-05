#!/usr/bin/env node
/**
 * Capture the "Weekly lineup" events board as two social-ready PNGs:
 *   - 1:1  (1200x1200)  -> out/<mondayDate>-1x1.png
 *   - 16:9 (1920x1080)  -> out/<mondayDate>-16x9.png
 *
 * Renders screenshot-weekly-lineup.html (the isolated capture page that
 * already exists in the repo, kept in sync with events.html) with the
 * `board-mode` class applied — the same CSS aspect-ratio machinery
 * (@media max-aspect-ratio: 6/5 / min-aspect-ratio: 3/2 in style.css)
 * that lets the board reflow between near-square and widescreen layouts.
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
  const args = { out: path.join(ROOT, 'out'), date: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') args.out = path.resolve(argv[++i]);
    else if (argv[i] === '--date') args.date = argv[++i];
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
    await page.goto(`${base}/screenshot-weekly-lineup.html`, { waitUntil: 'networkidle' });
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
    const board = page.locator('.eu-board');

    // --- 1:1 ---
    await page.setViewportSize({ width: 1200, height: 1200 });
    await page.waitForTimeout(150);
    const oneToOnePath = path.join(args.out, `${monday}-1x1.png`);
    await board.screenshot({ path: oneToOnePath });

    // --- 16:9 ---
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(150);
    const sixteenNinePath = path.join(args.out, `${monday}-16x9.png`);
    await board.screenshot({ path: sixteenNinePath });

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

    console.log(JSON.stringify({
      ok: true,
      monday,
      oneToOne: oneToOnePath,
      sixteenNine: sixteenNinePath,
      overflowWarnings,
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
