#!/usr/bin/env node
/* Grabs "before" context screenshots (mobile, 390px) of every real F-14
 * touch-target candidate so the fix sizing can be picked by eye, not
 * just by the raw pixel numbers. */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8821/';
const OUT_DIR = path.join(__dirname, 'out', 'touch-targets', 'before');
fs.mkdirSync(OUT_DIR, { recursive: true });

const SHOTS = [
  { page: 'index.html', scrollTo: '#zone-stack', clip: '.zone-stack-dots', name: 'zone-stack-dots.png', pad: 50 },
  { page: 'index.html', scrollTo: null, clip: '#pin-node', name: 'pin-close.png', pad: 50 },
  { page: 'index.html', scrollTo: '.hero-proof', clip: '.gz-marquee', name: 'gz-marquee-controls.png', hover: true },
  { page: 'events.html', scrollTo: '#week', clip: '.cal-board', name: 'calendar-cells.png' },
  { page: 'index.html', scrollTo: 'footer', clip: '.links-grid', name: 'footer-links.png' },
  { page: 'index.html', scrollTo: '#hero-lighting-select', clip: '#hero-lighting-select', name: 'lighting-select.png', pad: 40 },
];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  for (const shot of SHOTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(BASE_URL + shot.page, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 700));
    if (shot.scrollTo) {
      await page.evaluate(sel => document.querySelector(sel)?.scrollIntoView({ block: 'center' }), shot.scrollTo);
      await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
      await new Promise(r => setTimeout(r, 500));
    }
    if (shot.hover) {
      const box = await page.evaluate(sel => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }, shot.clip);
      if (box) { await page.mouse.move(box.x, box.y); await new Promise(r => setTimeout(r, 300)); }
    }
    const clipBox = await page.evaluate((sel, pad) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const p = pad || 20;
      return {
        x: Math.max(0, r.x - p), y: Math.max(0, r.y - p),
        width: Math.min(window.innerWidth, r.width + p * 2),
        height: Math.min(window.innerHeight, r.height + p * 2),
      };
    }, shot.clip, shot.pad);
    if (clipBox && clipBox.width > 0 && clipBox.height > 0) {
      await page.screenshot({ path: path.join(OUT_DIR, shot.name), clip: clipBox });
      console.log('saved', shot.name);
    } else {
      await page.screenshot({ path: path.join(OUT_DIR, shot.name) });
      console.log('saved (fallback full)', shot.name);
    }
    await page.close();
  }
  await browser.close();
})();
