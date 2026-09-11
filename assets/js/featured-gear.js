/* Featured Gear marquee -- 2026-09-11, per Eric ("have a cycling section
   that can tie into our website, some products we feature in the gamer
   zone"), directly addressing the senior-designer audit's "Newegg the
   retailer is nearly invisible past the homepage" finding. Real Newegg
   products only -- name, price, one real spec line, and a live outbound
   link straight to that product's real Newegg.com page -- reusing the
   shared GZ.marquee() mechanism (see main.js + .gz-marquee in style.css)
   rather than a new carousel, same "one shared implementation" rule as the
   Reviews and Past Events waterfalls.

   Data below was hand-verified against the live Newegg.com product pages
   on 2026-09-11 (name, price, image URL, one real spec line) -- per core
   rule 4, no fabricated prices or specs. Prices are a snapshot from that
   date and will drift from Newegg's live price over time; this section is
   a browse-and-buy pointer to the real product page (which always shows
   the current live price), not a live price feed -- re-verify this pool
   against Newegg.com again before relying on these prices being current.
   Per Eric, this is gear similar to what's running in the Gamer Zone, not
   a claim that these are the exact serial-numbered units on the floor --
   see this section's own copy in index.html ("We feature similar
   products..."). */
(function () {
  const wrap = document.getElementById('gear-waterfall');
  if (!wrap) return;

  const GEAR = [
    { name: 'ABS Kaze II Aqua Gaming PC', spec: 'RTX 5070 Ti · Core Ultra 7 270K Plus · 32GB DDR5 · 2TB NVMe', price: '$2,699.99', img: 'https://c1.neweggimages.com/productimage/nb640/83-360-970-34.jpg', url: 'https://www.newegg.com/abs-kazeii-aqua-pc-intel-core-ultra-7-270k-plus-geforce-rtx-5070-ti-32gb-ddr5-2tb-ssd-kiia270k5070ti/p/N82E16883360970' },
    { name: 'COUGAR NxSys Aero Gaming Chair', spec: '200mm RGB fan · 150° recline · lumbar pillow', price: '$399.99', img: 'https://c1.neweggimages.com/productimage/nb640/26-567-079-01.png', url: 'https://www.newegg.com/cougar-nxsys-aero-black-computer-gaming/p/N82E16826567079' },
    { name: 'Corsair TC100 Gaming Chair', spec: '90–160° recline · Class 4 gas lift', price: '$306.99', img: 'https://c1.neweggimages.com/productimage/nb640/26-816-201-01.jpg', url: 'https://www.newegg.com/black-corsair-cf-9010050-ww-computer-gaming/p/N82E16826816201' },
    { name: 'COUGAR MARS PRO Gaming Desk', spec: '60" desk · RGB lighting · USB-C monitor extension', price: '$499.00', img: 'https://c1.neweggimages.com/productimage/nb640/26-567-055-V01.jpg', url: 'https://www.newegg.com/p/N82E16826567055' },
    { name: 'MSI MPG 271QRX QD-OLED Monitor', spec: '27" WQHD QD-OLED · 360Hz · 0.03ms', price: '$628.99', img: 'https://c1.neweggimages.com/productimage/nb640/24-475-359-10.jpg', url: 'https://www.newegg.com/msi-mpg-271qrx-qd-oled-27-wqhd-360-hz/p/N82E16824475359' },
    { name: 'ASRock Phantom Gaming PG27FFS1A Monitor', spec: '27" FHD IPS · 240Hz · 1ms', price: '$111.99', img: 'https://c1.neweggimages.com/productimage/nb640/24-028-021-09.jpg', url: 'https://www.newegg.com/asrock-phantom-gaming-pg27ffs1a-27-fhd-240hz-ips-black/p/N82E16824028021' },
    { name: 'ASUS ROG Strix XG27AQDMES Monitor', spec: '26.5" QHD OLED · 240Hz · 0.03ms', price: '$399.99', img: 'https://c1.neweggimages.com/productimage/nb640/24-281-399-10.png', url: 'https://www.newegg.com/asus-xg27aqdmes-26-5-viewable-qhd-240hz-rog-strix-oled-black/p/N82E16824281399' },
    { name: 'GAMDIAS HERMES E7 Keyboard', spec: '80% layout · hot-swappable · volume knob', price: '$42.99', img: 'https://c1.neweggimages.com/productimage/nb640/AJGNS25090913O0ZI74.jpg', url: 'https://www.newegg.com/gamdias-e7-hermes/p/173-01BB-00018' },
    { name: 'GAMDIAS Hermes E3 Keyboard', spec: '60% layout · hot-swappable · brown switches', price: '$35.23', img: 'https://c1.neweggimages.com/productimage/nb640/AJGNS201221nrHkK.jpg', url: 'https://www.newegg.com/p/32N-00CB-00028' },
    { name: 'MSI FRIEREN Edition Keyboard & Mouse', spec: 'Wireless keyboard & mouse bundle · 26,000 DPI', price: '$179.99', img: 'https://c1.neweggimages.com/productimage/nb640/23-167-075-04.jpg', url: 'https://www.newegg.com/p/N82E16823167075' },
    { name: 'MSI Vigor GK30 Keyboard', spec: 'Full-size · 6-zone RGB · water-repellent', price: '$41.99', img: 'https://c1.neweggimages.com/productimage/nb640/23-167-034-Z01.jpg', url: 'https://www.newegg.com/p/N82E16823167034' },
    { name: 'ASUS ROG Strix Scope II 96 Keyboard', spec: '96% wireless · hot-swappable NX Snow switches', price: '$161.99', img: 'https://c1.neweggimages.com/productimage/nb640/23-193-139-02.jpg', url: 'https://www.newegg.com/asus-x901-strix-scope-ii-96-wl-nxsw-ca-pbt-rog-wireless-mechanical-keyboard-rog-nx-snow-switches/p/N82E16823193139' },
    { name: 'MSI Clutch GM08 Mouse', spec: '4,200 DPI optical · adjustable weight', price: '$25.77', img: 'https://c1.neweggimages.com/productimage/nb640/26-554-042-02.jpg', url: 'https://www.newegg.com/msi-s12-0401800-cla-clutch-gm08-usb-2-0-wired/p/N82E16826554042' },
    { name: 'ASUS ROG Harpe Ace Mouse', spec: '54g ultralight · 36,000 DPI · tri-mode wireless', price: '$139.99', img: 'https://c1.neweggimages.com/productimage/nb640/C02WS2605300KE7QD60.jpg', url: 'https://www.newegg.com/p/32K-001D-001B7' },
  ];

  // onerror fallback mirrors photo-waterfall.js's own pattern -- if a given
  // product photo URL ever 404s, that one card hides itself instead of
  // sitting in the lane as a broken-image icon.
  function cardHTML(g) {
    const label = GZ.esc(`View ${g.name} on Newegg (opens in new tab)`);
    return `<div class="card gear-item">
      <!-- No loading="lazy" -- same reasoning as photo-waterfall.js's own
           comment: every card (both the real set and GZ.marquee's
           duplicated copy) is already sitting in the DOM from render,
           just visually clipped by the track's overflow:hidden until the
           scroll brings it into view, not actually absent from the page.
           Lazy-loading an image that's already present risks it popping
           in mid-sweep instead of being ready up front. -->
      <div class="gear-item-img"><img src="${GZ.esc(g.img)}" alt="${GZ.esc(g.name)}" onerror="this.closest('.gear-item').style.display='none'"></div>
      <h3>${GZ.esc(g.name)}</h3>
      <p class="dim gear-item-spec">${GZ.esc(g.spec)}</p>
      <p class="gear-item-price">${GZ.esc(g.price)}</p>
      <a class="btn ghost" href="${GZ.esc(g.url)}" target="_blank" rel="noopener" aria-label="${label}">View on Newegg</a>
    </div>`;
  }

  GZ.marquee(wrap, GEAR.map(cardHTML), { speed: 30 });
})();
