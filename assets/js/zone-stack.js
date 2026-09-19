/* About Gamer Zone "trading card" stack — cycles through the zone cards one
   at a time (front card + two peeking behind it, like a hand of cards),
   with prev/next buttons and dot nav for browsing manually.
   2026-09-08, per Eric ("maybe zone stack should not auto scroll at all, so
   there is no induced motion"): there is no auto-advance timer -- this
   carousel only ever moves in response to a real click/tap (prev/next, a
   dot, or a peeking card, or a drag/swipe), never on its own.
   2026-09-19, per Eric: restored to this left/right peek-card format after
   round 4's expanding-grid carousel read as too jarring a layout shift on
   click -- this file is the same logic that shipped before that rewrite
   (see git log), re-applied to the site's current 7 real zone cards. */
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
      // peeking at the left/right edge of .zone-stack, and a second,
      // further-out layer beyond that -- clipped by .zone-stack's
      // overflow:hidden, all real zone cards from the same rotation
      // rather than decorative filler, so the section reads as using its
      // full width instead of just its wrapper technically being 100%
      // wide. Anything beyond that second layer stays fully hidden.
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

  // Pointer-based drag/swipe -- single pointer-event set (works for touch,
  // mouse, and pen alike) rather than separate touch/mouse listeners. The
  // stack's own width is the drag "unit" -- a card only has to travel a
  // modest fraction of the section before it commits to advancing,
  // matching how the peek cards already sit fairly close to the center
  // card.
  const DRAG_COMMIT_PX = 70;      // distance threshold to commit to a swipe
  const DRAG_COMMIT_VELOCITY = .5; // px/ms -- a fast flick commits even short
  const CLICK_SUPPRESS_PX = 6;     // below this, treat it as a click/tap, not a drag
  let dragging = false;
  let dragPointerId = null;
  // Set the instant a gesture commits mid-drag (see the threshold check in
  // onPointerMove below) and only cleared by a real pointerup/pointercancel/
  // pointerleave for that same pointer -- distinguishes "this physical hold
  // already committed and should stay inert for the rest of it" from "a
  // phantom pointercancel fired and this hold should self-heal" below, both
  // of which otherwise look identical (dragging===false, button still down).
  let committedPointerId = null;
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

  // Ends the current drag gesture outright and releases the pointer, so
  // nothing further (including any pointerup/pointercancel that arrives
  // afterward for the same pointerId) can act on it a second time.
  function stopDragState() {
    dragging = false;
    stack.classList.remove('dragging');
    dragAxisLocked = null;
    if (dragPointerId !== null) {
      try { stack.releasePointerCapture(dragPointerId); } catch (err) { /* no-op */ }
    }
    dragPointerId = null;
  }

  function onPointerMove(e) {
    if (!dragging || e.pointerId !== dragPointerId) {
      // 2026-09-19: self-heal from a phantom pointercancel -- confirmed live
      // (via the same instrumentation used to diagnose the marquee's own
      // identical symptom, see main.js's enableMarqueeDrag) that Chromium
      // can fire a real pointercancel on this element mid-gesture with the
      // mouse button still physically held the whole time, no touch-action
      // conflict involved. Without this, that phantom cancel would end
      // dragging=false for good and silently drop the rest of the physical
      // gesture -- if a pointermove for the SAME primary-button-down pointer
      // still arrives afterward, that's proof the gesture never actually
      // ended, so re-open dragging for it here instead of ignoring it.
      if (dragging || e.pointerId === undefined || e.buttons === undefined || (e.buttons & 1) === 0) return;
      if (e.pointerId === committedPointerId) return; // this hold already committed -- stay inert until release
      dragging = true;
      dragPointerId = e.pointerId;
      dragAxisLocked = null;
      dragStartX = lastMoveX = e.clientX;
      dragStartY = e.clientY;
      lastMoveT = e.timeStamp;
      velocity = 0;
      dragX = 0;
      return;
    }
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
    // Clamped to the stack's own real measured width -- read fresh on
    // every move rather than cached once, so a resize mid-drag (a rotated
    // phone, say) can't leave a stale, wrong ceiling in place -- a fast or
    // long real-world drag should never push the center card visibly past
    // .zone-stack's own bounds before the pointer is released.
    const maxDrag = stack.getBoundingClientRect().width;
    dragX = Math.max(-maxDrag, Math.min(maxDrag, dx));
    setDragOffset(dragX);

    // 2026-09-19, per Eric ("it should auto next and stop my drag, I can
    // currently drag it infinitely one direction or another"): committing
    // to the next/prev card used to only ever happen at release (see
    // endDrag below), so the gesture itself could be dragged arbitrarily
    // far -- all the way out to the stack's own full width -- with nothing
    // visibly happening until the pointer finally lifted. Real swipe
    // gestures elsewhere on this site (and on any native carousel) commit
    // the moment the drag crosses its threshold, not at some later release
    // event -- so the instant |dragX| reaches DRAG_COMMIT_PX, advance right
    // here and end the gesture outright (stopDragState()), rather than
    // continuing to track this pointer any further. A real flick that's
    // fast but short (under DRAG_COMMIT_PX) still commits via velocity at
    // release, in endDrag below -- that case is untouched.
    if (Math.abs(dragX) >= DRAG_COMMIT_PX) {
      dragMoved = true;
      const dir = dragX < 0 ? 1 : -1; // matches endDrag's own dragX<0 -> next() convention
      committedPointerId = dragPointerId; // block self-heal from re-opening this same physical hold
      stopDragState();
      setDragOffset(0);
      if (dir === 1) next(); else prev();
    }
  }

  function endDrag(e) {
    // Always clear committedPointerId on a real release/cancel for this
    // pointer, even though `dragging` is already false after a mid-gesture
    // commit above -- this is the only signal that the physical hold is
    // actually over, so self-heal is safe to allow again for whatever
    // pointer touches next.
    if (e && e.pointerId !== undefined && e.pointerId === committedPointerId) committedPointerId = null;
    if (!dragging || (e && e.pointerId !== undefined && e.pointerId !== dragPointerId)) return;
    const wasHorizontalDrag = dragAxisLocked === 'x';
    if (wasHorizontalDrag && Math.abs(dragX) > CLICK_SUPPRESS_PX) dragMoved = true;
    // Reaching here at all means the pixel threshold above was never hit
    // during this gesture (onPointerMove already committed and called
    // stopDragState() otherwise) -- so this only ever needs to check the
    // velocity-based fast-flick case now, not distance again.
    if (wasHorizontalDrag && Math.abs(velocity) > DRAG_COMMIT_VELOCITY) {
      // Dragging the card leftward (negative dx) reveals what's coming from
      // the right -- i.e. advances to "next" -- and vice versa.
      if (dragX < 0) next(); else prev();
    }
    stopDragState();
    setDragOffset(0);
  }

  stack.addEventListener('pointerdown', onPointerDown);
  stack.addEventListener('pointermove', onPointerMove);
  stack.addEventListener('pointerup', endDrag);
  stack.addEventListener('pointercancel', endDrag);
  // 2026-09-19: this used to end the drag the instant the pointer physically
  // left `stack`'s own bounds -- found to be the real cause behind Eric's
  // "I can drag it infinitely" report reading as "nothing happens" in
  // testing: once axis-lock picks 'x', onPointerMove calls
  // stack.setPointerCapture(), which guarantees pointermove/pointerup/
  // pointercancel keep targeting `stack` no matter where on screen the
  // pointer travels -- but pointerleave/pointerenter fire off the pointer's
  // REAL screen position regardless of capture (confirmed live in Chromium;
  // MDN's own capture docs note boundary events are unaffected by capture).
  // A horizontal drag across this section routinely dips outside its own
  // vertical bounds for a frame, which silently fired this handler and
  // called endDrag() before the commit threshold in onPointerMove ever had
  // a chance to fire -- ending the gesture with dragging=false so every
  // further pointermove was ignored, which is exactly the "drag does
  // nothing" behavior seen in testing. Only fall back to treating
  // pointerleave as a release when capture was never actually obtained for
  // this pointer (e.g. before the axis lock above, or on a pointer type
  // that doesn't support capture) -- once real capture is active,
  // pointerup/pointercancel are the only signals that should end it.
  stack.addEventListener('pointerleave', e => {
    if (e.pointerId !== dragPointerId) return;
    if (stack.hasPointerCapture && stack.hasPointerCapture(e.pointerId)) return;
    endDrag(e);
  });

  render();
})();
