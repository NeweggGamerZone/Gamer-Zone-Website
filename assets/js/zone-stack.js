/* About Gamer Zone: expanding grid carousel, round 4 (2026-09-16).
   Replaces the old left/right peek-card carousel (full prior history in
   git and CLAUDE.md) per Eric's direct reference to
   https://ui.watermelon.sh/animated-components/category/carousel's
   "Minimal Carousel" -- a grid of equal thumbnails where clicking one
   promotes it into a large featured card with the rest compacting into a
   row, animated with a smooth layout transition. That reference is a
   React/framer-motion component; this site is plain vanilla JS, so the
   same interaction is reproduced with real CSS Grid (.zone-grid-item's
   `order`/`grid-column` toggle -- see style.css) plus a classic FLIP
   animation here in JS, since CSS alone can't transition a discrete grid
   property like `order` or `grid-column`.

   FLIP = First, Last, Invert, Play: measure every item's position/size
   BEFORE the DOM/class change ("First"), make the change and measure
   again ("Last"), apply the inverse of that delta as an instant transform
   so nothing visibly moves yet ("Invert"), then clear the transform with a
   transition enabled so the browser animates from the inverted position
   back to natural -- which reads as a smooth move from the old spot to the
   new one, even though the underlying layout property itself just snapped. */
(function () {
  const grid = document.getElementById('zone-grid');
  if (!grid) return;
  const items = Array.from(grid.querySelectorAll('.zone-grid-item'));
  const N = items.length;
  if (!N) return;

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function currentFeaturedIndex() {
    const i = items.findIndex(it => it.classList.contains('is-featured'));
    return i === -1 ? 0 : i;
  }

  function setFeatured(index) {
    if (index === currentFeaturedIndex()) return;

    // "First": record every item's real rect before anything changes.
    const first = reduceMotion ? null : items.map(it => it.getBoundingClientRect());

    items.forEach((it, i) => {
      const isTarget = i === index;
      it.classList.toggle('is-featured', isTarget);
      it.setAttribute('aria-pressed', String(isTarget));
    });

    if (reduceMotion) return; // instant snap only -- no motion to animate

    // "Last": the browser has already reflowed synchronously since classList
    // changes apply immediately; read the new rects now.
    const last = items.map(it => it.getBoundingClientRect());

    // "Invert": for each item, jump it back to where it visually WAS via a
    // transform (translate + scale), with transitions off so this is
    // invisible -- .flip-pre kills the transition for exactly one frame.
    items.forEach((it, i) => {
      const f = first[i], l = last[i];
      const dx = f.left - l.left;
      const dy = f.top - l.top;
      const sx = f.width / l.width;
      const sy = f.height / l.height;
      it.classList.add('flip-pre');
      it.style.transformOrigin = 'top left';
      it.style.transform = `translate(${dx}px,${dy}px) scale(${sx},${sy})`;
    });

    // "Play": next frame, re-enable transitions and clear the inverse
    // transform -- the browser animates from the inverted spot to the
    // real, natural (untransformed) layout, which is the actual move/grow.
    requestAnimationFrame(() => {
      grid.classList.add('flip-ready');
      items.forEach(it => {
        it.classList.remove('flip-pre');
        it.style.transform = '';
      });
      const done = () => {
        grid.classList.remove('flip-ready');
        items.forEach(it => { it.style.transformOrigin = ''; });
        grid.removeEventListener('transitionend', done);
      };
      grid.addEventListener('transitionend', done, { once: true });
      // Safety net in case transitionend never fires (e.g. a zero-delta
      // item that never actually transitions).
      setTimeout(done, 500);
    });
  }

  // ---- Keyboard: roving tabindex + arrow-key grid navigation (rule 8) ----
  // Only the featured item is a real Tab stop at any given moment; every
  // other item is reachable by arrow keys from there, matching the roving-
  // tabindex pattern this project already uses on the calendar grid.
  function syncTabIndex() {
    const f = currentFeaturedIndex();
    items.forEach((it, i) => { it.tabIndex = i === f ? 0 : -1; });
  }
  function select(index) {
    setFeatured(index);
    syncTabIndex();
  }
  syncTabIndex();
  items.forEach((it, i) => { it.addEventListener('click', () => select(i)); });

  // 2026-09-17, per Eric ("the minimal carousel should return to its
  // original card design when we click off"): clicking anywhere outside
  // the grid reverts to the original default-featured card (index 0, PC
  // Gaming Zone -- the same card that's marked is-featured in the raw
  // HTML on page load), the same way the Watermelon UI reference this
  // component is based on returns to its own resting state once you look
  // away. A plain document-level 'click' listener (not 'pointerdown', so
  // it fires after the item's own click handler above has already run and
  // won't fight a genuine "click a different card" action) checks
  // `contains` against the grid itself, not `closest('.zone-grid-item')`,
  // so clicking the grid's own padding/gaps (not a card) also counts as
  // "outside" and reverts -- matching the reference pattern where any
  // click off the component collapses it back down.
  document.addEventListener('click', e => {
    if (grid.contains(e.target)) return;
    select(0);
  });

  function columnCount() {
    const style = getComputedStyle(grid);
    return style.gridTemplateColumns.split(' ').filter(Boolean).length || 1;
  }

  grid.addEventListener('keydown', e => {
    const from = items.indexOf(document.activeElement);
    if (from === -1) return;
    let to = null;
    const cols = columnCount();
    if (e.key === 'ArrowRight') to = (from + 1) % N;
    else if (e.key === 'ArrowLeft') to = (from - 1 + N) % N;
    else if (e.key === 'ArrowDown') to = (from + cols) % N;
    else if (e.key === 'ArrowUp') to = (from - cols + N) % N;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = N - 1;
    if (to === null) return;
    e.preventDefault();
    items[to].tabIndex = 0;
    items[from].tabIndex = -1;
    items[to].focus();
    // Arrow keys move focus only (standard roving-tabindex behavior) --
    // Enter/Space (native <button> behavior, free) is what actually
    // selects/expands the focused item.
  });
})();
