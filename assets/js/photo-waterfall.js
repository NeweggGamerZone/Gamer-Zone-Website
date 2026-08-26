/* Past Events photo waterfall -- three photos on screen at once, each in
   its own slot, cycling independently through a recap's photo pool with a
   cross-fade. Same "waterfall" spirit as reviews.js (see that file's own
   history comment), but keeping 3 slots visible at once instead of 1:
   fixed-aspect-ratio photo tiles don't have the wildly-different-height
   problem that pushed the reviews carousel down to a single card, so
   there's no need for reviews.js's JS height-measuring step here -- a
   plain CSS aspect-ratio on each slot (see .photo-waterfall .pw-slot in
   style.css) keeps the grid perfectly stable while the images cycle.

   The photo pool is read straight from the section's own <template> (see
   events.html) rather than duplicated here, so swapping in a future
   event's recap photos is a markup-only edit -- add/remove <img> tags in
   the template and this file picks them up automatically, no JS change
   needed. Every page can have any number of `.photo-waterfall[data-cycle]`
   sections; each one runs its own independent cycle. */
(function () {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FADE_MS = 420;
  const DWELL_MS = 4200; // how long a slot's current photo stays up before swapping

  function initWaterfall(wrap) {
    const template = wrap.querySelector('template');
    const slots = Array.from(wrap.querySelectorAll('.pw-slot'));
    if (!template || !slots.length) return;

    const photos = Array.from(template.content.querySelectorAll('img')).map(img => ({
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt') || '',
    }));
    if (!photos.length) return;

    // Each slot starts on a different photo and steps forward by the slot
    // count on every swap (not +1) -- with pool/slot-count usually
    // coprime, that still visits every photo over time, but keeps the
    // three visible slots showing different photos from each other at any
    // given moment instead of drifting into showing the same one.
    slots.forEach((slot, i) => {
      const img = slot.querySelector('img');
      if (!img) return;
      let cursor = i % photos.length;
      const show = p => { img.src = p.src; img.alt = p.alt; };
      show(photos[cursor]);

      if (reduceMotion || photos.length <= slots.length) return; // nothing left to cycle into

      function tick() {
        slot.classList.add('is-fading');
        setTimeout(() => {
          cursor = (cursor + slots.length) % photos.length;
          show(photos[cursor]);
          slot.classList.remove('is-fading');
          setTimeout(tick, DWELL_MS);
        }, FADE_MS);
      }
      // Stagger each slot's first swap so all three don't flip in lockstep
      // -- reads as a living waterfall rather than a synchronized cut.
      setTimeout(tick, DWELL_MS + i * 900);
    });
  }

  document.querySelectorAll('.photo-waterfall[data-cycle]').forEach(initWaterfall);
})();
