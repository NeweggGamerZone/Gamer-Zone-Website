/* About Gamer Zone "trading card" stack — cycles through the zone cards one
   at a time (front card + two peeking behind it, like a hand of cards),
   with prev/next buttons and dot nav for browsing manually.
   2026-09-08, per Eric ("maybe zone stack should not auto scroll at all, so
   there is no induced motion"): the previous 60s auto-advance timer is
   removed entirely -- this carousel only ever moves in response to a real
   click/tap now (prev/next, a dot, or a peeking card), never on its own.
   This also means it no longer needs -- or gets -- the F-13 hover/pause
   treatment the gz-marquee lanes elsewhere on the site need: there's no
   auto-motion here to pause in the first place. */
(function () {
  const stack = document.getElementById('zone-stack');
  if (!stack) return;
  const cards = Array.from(stack.querySelectorAll('.zone-card'));
  const dotsWrap = document.getElementById('zone-dots');
  const prevBtn = document.getElementById('zone-prev');
  const nextBtn = document.getElementById('zone-next');
  const N = cards.length;
  if (!N) return;

  let current = 0;

  if (dotsWrap) {
    dotsWrap.innerHTML = cards.map((_, i) => `<button type="button" class="zone-stack-dot${i === 0 ? ' active' : ''}" data-i="${i}" aria-label="Show zone ${i + 1}"></button>`).join('');
  }

  function render() {
    cards.forEach((card, i) => {
      const offset = (i - current + N) % N;
      // Real left/right carousel: one card centered, near neighbors
      // peeking at the left/right edge of .zone-stack, and (per Eric's
      // "another layer of cards on the outermost left and right" ask)
      // a second, further-out layer beyond that — clipped by
      // .zone-stack's overflow:hidden, all real zone cards from the
      // same rotation rather than decorative filler, so the section
      // actually reads as using its full width instead of just its
      // wrapper technically being 100% wide. Anything beyond that
      // second layer (only possible if more zone cards are added
      // later) stays fully hidden.
      // Guard against slot collisions if N ever shrinks (e.g. N=4 makes
      // "2 offsets forward" and "2 offsets back" the same card) by only
      // using the far-peek slots once they're distinct from every
      // closer slot already claimed above.
      if (offset === 0) card.dataset.pos = 'center';
      else if (offset === 1) card.dataset.pos = 'next';
      else if (offset === N - 1) card.dataset.pos = 'prev';
      else if (offset === 2 && offset !== N - 2 && offset !== N - 1) card.dataset.pos = 'far-next';
      else if (offset === N - 2 && offset !== 1 && offset !== 2) card.dataset.pos = 'far-prev';
      else card.dataset.pos = 'hidden';
    });
    if (dotsWrap) {
      dotsWrap.querySelectorAll('.zone-stack-dot').forEach((d, i) => d.classList.toggle('active', i === current));
    }
  }

  function goTo(i) {
    current = ((i % N) + N) % N;
    render();
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  if (nextBtn) nextBtn.addEventListener('click', next);
  if (prevBtn) prevBtn.addEventListener('click', prev);
  if (dotsWrap) {
    dotsWrap.addEventListener('click', e => {
      const btn = e.target.closest('.zone-stack-dot');
      if (!btn) return;
      goTo(Number(btn.dataset.i));
    });
  }
  // Clicking a peeking (non-front) card brings it to the front too.
  // dragMoved (set by the drag handlers below) suppresses this when a real
  // drag/swipe just ended -- otherwise releasing a drag on top of a peek
  // card would both animate the swipe AND immediately re-fire goTo() from
  // this click, double-advancing.
  let dragMoved = false;
  stack.addEventListener('click', e => {
    if (dragMoved) { dragMoved = false; return; }
    const card = e.target.closest('.zone-card');
    if (!card || card.dataset.pos === 'center') return;
    goTo(cards.indexOf(card));
  });

  // Pointer-based drag/swipe (2026-09-10, per Eric: "do the swipe and drag
  // animation as well," on top of the existing flat/non-rotated peek-card
  // carousel). Single pointer-event set (works for touch, mouse, and pen
  // alike) rather than separate touch/mouse listeners. The stack's own
  // width is the drag "unit" -- a card only has to travel a modest fraction
  // of the section before it commits to advancing, matching how the peek
  // cards already sit fairly close to the center card.
  const DRAG_COMMIT_PX = 70;      // distance threshold to commit to a swipe
  const DRAG_COMMIT_VELOCITY = .5; // px/ms -- a fast flick commits even short
  const CLICK_SUPPRESS_PX = 6;     // below this, treat it as a click/tap, not a drag
  let dragging = false;
  let dragPointerId = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragX = 0;
  let dragAxisLocked = null; // 'x' | 'y' | null (undecided)
  let lastMoveX = 0;
  let lastMoveT = 0;
  let velocity = 0;

  function setDragOffset(px) {
    stack.style.setProperty('--zs-drag', px + 'px');
  }

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return; // left-click/primary touch only
    dragging = true;
    dragAxisLocked = null;
    dragPointerId = e.pointerId;
    dragStartX = lastMoveX = e.clientX;
    dragStartY = e.clientY;
    lastMoveT = e.timeStamp;
    velocity = 0;
    dragX = 0;
  }

  function onPointerMove(e) {
    if (!dragging || e.pointerId !== dragPointerId) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (dragAxisLocked === null) {
      // Wait for a real, deliberate move before committing to an axis, so a
      // near-vertical touch (a visitor trying to scroll the page over this
      // section) isn't hijacked into a horizontal drag.
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      dragAxisLocked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (dragAxisLocked === 'x') {
        stack.classList.add('dragging');
        try { stack.setPointerCapture(dragPointerId); } catch (err) { /* no-op */ }
      }
    }
    if (dragAxisLocked !== 'x') return; // vertical intent -- let the page scroll normally
    e.preventDefault();
    const dt = e.timeStamp - lastMoveT;
    if (dt > 0) velocity = (e.clientX - lastMoveX) / dt;
    lastMoveX = e.clientX;
    lastMoveT = e.timeStamp;
    dragX = dx;
    setDragOffset(dragX);
  }

  function endDrag(e) {
    if (!dragging || (e && e.pointerId !== undefined && e.pointerId !== dragPointerId)) return;
    dragging = false;
    const wasHorizontalDrag = dragAxisLocked === 'x';
    stack.classList.remove('dragging');
    if (wasHorizontalDrag && Math.abs(dragX) > CLICK_SUPPRESS_PX) dragMoved = true;
    if (wasHorizontalDrag && (Math.abs(dragX) > DRAG_COMMIT_PX || Math.abs(velocity) > DRAG_COMMIT_VELOCITY)) {
      // Dragging the card leftward (negative dx) reveals what's coming from
      // the right -- i.e. advances to "next" -- and vice versa.
      if (dragX < 0) next(); else prev();
    }
    setDragOffset(0);
    dragAxisLocked = null;
    dragPointerId = null;
  }

  stack.addEventListener('pointerdown', onPointerDown);
  stack.addEventListener('pointermove', onPointerMove);
  stack.addEventListener('pointerup', endDrag);
  stack.addEventListener('pointercancel', endDrag);
  // A pointer that leaves the stack entirely (dragged off the section) while
  // still down should resolve the same as a release, not leave the stack
  // stuck mid-drag with no way to complete the gesture.
  stack.addEventListener('pointerleave', e => { if (e.pointerId === dragPointerId) endDrag(e); });

  render();
})();
