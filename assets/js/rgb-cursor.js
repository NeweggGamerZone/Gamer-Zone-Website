/* RGB cursor glow + color-wheel picker, 2026-09-16, per Eric's direct
   request: "Lets do a mouse that copies the hero's own rgb hue. Let users
   who click on the rgb color be able to change it to various colors in a
   simplistic color wheel, and it's cached accordingly."

   Two independent pieces:
   1. A small glow dot that trails the real cursor, tinted to mirror the
      hero tunnel's live hue by default. techno-hero.js writes the current
      frame's real hue to `window.GZ_HERO_HUE` every frame (see that
      file's own comment on the `frame()` function) -- this reads that
      same value rather than deriving a second, independently-guessed
      color, per the project's "one shared implementation" discipline.
   2. A "simplistic color wheel" popover (reusing the site's one existing
      .modal-bg/.modal component, see style.css) that opens when the
      visitor clicks #hero-lighting-swatch -- the only visible "rgb color"
      indicator already on the page -- letting them override the cursor's
      color. The choice is cached in localStorage the same way every other
      RGB preference on this site already is (see techno-hero.js's
      RGB_KEY/loadProfile/saveProfile pattern).

   Skipped entirely on coarse-pointer (touch) devices -- there's no real
   cursor to mirror -- and the glow trail itself is skipped under
   prefers-reduced-motion (a pure decorative motion effect with no
   functional payload gets the same opt-out every other transform-driven
   effect on this site already respects). The color-wheel *preference*
   still works on those devices/settings, since it's a real, useful
   setting a visitor might set now and see later on a different device --
   only the glow's live on-screen trail is gated by pointer/motion. */
(function () {
  var HUE_KEY = 'gzCursorHue'; // localStorage value: 'auto' or a '0'-'359' string

  function loadHue() {
    try {
      var v = localStorage.getItem(HUE_KEY);
      if (v === null || v === 'auto') return 'auto';
      var n = Number(v);
      return (Number.isFinite(n) && n >= 0 && n < 360) ? n : 'auto';
    } catch (e) { return 'auto'; }
  }
  function saveHue(v) {
    try { localStorage.setItem(HUE_KEY, String(v)); } catch (e) { /* private mode etc — silently no-op, same as techno-hero.js's saveProfile */ }
  }

  var userHue = loadHue(); // 'auto' or a number 0-359

  function liveHue() {
    if (userHue !== 'auto') return userHue;
    var h = window.GZ_HERO_HUE;
    return (typeof h === 'number' && isFinite(h)) ? h : 205;
  }

  // ---------------------------------------------------------------
  // 1. Cursor glow trail — fine pointer + motion-enabled devices only
  // ---------------------------------------------------------------
  var isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!isCoarse && !reduceMotion) {
    var glow = document.createElement('div');
    glow.className = 'gz-cursor-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);

    var gx = -100, gy = -100, rafId = null;

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      gx = e.clientX; gy = e.clientY;
      glow.classList.add('is-active');
    }, { passive: true });
    document.addEventListener('mouseleave', function () { glow.classList.remove('is-active'); });

    function tick() {
      var hue = Math.round(liveHue());
      var color = 'hsl(' + hue + ',85%,55%)';
      glow.style.background = color;
      glow.style.color = color;
      glow.style.transform = 'translate3d(' + (gx - 8) + 'px,' + (gy - 8) + 'px,0)';
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { cancelAnimationFrame(rafId); }
      else { rafId = requestAnimationFrame(tick); }
    });
  }

  // ---------------------------------------------------------------
  // 2. Color-wheel popover — works regardless of pointer/motion, since
  //    it's a real preference a visitor can set for later, not just a
  //    live effect they're watching right now.
  // ---------------------------------------------------------------
  var swatch = document.getElementById('hero-lighting-swatch');
  var modal = document.getElementById('cursor-modal');
  if (!swatch || !modal) return;

  var wheel = document.getElementById('gz-color-wheel');
  var knob = document.getElementById('gz-wheel-knob');
  var range = document.getElementById('gz-hue-range');
  var resetBtn = document.getElementById('gz-hue-reset');
  var closeBtn = document.getElementById('cursor-modal-close');
  var WHEEL_R = 64; // knob placement radius (px) — the wheel's own color is angle-only, this is just where the knob sits

  function setKnobFromHue(hue) {
    var rad = hue * Math.PI / 180;
    var kx = WHEEL_R * Math.sin(rad);
    var ky = -WHEEL_R * Math.cos(rad);
    knob.style.setProperty('--kx', kx + 'px');
    knob.style.setProperty('--ky', ky + 'px');
  }

  function applyHue(hue, persist) {
    userHue = Math.round(((hue % 360) + 360) % 360);
    range.value = userHue;
    setKnobFromHue(userHue);
    if (persist) saveHue(userHue);
  }

  function openModal() {
    modal.classList.add('open');
    var h = Math.round(liveHue());
    range.value = h;
    setKnobFromHue(h);
  }
  function closeModal() { modal.classList.remove('open'); }

  swatch.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  range.addEventListener('input', function () {
    applyHue(Number(range.value), true);
  });

  resetBtn.addEventListener('click', function () {
    userHue = 'auto';
    saveHue('auto');
    var h = Math.round(liveHue());
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
    var deg = Math.atan2(dy, dx) * 180 / Math.PI + 90; // atan2 is 0=right/clockwise-positive in screen coords; +90 rotates the reference to "0=top", matching the gradient's own `from 0deg`
    return ((deg % 360) + 360) % 360;
  }

  var dragging = false;
  wheel.addEventListener('pointerdown', function (e) {
    dragging = true;
    try { wheel.setPointerCapture(e.pointerId); } catch (err) {}
    applyHue(hueFromPointer(e.clientX, e.clientY), true);
  });
  wheel.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    applyHue(hueFromPointer(e.clientX, e.clientY), true);
  });
  wheel.addEventListener('pointerup', function () { dragging = false; });
  wheel.addEventListener('pointercancel', function () { dragging = false; });

  setKnobFromHue(range ? Number(range.value) : 205);
})();
