/* Grid-color popover, round 5 (2026-09-17). Per Eric's direct request
   this round ("have my mouse be able to do a ripple or water effect on
   the shapes in the background... water ripple on the shapes" --
   confirmed via AskUserQuestion over an ASCII-trail alternative), the
   light-trail cursor effect this file used to own (built round 4,
   2026-09-16) has been removed entirely, superseding its own header
   comment below the line. It also directly resolves a real reported bug
   ("current mouse trail effect leaves behind permanent circles") by
   removing the effect it was happening in rather than patching it --
   see techno-hero.js's own new header comment for the replacement
   water-ripple effect, which now lives there (it displaces the hero
   tunnel's own ring geometry directly, so it has to be built where that
   geometry is, not in a separate overlay canvas).

   What's left here is exactly the second of that old file's two pieces:
   a small popover (not a full-screen modal) anchored to the left of
   `#hero-lighting-swatch`, opened by clicking it, that lets a visitor
   recolor the tunnel's own grid lines/rings via `window.GZ_HERO`'s
   setCustomHue()/getCustomHue() API (exposed by techno-hero.js) -- this
   file holds no color state of its own, it's a thin UI over that API, so
   there's exactly one source of truth for "what color is this site
   rendering." Unchanged from round 4 other than this file no longer
   needing its own coarse-pointer/reduced-motion gate up front (that gate
   only ever applied to the now-removed trail canvas -- the popover always
   worked on every device, since recoloring the grid lines is a real,
   useful setting independent of whether a device has a hoverable cursor). */
(function () {
  var swatch = document.getElementById('hero-lighting-swatch');
  var popover = document.getElementById('cursor-modal');
  if (!swatch || !popover) return;

  var wheel = document.getElementById('gz-color-wheel');
  var knob = document.getElementById('gz-wheel-knob');
  var range = document.getElementById('gz-hue-range');
  var resetBtn = document.getElementById('gz-hue-reset');
  var closeBtn = document.getElementById('cursor-modal-close');
  var WHEEL_R = 64;

  function hero() { return window.GZ_HERO || {}; }
  function currentHue() {
    var custom = hero().getCustomHue ? hero().getCustomHue() : null;
    if (custom !== null) return custom;
    var live = window.GZ_HERO_HUE;
    return (typeof live === 'number' && isFinite(live)) ? live : 205;
  }

  function setKnobFromHue(hue) {
    var rad = hue * Math.PI / 180;
    knob.style.setProperty('--kx', (WHEEL_R * Math.sin(rad)) + 'px');
    knob.style.setProperty('--ky', (-WHEEL_R * Math.cos(rad)) + 'px');
  }

  function applyHue(hue) {
    var h = Math.round(((hue % 360) + 360) % 360);
    range.value = h;
    setKnobFromHue(h);
    if (hero().setCustomHue) hero().setCustomHue(h);
  }

  function positionPopover() {
    var r = swatch.getBoundingClientRect();
    var pw = popover.offsetWidth || 260;
    var gap = 12;
    var left = r.left - pw - gap;
    var top = r.top + r.height / 2 - popover.offsetHeight / 2;
    // If there's no room to the left (narrow viewport), fall back to
    // right-aligned-under the swatch instead of running off-screen --
    // real math against the actual popover size, not a guessed breakpoint.
    if (left < 8) {
      left = Math.max(8, Math.min(window.innerWidth - pw - 8, r.right - pw));
      top = r.bottom + gap;
    }
    top = Math.max(8, Math.min(window.innerHeight - (popover.offsetHeight || 260) - 8, top));
    popover.style.left = left + 'px';
    popover.style.top = top + 'px';
  }

  function openPopover() {
    popover.classList.add('open');
    var h = currentHue();
    range.value = h;
    setKnobFromHue(h);
    positionPopover();
  }
  function closePopover() { popover.classList.remove('open'); }

  swatch.addEventListener('click', function () {
    if (popover.classList.contains('open')) { closePopover(); } else { openPopover(); }
  });
  closeBtn.addEventListener('click', closePopover);
  document.addEventListener('click', function (e) {
    if (!popover.classList.contains('open')) return;
    if (popover.contains(e.target) || e.target === swatch) return;
    closePopover();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && popover.classList.contains('open')) { closePopover(); swatch.focus(); }
  });
  window.addEventListener('resize', function () { if (popover.classList.contains('open')) positionPopover(); });

  range.addEventListener('input', function () { applyHue(Number(range.value)); });

  resetBtn.addEventListener('click', function () {
    if (hero().setCustomHue) hero().setCustomHue(null);
    var h = currentHue();
    range.value = h;
    setKnobFromHue(h);
  });

  // Real conic-gradient angle math: conic-gradient(from 0deg, ...) starts
  // straight up and proceeds clockwise, and this wheel's exact stops
  // (red/yellow/lime/cyan/blue/magenta at 0/60/120/180/240/300deg) line up
  // 1:1 with HSL hue at those same values -- so "angle clockwise from top"
  // IS the hue, no separate conversion table needed.
  function hueFromPointer(clientX, clientY) {
    var rect = wheel.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var dx = clientX - cx, dy = clientY - cy;
    var deg = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    return ((deg % 360) + 360) % 360;
  }

  var dragging = false;
  wheel.addEventListener('pointerdown', function (e) {
    dragging = true;
    try { wheel.setPointerCapture(e.pointerId); } catch (err) {}
    applyHue(hueFromPointer(e.clientX, e.clientY));
  });
  wheel.addEventListener('pointermove', function (e) { if (dragging) applyHue(hueFromPointer(e.clientX, e.clientY)); });
  wheel.addEventListener('pointerup', function () { dragging = false; });
  wheel.addEventListener('pointercancel', function () { dragging = false; });

  setKnobFromHue(range ? Number(range.value) : 205);
})();
