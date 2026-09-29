const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8821/';
const OUT = path.join(__dirname, 'out', 'october');
fs.mkdirSync(OUT, { recursive: true });

const EVENTS = [
  'fantastech-2-2026-10-03',
  'car-club-sim-racing-2026-10-24',
  'halloween-costume-party-2026-10-31',
];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  for (const id of EVENTS) {
    for (const fmt of ['square', 'horizontal']) {
      const page = await browser.newPage();
      const size = fmt === 'square' ? { width: 1200, height: 1200 } : { width: 1920, height: 1080 };
      await page.setViewport(size);
      const errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await page.goto(`${BASE}event-card.html?id=${id}&format=${fmt}`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 400));
      const file = path.join(OUT, `${id}-${fmt}.png`);
      await page.screenshot({ path: file });
      console.log(id, fmt, 'errors:', errors.length ? errors : 'none', '->', file);
      await page.close();
    }
  }
  await browser.close();
})();
