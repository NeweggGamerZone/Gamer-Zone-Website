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
    fractalLight: { name: 'Fractal Design Scape Light Wireless Headset', spec: 'USB dongle & Bluetooth 5.3 · 40mm drivers · RGB · up to 40hr battery · charging stand', img: IMG + '26-743-004-27.jpg', url: 'https://www.newegg.com/p/N82E16826743004' }
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
    { title: 'Gaming PCs', icon: 'pc', items: by(/Gaming PC/i) },
    { title: 'Monitors', icon: 'monitor', items: by(/Monitor/i) },
    { title: 'Keyboards', icon: 'keyboard', items: by(/Keyboard/i) },
    { title: 'Mice', icon: 'run', items: by(/Mouse/i).filter(g => !/Keyboard/i.test(g.name)) },
    { title: 'Headsets', icon: 'chat', items: [EXTRA.fractalDark, EXTRA.fractalLight, EXTRA.maestro] },
    { title: 'Chairs & Desks', icon: 'users', items: by(/Chair|Desk/i) }
  ];

  const card = (g, tag) => `<article class="card gear-card">
      <div class="gear-card-img"><img src="${GZ.esc(g.img)}" alt="${GZ.esc(g.name)}" onerror="this.closest('.gear-card').style.display='none'"></div>
      <div class="gear-card-body">
        ${tag ? `<span class="tag orange">${GZ.esc(tag)}</span>` : ''}
        <h4>${GZ.esc(g.name)}</h4>
        <p class="dim">${GZ.esc(g.spec)}</p>
        <a class="btn" href="${GZ.esc(g.url)}" target="_blank" rel="noopener" aria-label="${GZ.esc('View ' + g.name + ' on Newegg (opens in new tab)')}">View on Newegg</a>
      </div>
    </article>`;

  setupRoot.innerHTML = SETUP.map(s => card(s[1], s[0])).join('');

  catRoot.innerHTML = CATS.filter(c => c.items.length).map(c => {
    const id = 'gc-' + c.title.replace(/\W+/g, '-');
    return `<section class="gear-cat" aria-labelledby="${GZ.esc(id)}">
      <h3 id="${GZ.esc(id)}"><i data-ic="${c.icon}"></i> ${GZ.esc(c.title)} <span class="dim gear-cat-count">${c.items.length}</span></h3>
      <div class="gear-masonry" data-min="250">${c.items.map(g => card(g, '')).join('')}</div>
    </section>`;
  }).join('');

  // Waterfall: deal each card into the currently-shortest column, keeping
  // reading order. Card heights are known before photos load (square
  // aspect-ratio wells), so no re-layout is needed when images arrive.
  const masons = [...catRoot.querySelectorAll('.gear-masonry')].map(m => ({ el: m, cards: [...m.children], n: 0 }));
  function layout() {
    masons.forEach(m => {
      const min = +m.el.dataset.min, gap = 16;
      const n = Math.max(1, Math.floor((m.el.clientWidth + gap) / (min + gap)));
      if (n === m.n) return;
      m.n = n;
      const cols = Array.from({ length: n }, () => { const c = document.createElement('div'); c.className = 'gear-mcol'; return c; });
      m.el.replaceChildren(...cols);
      m.cards.forEach(card => {
        const col = cols.reduce((a, b) => (b.offsetHeight < a.offsetHeight ? b : a));
        col.appendChild(card);
      });
    });
  }
  layout();
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 120); });

  // main.js's injectIcons() already ran at DOMContentLoaded, so convert the
  // placeholders this render just added (same call calendar.js makes).
  injectIcons(document.getElementById('gear-page'));
})();
