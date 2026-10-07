/* Gear page (gear.html) -- 2026-10-07, per Eric. Reworked same day: the
   Newegg best-sellers row is gone; the page now opens with a "Gamer Zone
   Setup" baseline (headset, console, monitor, desk, chair, keyboard, mouse)
   and then plain product categories, not tied to any station. Category
   cards flow through a CSS-columns waterfall (see style.css).

   Data provenance (core rule 4, no fabrication):
   - The 14 "featured" products come from window.GZ_GEAR, the one verified
     list owned by featured-gear.js (hand-verified against Newegg.com
     2026-09-11). Not duplicated here, so the two pages can't drift.
   - PlayStation 5 Digital Slim (N82E16868110357), Nintendo Switch 2
     (N82E16878966017), MSI MAESTRO 300 headset (N82E16826554074) and the two
     Fractal Design Scape headsets (N82E16826743003 Dark, N82E16826743004
     Light) were added 2026-10-07; name/spec/photo read from each live
     Newegg page. The MSI Maestro 300 is a HEADSET (Eric typed "msi maestro 30").
   - "The MSI monitor" in the Setup is the MSI MPG 271QRX (already on the
     verified list); swap the SETUP entry if a different MSI model is meant.
   - No prices, same as the homepage. This is gear SIMILAR to what runs in
     the Gamer Zone, not a claim about exact floor units. No usage data
     exists for "most used equipment", so none is claimed. */
(function () {
  const setupRoot = document.getElementById('gear-setup');
  const catRoot = document.getElementById('gear-categories');
  if (!setupRoot || !catRoot || !window.GZ_GEAR) return;

  const IMG = 'https://c1.neweggimages.com/productimage/nb640/';
  const EXTRA = {
    ps5: { name: 'PlayStation 5 Digital Slim Console', spec: '825GB SSD · 4K up to 120fps · ray tracing · haptic feedback', img: IMG + '68-110-357-08.jpg', url: 'https://www.newegg.com/p/N82E16868110357' },
    switch2: { name: 'Nintendo Switch 2', spec: '7.9" 1080p screen · 256GB · TV, tabletop & handheld modes', img: IMG + '78-966-017-08.jpg', url: 'https://www.newegg.com/black-nintendo-beeskb6aa-switch-2-console/p/N82E16878966017' },
    maestro: { name: 'MSI MAESTRO 300 Gaming Headset', spec: 'Wired USB-C · 40mm drivers · detachable mic · 247g', img: IMG + '26-554-074-04.jpg', url: 'https://www.newegg.com/p/N82E16826554074' },
    fractalDark: { name: 'Fractal Design Scape Dark Wireless Headset', spec: 'USB dongle & Bluetooth 5.3 · 40mm drivers · RGB · up to 40hr battery · charging stand', img: IMG + '26-743-003-28.jpg', url: 'https://www.newegg.com/p/N82E16826743003' },
    fractalLight: { name: 'Fractal Design Scape Light Wireless Headset', spec: 'USB dongle & Bluetooth 5.3 · 40mm drivers · RGB · up to 40hr battery · charging stand', img: IMG + '26-743-004-27.jpg', url: 'https://www.newegg.com/p/N82E16826743004' },
    // Added 2026-10-07 (PC + parts); name/spec/photo read from each live Newegg page.
    stratos: { name: 'ABS Stratos II Aqua Gaming PC (Refurbished)', spec: 'Core i9-14900KF · GeForce RTX 5070 Ti 16GB · 32GB DDR5 · 2TB NVMe SSD · Windows 11', img: IMG + '83-360-994-13.jpg', url: 'https://www.newegg.com/p/N82E16883360994C' },
    case4000: { name: 'CORSAIR FRAME 4000D RS ARGB Mid-Tower Case', spec: 'Black · steel & tempered glass · 3 RS120 ARGB fans · fits 360mm radiators', img: IMG + '11-139-228-02.png', url: 'https://www.newegg.com/corsair-atx-mid-tower-frame-4000d-rs-argb-steel-tempered-glass-computer-case-black/p/N82E16811139228' },
    aio: { name: 'ASUS ROG STRIX LC III 360 ARGB LCD Liquid Cooler', spec: '360mm AIO · 2.1" IPS LCD · Intel LGA 1700/1200/115x · AMD AM5/AM4', img: IMG + '35-101-114-13.png', url: 'https://www.newegg.com/asus-aio-360-series/p/N82E16835101114' },
    rtx5070: { name: 'GIGABYTE WindForce GeForce RTX 5070 12GB', spec: '12GB GDDR7 · PCIe 5.0 · 3 x DisplayPort 2.1b + HDMI 2.1b', img: IMG + '14-932-782-02.jpg', url: 'https://www.newegg.com/gigabyte-windforce-gv-n5070wf3-12gd-geforce-rtx-5070-12gb-graphics-card-triple-fans/p/N82E16814932782' },
    rx9070xt: { name: 'GIGABYTE Gaming Radeon RX 9070 XT 16GB OC', spec: '16GB GDDR6 · PCIe 5.0 · triple-fan WINDFORCE cooling · RGB lighting', img: IMG + '14-932-751-07.jpg', url: 'https://www.newegg.com/gigabyte-gv-r9070xtgaming-oc-16gd-radeon-rx-9070-xt-16gb-graphics-card-triple-fans/p/N82E16814932751' },
    // Added 2026-10-07; name/spec/photo read from the live Newegg page.
    rtx5080: { name: 'MSI Ventus GeForce RTX 5080 16GB GDDR7 (RTX 5080 16G VENTUS 3X OC)', spec: '16GB GDDR7 · 256-bit · PCIe 5.0 · 2640 MHz boost · 3 x DisplayPort 2.1b + HDMI 2.1b', img: IMG + '14-137-930-03.jpg', url: 'https://www.newegg.com/msi-rtx-5080-16g-ventus-3x-oc-geforce-rtx-5080-16gb-graphics-card/p/N82E16814137930' },
    // Added 2026-10-07; name/spec/photo read from the live Newegg page (N82E16824992231).
    monitorArm: { name: 'Rosewill RMS-P61U Single Monitor Arm (Black)', spec: 'Fits 13"-35" screens up to 26.5lbs · gas spring · built-in USB port · C-clamp & grommet mount · VESA 75/100', img: IMG + '24-992-231-06.jpg', url: 'https://www.newegg.com/rosewill-rms-p61u-monitor-arms-black/p/N82E16824992231' },
    vengeance: { name: 'CORSAIR Vengeance RGB 32GB (2 x 16GB) DDR5-6000', spec: 'CL36 · Intel XMP 3.0 · ten-zone RGB lighting', img: IMG + '20-236-879-03.jpg', url: 'https://www.newegg.com/corsair-vengeance-rgb-32gb-ddr5-6000-cas-latency-cl36-desktop-memory-black/p/N82E16820236991' }
  };

  const find = re => window.GZ_GEAR.find(g => re.test(g.name));
  const by = re => window.GZ_GEAR.filter(g => re.test(g.name));

  // The baseline Gamer Zone setup, in Eric's order.
  const SETUP = [
    ['Headset', EXTRA.fractalDark],
    ['Console', EXTRA.ps5],
    ['Monitor', find(/271QRX/)],
    ['Desk', find(/MARS PRO/)],
    ['Chair', find(/NxSys/)],
    ['Keyboard', find(/Vigor GK30/)],
    ['Mouse', find(/Clutch GM08/)]
  ].filter(s => s[1]);

  // Categories by product name, so a future addition to featured-gear.js
  // lands in the right place without touching this file.
  const CATS = [
    { title: 'Consoles', icon: 'gamepad', items: [EXTRA.ps5, EXTRA.switch2] },
    { title: 'Gaming PCs', icon: 'pc', items: by(/Gaming PC/i).concat([EXTRA.stratos]) },
    { title: 'PC Components', icon: 'chip', items: [EXTRA.case4000, EXTRA.rtx5080, EXTRA.rtx5070, EXTRA.rx9070xt, EXTRA.aio, EXTRA.vengeance] },
    { title: 'Monitors', icon: 'monitor', items: by(/Monitor/i) },
    { title: 'Keyboards', icon: 'keyboard', items: by(/Keyboard/i) },
    { title: 'Mice', icon: 'run', items: by(/Mouse/i).filter(g => !/Keyboard/i.test(g.name)) },
    { title: 'Headsets', icon: 'chat', items: [EXTRA.fractalDark, EXTRA.fractalLight, EXTRA.maestro] },
    { title: 'Chairs & Desks', icon: 'users', items: by(/Chair|Desk/i).concat([EXTRA.monitorArm]) }
  ];

  // The whole card is one link (no nested buttons), so a click anywhere shops it.
  const card = (g, tag) => `<a class="card gear-card" href="${GZ.esc(g.url)}" target="_blank" rel="noopener" aria-label="${GZ.esc('Shop ' + g.name + ' on Newegg (opens in new tab)')}">
      <span class="gear-card-img"><img src="${GZ.esc(g.img)}" alt="" onerror="this.closest('.gear-card').style.display='none'"></span>
      <span class="gear-card-body">
        ${tag ? `<span class="tag orange">${GZ.esc(tag)}</span>` : ''}
        <h4>${GZ.esc(g.name)}</h4>
        <span class="dim gear-card-spec">${GZ.esc(g.spec)}</span>
        <span class="gear-card-cta">Shop on Newegg &rarr;</span>
      </span>
    </a>`;

  setupRoot.innerHTML = SETUP.map(s => card(s[1], s[0])).join('');

  catRoot.innerHTML = CATS.filter(c => c.items.length).map(c => {
    const id = 'gc-' + c.title.replace(/\W+/g, '-');
    return `<section class="gear-cat" aria-labelledby="${GZ.esc(id)}">
      <h3 id="${GZ.esc(id)}"><i data-ic="${c.icon}"></i> ${GZ.esc(c.title)} <span class="dim gear-cat-count">${c.items.length}</span></h3>
      <div class="gear-grid">${c.items.map(g => card(g, '')).join('')}</div>
    </section>`;
  }).join('');

  // Equal heights: plain CSS grids fill left to right in reading order; this
  // pass makes every card on the page as tall as the tallest one (a floor, so
  // text still wraps and grows if it ever needs more room).
  function equalize() {
    const cards = [...document.querySelectorAll('#gear-page .gear-card')];
    cards.forEach(c => { c.style.minHeight = ''; });
    const h = Math.max(0, ...cards.map(c => c.offsetHeight));
    if (h) cards.forEach(c => { c.style.minHeight = h + 'px'; });
  }
  equalize();
  window.addEventListener('load', equalize);
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(equalize, 120); });

  // main.js's injectIcons() already ran at DOMContentLoaded, so convert the
  // placeholders this render just added (same call calendar.js makes).
  injectIcons(document.getElementById('gear-page'));
})();
