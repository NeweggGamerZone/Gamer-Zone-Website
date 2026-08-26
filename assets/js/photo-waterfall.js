/* Past Events photo waterfall -- 2026-08-26 redesign: all real photos from
   a recap's pool flow through one continuously-scrolling marquee lane
   (see GZ.marquee in main.js + .gz-marquee in style.css) instead of 3
   fixed slots cross-fading on a timer. The photo pool is still read
   straight from the section's own <template> (see events.html) rather
   than duplicated here, so swapping in a future event's recap photos is
   a markup-only edit -- add/remove <img> tags in the template and this
   file picks them up automatically, no JS change needed. Every page can
   have any number of `.photo-waterfall[data-gallery]` sections; each
   builds its own independent marquee. */
(function () {
  function initWaterfall(wrap) {
    const template = wrap.querySelector('template');
    if (!template) return;
    const photos = Array.from(template.content.querySelectorAll('img')).map(img => ({
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt') || '',
    }));
    if (!photos.length) return;

    const cards = photos.map(p => `<div class="pw-item"><img src="${GZ.esc(p.src)}" alt="${GZ.esc(p.alt)}" loading="lazy">${p.alt ? `<span class="pw-cap">${GZ.esc(p.alt)}</span>` : ''}</div>`);
    GZ.marquee(wrap, cards, { speed: 34 });
  }

  document.querySelectorAll('.photo-waterfall[data-gallery]').forEach(initWaterfall);
})();
