/* RGB cursor light trail + grid-color popover, round 4 (2026-09-16), per
   Eric's direct follow-up corrections to the first version:
   "clicking on the color should open up a mini pop up tab to the left of
   the color, and it should be changing the color of the background grid
   lines. The mouse effect should always copy what the hero color profile
   is set to... don't make it just a faint glow. Make it an actual light
   trail effect instead."

   Two independent pieces:
   1. A real light-trail cursor effect (a fixed full-viewport canvas that
      redraws each frame with a translucent fill to fade the previous
      frame, then paints a bright dot at the current pointer position --
      the classic "comet tail" technique) tinted with the hero's real live
      hue, ALWAYS -- there is no per-cursor color state anymore. It reads
      `window.GZ_HERO_HUE`, which techno-hero.js's frame() writes every
      frame from its own `cs.hue` (post any grid-color override -- see
      that file's own comment), so the trail automatically follows
      whatever the tunnel is actually rendering, profile or custom color,
      with zero duplicated color logic here.
   2. A small popover (not a full-screen modal) anchored to the left of
      `#hero-lighting-swatch`, opened by clicking it, that lets a visitor
      recolor the tunnel's own grid lines/rings via `window.GZ_HERO`'s
      setCustomHue()/getCustomHue() API (exposed by techno-hero.js) --
      this file holds no color state of its own, it's a thin UI over that
      API, so there's exactly one source of truth for "what color is this
      site rendering."

   Skipped entirely on coarse-pointer (touch) devices -- there's no real
   cursor to trail -- and under `prefers-reduced-motion` (a decorative
   motion effect gets the same opt-out every other transform/animation on
   this site already respects). The popover itself still works on those
   devices, since recoloring the grid lines is a real, useful setting
   independent of whether this browser can show the trail. */
(function () {
  // ---------------------------------------------------------------
  // 1. Light-trail cursor -- fine pointer + motion-enabled devices only
  // ---------------------------------------------------------------
  var isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!isCoarse && !reduceMotion) {
    var canvas = document.createElement('canvas');
    canvas.className = 'gz-cursor-trail';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = 0, H = 0;

    function sizeCanvas() {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);

    var mx = -999, my = -999, active = false, rafId = null;
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      mx = e.clientX; my = e.clientY;
      active = true;
    }, { passive: true });
    document.addEventListener('mouseleave', function () { active = false; });

    function tick() {
      var hue = Math.round((typeof window.GZ_HERO_HUE === 'number' && isFinite(window.GZ_HERO_HUE)) ? window.GZ_HERO_HUE : 205);
      // Fade the previous frame instead of clearing outright -- this is
      // what turns a single dot into a real trailing streak. A lower
      // alpha here means a longer-lingering tail.
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      if (active) {
        var color = 'hsl(' + hue + ',90%,60%)';
        var grad = ctx.createRadialGradient(mx, my, 0, mx, my, 14);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'hsla(' + hue + ',90%,60%,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mx, my, 14, 0, Math.PI * 2);
        ctx.fill();
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { cancelAnimationFrame(rafId); }
      else { rafId = requestAnimationFrame(tick); }
    });
  }

  // ---------------------------------------------------------------
  // 2. Grid-color popover, anchored left of the swatch
  // ---------------------------------------------------------------
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
