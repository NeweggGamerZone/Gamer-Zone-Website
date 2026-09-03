/* Real-photo marquee galleries -- 2026-08-26 redesign of the Past Events
   photo waterfall (all real photos from a recap's pool flow through one
   continuously-scrolling marquee lane, see GZ.marquee in main.js +
   .gz-marquee in style.css, instead of 3 fixed slots cross-fading on a
   timer), generalized 2026-08-28 so the SAME mechanism drives the
   homepage hero's "a real look inside" strip (.hero-proof) too -- one
   real implementation, reused, rather than a second copy for the hero.
   The photo pool is still read straight from each section's own
   <template> (see events.html / index.html) rather than duplicated here,
   so swapping in different real photos is a markup-only edit -- add/
   remove <img> tags in the template and this file picks them up
   automatically, no JS change needed. Any element with `[data-gallery]`
   and a `<template>` full of real <img> tags gets its own independent
   marquee; per-gallery sizing (card width, caption style) lives in CSS
   scoped to that gallery's own class (.photo-waterfall vs .hero-proof),
   not here. */
(function () {
  // 2026-09-04 (per Eric: "randomize the starting photos on the photo
  // reel"): a plain Fisher-Yates shuffle, not a fixed reorder -- every
  // gallery using this file (currently just the hero's expanded 104-photo
  // reel) starts on a different set/order of photos each page load,
  // instead of always opening on the same first few images from the
  // template's markup order.
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function initGallery(wrap) {
    const template = wrap.querySelector('template');
    if (!template) return;
    const photos = shuffle(Array.from(template.content.querySelectorAll('img')).map(img => ({
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt') || '',
    })));
    if (!photos.length) return;

    // 2026-09-03 (per Eric): visible caption overlays removed from every
    // gallery -- alt text stays on the <img> itself (screen readers still
    // get the description), it's just no longer rendered as an on-photo
    // label for sighted visitors.
    //
    // Same-day follow-up: dropped `loading="lazy"` -- every photo (both
    // copies, since GZ.marquee duplicates the set for the seamless loop)
    // is already sitting in the DOM from the start here, just visually
    // clipped by the track's own overflow:hidden, not actually absent from
    // the page. Lazy-loading images that are already fully present (just
    // moved into view later via a CSS transform, not real scrolling) only
    // risks a photo popping in mid-sweep instead of being ready up front,
    // which reads as a stall/"loading error" on a strip that's supposed to
    // be continuously moving. Also added a graceful onerror fallback: if a
    // given photo URL ever 404s or fails to load, that single card hides
    // itself instead of sitting there as a broken-image icon mid-loop.
    const cards = photos.map(p => `<div class="pw-item"><img src="${GZ.esc(p.src)}" alt="${GZ.esc(p.alt)}" onerror="this.closest('.pw-item').style.display='none'"></div>`);
    const speed = parseFloat(wrap.dataset.speed) || 34;
    GZ.marquee(wrap, cards, { speed });
  }

  document.querySelectorAll('[data-gallery]').forEach(initGallery);
})();
