/* Floating "Preregister Now" node -- a persistent, draggable circular CTA
   pinned bottom-right on every page (see .pin-node in style.css). Per
   Eric: closing it only lasts for the current page view -- there's no
   localStorage/persistence at all, so it simply comes back on the next
   page load or refresh, same as any other page element starting fresh.
   Dragging is likewise not persisted; a repositioned node resets to its
   default bottom-right spot on the next page load.

   Real <a data-verkada> underneath (same attribute the site's other
   Preregister buttons already use, filled in by main.js from the live
   config) -- this points at the same real preregister destination
   everywhere else on the site, not a placeholder link.

   No keyboard-drag support: dragging is a mouse/touch-only interaction
   pattern (there's no standard "reposition a floating widget" keyboard
   gesture users expect, unlike a game's WASD movement or a calendar's
   arrow-key navigation) -- what keyboard/screen-reader users need
   instead is for the node to be reachable via Tab and activatable with
   Enter/Space like any other link, and for its close button to be an
   independently focusable real <button>, both of which this markup
   already gets for free from being plain native elements. */
(function () {
  const node = document.getElementById('pin-node');
  if (!node) return;
  const btn = node.querySelector('.pin-btn');
  const closeBtn = node.querySelector('.pin-close');
  if (!btn) return;

  if (closeBtn) closeBtn.addEventListener('click', () => { node.remove(); });

  const DRAG_THRESHOLD = 6; // px of movement before a press counts as a drag, not a click
  let dragging = false, moved = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;

  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

  function pointerDown(e) {
    const r = node.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    startLeft = r.left; startTop = r.top;
    dragging = true; moved = false;
    node.classList.add('is-dragging');
    if (btn.setPointerCapture) { try { btn.setPointerCapture(e.pointerId); } catch { /* not critical */ } }
  }

  function pointerMove(e) {
    if (!dragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (!moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) moved = true;
    if (!moved) return;
    const r = node.getBoundingClientRect();
    const left = clamp(startLeft + dx, 4, window.innerWidth - r.width - 4);
    const top = clamp(startTop + dy, 4, window.innerHeight - r.height - 4);
    node.style.left = left + 'px';
    node.style.top = top + 'px';
    node.style.right = 'auto';
    node.style.bottom = 'auto';
  }

  function pointerUp() {
    dragging = false;
    node.classList.remove('is-dragging');
  }

  btn.addEventListener('pointerdown', pointerDown);
  window.addEventListener('pointermove', pointerMove);
  window.addEventListener('pointerup', pointerUp);
  window.addEventListener('pointercancel', pointerUp);

  // Suppress the click-to-navigate only when the preceding pointer
  // sequence actually moved past the drag threshold -- an ordinary tap
  // or click still activates the real Preregister link normally.
  btn.addEventListener('click', e => {
    if (moved) { e.preventDefault(); moved = false; }
  });

  // Keep a dragged position on-screen if the viewport is resized smaller
  // than wherever it was left -- only relevant once the node has actually
  // been dragged (style.left is still unset while it's sitting at its
  // default CSS bottom-right position).
  window.addEventListener('resize', () => {
    if (!node.style.left) return;
    const r = node.getBoundingClientRect();
    node.style.left = clamp(r.left, 4, window.innerWidth - r.width - 4) + 'px';
    node.style.top = clamp(r.top, 4, window.innerHeight - r.height - 4) + 'px';
  });
})();
