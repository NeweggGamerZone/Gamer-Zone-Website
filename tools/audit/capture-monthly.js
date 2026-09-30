const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8821/';
const OUT = path.join(__dirname, 'out', 'october');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1900 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${BASE}screenshot-monthly-calendar.html`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.documentElement.classList.add('board-mode'));
  await new Promise(r => setTimeout(r, 1200));
  await page.evaluate(() => { const v = document.getElementById('gz-veil'); if (v) v.remove(); });
  await new Promise(r => setTimeout(r, 100));
  const el = await page.$('.eu-board');
  const file = path.join(OUT, 'october-monthly-calendar.png');
  await el.screenshot({ path: file });
  console.log('errors:', errors.length ? errors : 'none', '->', file);
  await browser.close();
})();
