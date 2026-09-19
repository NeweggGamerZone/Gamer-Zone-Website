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
   useful setting independent of whether a device has a hoverable cursor).

   2026-09-18, per Eric ("not have a hue slider or a match lighting
   profile button, just have it so I can direct click various values on
   the wheel"): the separate <input type="range"> and its "Match lighting
   profile" reset button are gone -- direct click/drag on the wheel
   (already the primary interaction, see hueFromPointer() below) is now
   the only way to set a color. Since removing the range input would also
   remove the one keyboard-operable path this control had (core rule 8),
   the wheel itself picked up that job instead: it's now a real
   role="slider" element (tabindex, aria-value*) and Left/Right/Down/Up
   arrow keys step its hue by 5deg, Home/End jump to 0/359 -- the same
   "one control, not two" simplification, just moved onto the wheel. */
(function () {
  var swatch = document.getElementById('hero-lighting-swatch');
  var popover = document.getElementById('cursor-modal');
  if (!swatch || !popover) return;

  var wheel = document.getElementById('gz-color-wheel');
  var knob = document.getElementById('gz-wheel-knob');
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
    setKnobFromHue(h);
    wheel.setAttribute('aria-valuenow', String(h));
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

  // Syncs the wheel's knob position/aria-valuenow to a hue WITHOUT pushing
  // it to the tunnel -- used on open/init so just looking at the popover
  // never itself changes the current color, only an actual click/drag/
  // key on the wheel does.
  function syncKnob(hue) {
    var h = Math.round(((hue % 360) + 360) % 360);
    setKnobFromHue(h);
    wheel.setAttribute('aria-valuenow', String(h));
  }

  // 2026-09-19, design/QA audit fix: real focus management (see
  // GZ.dialogFocus in main.js) -- this popover had role="dialog" but
  // opening it never moved focus in, Tab could still reach the page
  // behind it, and closing it never returned focus to the swatch.
  // GZ (from main.js) is a top-level `const`, which -- unlike `var` or a
  // plain assignment -- never becomes a `window.GZ` property; it's only
  // reachable as the bare identifier `GZ`, the same way this file's own
  // hero()/currentHue() already reach `window.GZ_HERO` (a real, deliberate
  // window export from techno-hero.js, a different case). Checking
  // `window.GZ` here silently found nothing and skipped focus management
  // entirely -- caught via a live focus check (Tab never actually reached
  // the popover), not assumed from the code alone.
  const focusMgr = typeof GZ !== 'undefined' ? GZ.dialogFocus(popover) : null;
  function openPopover() {
    popover.classList.add('open');
    syncKnob(currentHue());
    positionPopover();
    if (focusMgr) focusMgr.open();
  }
  function closePopover() { popover.classList.remove('open'); if (focusMgr) focusMgr.close(); }

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

  // Keyboard operability (core rule 8) now lives on the wheel itself
  // since the separate range-input slider is gone: Left/Down step the
  // hue back 5deg, Right/Up step it forward 5deg, Home/End jump to the
  // wheel's 0/359 extremes -- standard role="slider" key bindings.
  wheel.addEventListener('keydown', function (e) {
    var h = currentHue();
    var step = 5;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') h += step;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') h -= step;
    else if (e.key === 'Home') h = 0;
    else if (e.key === 'End') h = 359;
    else return;
    e.preventDefault();
    applyHue(h);
  });

  syncKnob(currentHue());
})();
