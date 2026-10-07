/* Gear page (gear.html) -- 2026-10-07, per Eric: "another page ... called
   GEAR ... columns of products featured at each station ... Add Playstation
   ... Add switch ... tighter product page ... featured gear in the gamerzone,
   as well as any best sellers."

   Data provenance (core rule 4, no fabrication):
   - The 14 "featured" products come from window.GZ_GEAR, the one verified
     list owned by featured-gear.js (hand-verified against Newegg.com
     2026-09-11). Not duplicated here, so the two pages can't drift.
   - PlayStation 5 Digital Slim (N82E16868110357), Nintendo Switch 2
     (N82E16878966017) and MSI MAESTRO 300 headset (N82E16826554074) were
     added 2026-10-07; name/spec/photo read from each live Newegg page. The
     MSI Maestro 300 is a gaming HEADSET (Eric typed "msi maestro 30").
   - Best sellers: Newegg's own rankings read from newegg.com's live
     Best Sellers pages on 2026-10-07. Rankings move daily, so the section is
     dated and links out to Newegg's live list rather than claiming a
     permanent rank. There is no usage/sales data on file for "most used
     equipment", so that is intentionally NOT claimed anywhere on the page.
   - No prices, same as the homepage (they go stale; the Newegg page shows
     the live one). As with the homepage, this is gear SIMILAR to what runs
     in the Gamer Zone, not a claim about exact floor units. */
(function () {
  const root = document.getElementById('gear-stations');
  if (!root || !window.GZ_GEAR) return;

  const IMG = 'https://c1.neweggimages.com/productimage/nb640/';
  const EXTRA = {
    ps5: { name: 'PlayStation 5 Digital Slim Console', spec: '825GB SSD · 4K up to 120fps · ray tracing · haptic feedback', img: IMG + '68-110-357-08.jpg', url: 'https://www.newegg.com/p/N82E16868110357' },
    switch2: { name: 'Nintendo Switch 2', spec: '7.9" 1080p screen · 256GB · TV, tabletop & handheld modes', img: IMG + '78-966-017-08.jpg', url: 'https://www.newegg.com/black-nintendo-beeskb6aa-switch-2-console/p/N82E16878966017' },
    maestro: { name: 'MSI MAESTRO 300 Gaming Headset', spec: 'Wired USB-C · 40mm drivers · detachable mic · 247g', img: IMG + '26-554-074-04.jpg', url: 'https://www.newegg.com/p/N82E16826554074' },
    msi272: { name: 'MSI MAG 272QP QD-OLED X24 Monitor', spec: '27" WQHD QD-OLED · 240Hz · 0.03ms', img: IMG + '24-475-535-13.png', url: 'https://www.newegg.com/msi-mag-272qp-qd-oled-x24-27-wqhd-240-hz/p/N82E16824475535' }
  };

  // Category by product name, so a future addition to featured-gear.js lands
  // in the right column without touching this file.
  const by = re => window.GZ_GEAR.filter(g => re.test(g.name));
  const COLUMNS = [
    { title: 'Consoles', zone: 'Console Gaming Zone', icon: 'gamepad', items: [EXTRA.ps5, EXTRA.switch2] },
    { title: 'Gaming PCs', zone: 'PC Gaming Zone', icon: 'pc', items: by(/Gaming PC/i) },
    { title: 'Monitors', zone: 'PC Gaming Zone', icon: 'monitor', items: by(/Monitor/i) },
    { title: 'Keyboards & Mice', zone: 'PC Gaming Zone', icon: 'keyboard', items: by(/Keyboard|Mouse/i).sort((a, b) => /Mouse/.test(a.name) - /Mouse/.test(b.name)) },
    { title: 'Audio', zone: '', icon: 'chat', items: [EXTRA.maestro] },
    { title: 'Seating & Desks', zone: '', icon: 'users', items: by(/Chair|Desk/i) }
  ];

  const BEST = [
    { item: Object.assign({}, window.GZ_GEAR.find(g => /Switch/.test(g.name)) || EXTRA.switch2, EXTRA.switch2), badge: '#1 Best Seller in Nintendo Switch Systems' },
    { item: EXTRA.msi272, badge: '#11 in Gaming Monitors · 4.9 stars (274 reviews)' },
    { item: window.GZ_GEAR.find(g => /XG27AQDMES/.test(g.name)), badge: '#13 in Newegg Gaming & VR best sellers · 4.8 stars (55 reviews)' }
  ].filter(b => b.item);

  const row = g => `<li class="gear-row">
      <div class="gear-row-img"><img src="${GZ.esc(g.img)}" alt="${GZ.esc(g.name)}" onerror="this.closest('.gear-row').style.display='none'"></div>
      <div class="gear-row-body">
        <h4>${GZ.esc(g.name)}</h4>
        <p class="dim">${GZ.esc(g.spec)}</p>
        <a class="btn" href="${GZ.esc(g.url)}" target="_blank" rel="noopener" aria-label="${GZ.esc('View ' + g.name + ' on Newegg (opens in new tab)')}">View on Newegg</a>
      </div>
    </li>`;

  root.innerHTML = COLUMNS.filter(c => c.items.length).map(c => `<section class="card gear-col" aria-labelledby="gc-${GZ.esc(c.title.replace(/\W+/g, '-'))}">
      <div class="gear-col-head">
        <h3 id="gc-${GZ.esc(c.title.replace(/\W+/g, '-'))}"><i data-ic="${c.icon}"></i> ${GZ.esc(c.title)}</h3>
        ${c.zone ? `<span class="tag orange">${GZ.esc(c.zone)}</span>` : ''}
      </div>
      <ul class="gear-col-list">${c.items.map(row).join('')}</ul>
    </section>`).join('');

  const best = document.getElementById('gear-best');
  if (best) {
    best.innerHTML = BEST.map(b => `<div class="card gear-best-card">
        <span class="tag orange">${GZ.esc(b.badge)}</span>
        <ul class="gear-col-list">${row(b.item)}</ul>
      </div>`).join('');
  }

  // main.js's injectIcons() already ran at DOMContentLoaded, so convert the
  // placeholders this render just added (same call calendar.js makes).
  injectIcons(document.getElementById('gear-page'));
})();
