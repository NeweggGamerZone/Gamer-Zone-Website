/* Homepage-only fixed background: a perspective tunnel — the camera flies
   forever toward a vanishing point while a series of ring outlines travel
   from far away toward the viewer, same as the site's original grid-tunnel
   look. The ring shape itself smoothly morphs through a fixed sequence
   (square -> triangle -> star -> pentagon -> hexagon -> circle) — holding
   each shape for a beat, then blending into the next one over a couple of
   seconds, rather than ever cutting instantly from one shape to another.
   Every ring, regardless of depth, runs the exact same hold/morph cycle in
   lockstep (no per-ring offset) — the whole tunnel resolves as one shape
   at any given moment and the entire tunnel transitions to the next shape
   together, a single seamless line-transition rather than a staggered
   ripple.

   2026-09-03: the old "Hero Runner" playable mini-game (a character
   dodging hazards around the tunnel's own morphing ground shape) was
   removed entirely, per Eric — it had become a bigger source of brand
   dissonance than a distraction it was worth (see the scenes-not-specs
   audit's F-02; resolved by elimination, not by making the game more
   discoverable). This file is now purely the decorative tunnel, plus one
   new thing: a selectable RGB-lighting-style color profile (Cycle/
   Static/Breathe/Flame/Wave) driving the tunnel's hue, wired to the
   #hero-lighting-select control in index.html and persisted via
   localStorage — see RGB_KEY/loadProfile/saveProfile and colorState()
   below. Pure canvas math throughout, no images. */
(function () {
  const canvas = document.getElementById('techno-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W, H, DPR, cx, cy;
  const F = 300;
  const Z_NEAR = 60, Z_FAR = 1500;
  const BASE_SPEED = 92; // same travel pace the site's tunnel/cube previously settled on
  const ROT_SPEED = 0;

  // Fixed progression every ring works through, one step at a time.
  const SHAPES = ['square', 'triangle', 'star', 'pentagon', 'hexagon', 'circle'];
  const HOLD_DUR = 2.6, MORPH_DUR = 1.8, CYCLE = HOLD_DUR + MORPH_DUR;
  // Every ring reads morphStateAt(elapsed) directly (no per-ring time
  // offset) so all rings hold/morph in perfect unison — one synchronized
  // shape-change across the whole tunnel instead of a depth-staggered wave.

  let A; // ring radius, sized to the viewport
  let rings = [];
  const RING_COUNT = 9;
  const SPOKE_COUNT = 10;
  const SPOKES = Array.from({ length: SPOKE_COUNT }, (_, i) => (Math.PI * 2 / SPOKE_COUNT) * i - Math.PI / 2);

  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx = W / 2; cy = H / 2;
    A = Math.max(W, H) * 0.72;
    buildRings();
  }

  function buildRings() {
    rings = [];
    for (let i = 0; i < RING_COUNT; i++) {
      rings.push({ z: Z_NEAR + (i / RING_COUNT) * (Z_FAR - Z_NEAR) });
    }
  }

  function project(x, y, z, rot) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const rx = x * c - y * s, ry = x * s + y * c;
    const sc = F / z;
    return { x: cx + rx * sc, y: cy + ry * sc };
  }

  function fadeFor(z) {
    const nearFade = Math.min(1, (z - Z_NEAR) / 320);
    const farFade = Math.min(1, (Z_FAR - z) / 820);
    return Math.max(0, Math.min(1, nearFade * farFade));
  }

  // Local (unrotated, unprojected) corner points for a shape at radius 1 —
  // the raw vertices, before perimeter-resampling below.
  function shapeVertices(type) {
    if (type === 'circle') {
      const n = 48, pts = [];
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 / n) * i - Math.PI / 2;
        pts.push([Math.cos(a), Math.sin(a)]);
      }
      return pts;
    }
    if (type === 'star') {
      const spikes = 5, outer = 1, inner = 0.45, pts = [];
      for (let i = 0; i < spikes * 2; i++) {
        const rad = i % 2 === 0 ? outer : inner;
        const a = (Math.PI / spikes) * i - Math.PI / 2;
        pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
      }
      return pts;
    }
    const sides = { square: 4, triangle: 3, pentagon: 5, hexagon: 6 }[type] || 4;
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const a = (Math.PI * 2 / sides) * i - Math.PI / 2;
      pts.push([Math.cos(a), Math.sin(a)]);
    }
    return pts;
  }

  // Resample a closed polygon into N points evenly spaced by arc length,
  // starting at its first vertex — so any two shapes end up with the same
  // point count, aligned to the same "start near the top" convention, and
  // can be smoothly interpolated point-for-point without ever needing
  // matching vertex counts between e.g. a triangle and a star.
  const MORPH_N = 56;
  function resamplePerimeter(verts, n) {
    const segs = []; let total = 0;
    for (let i = 0; i < verts.length; i++) {
      const a = verts[i], b = verts[(i + 1) % verts.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      segs.push({ a, b, len, start: total });
      total += len;
    }
    const out = [];
    for (let i = 0; i < n; i++) {
      const d = (i / n) * total;
      let seg = segs[segs.length - 1];
      for (let s = 0; s < segs.length; s++) {
        if (d >= segs[s].start && d < segs[s].start + segs[s].len) { seg = segs[s]; break; }
      }
      const t = seg.len > 0 ? (d - seg.start) / seg.len : 0;
      out.push([seg.a[0] + (seg.b[0] - seg.a[0]) * t, seg.a[1] + (seg.b[1] - seg.a[1]) * t]);
    }
    return out;
  }

  // Every shape pre-resampled once at startup — cheap to blend at runtime.
  const RESAMPLED = {};
  SHAPES.forEach(t => { RESAMPLED[t] = resamplePerimeter(shapeVertices(t), MORPH_N); });

  // ------------------------------------------------------------------
  // RGB-lighting profile system. Five profiles, matching the vocabulary
  // of a classic RGB peripheral app (Corsair iCUE, Razer Synapse, etc):
  // Color Cycle (the site's original slow hue drift, kept as default),
  // Static (a fixed brand blue, no motion in the hue itself), Breathe (a
  // single warm hue whose intensity pulses like a slow inhale/exhale),
  // Flame (warm reds/oranges/yellows with an organic flicker), and Wave
  // (a hue gradient that visibly travels down the tunnel, ring to ring).
  // Selection persists across visits via localStorage; if unset or
  // invalid, falls back to Cycle. Reduced-motion users get a single
  // static frame regardless of profile (see drawStatic below) — the
  // profile only affects the animated tunnel, never overrides that rule.
  // ------------------------------------------------------------------
  const RGB_KEY = 'gzHeroLighting';
  const PROFILES = ['cycle', 'static', 'breathe', 'flame', 'wave'];
  function loadProfile() {
    try {
      const v = localStorage.getItem(RGB_KEY);
      return PROFILES.includes(v) ? v : 'cycle';
    } catch { return 'cycle'; }
  }
  function saveProfile(v) {
    try { localStorage.setItem(RGB_KEY, v); } catch { /* private mode etc -- fine to skip */ }
  }
  let profile = loadProfile();

  const lightingSelect = document.getElementById('hero-lighting-select');
  if (lightingSelect) {
    lightingSelect.value = profile;
    lightingSelect.addEventListener('change', () => {
      profile = PROFILES.includes(lightingSelect.value) ? lightingSelect.value : 'cycle';
      saveProfile(profile);
    });
  }

  // Returns the color state for this frame: a base hue (used for the
  // radiating spokes), a per-ring hue function (so profiles like Wave can
  // vary hue by depth), and a brightness multiplier (breatheMul) applied
  // on top of the existing fade-in — Breathe and Flame both modulate this
  // instead of needing a second, separate alpha pipeline.
  function colorState(elapsed) {
    switch (profile) {
      case 'static':
        return { hue: 205, breatheMul: 1, ringHue: () => 205 };
      case 'breathe': {
        const mul = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(elapsed * 1.1));
        return { hue: 28, breatheMul: mul, ringHue: () => 28 };
      }
      case 'flame': {
        const flicker = 0.72 + 0.28 * Math.sin(elapsed * 9 + Math.sin(elapsed * 3.7) * 2.2);
        const h = 18 + Math.sin(elapsed * 2.3) * 14 + Math.sin(elapsed * 5.1) * 6; // wanders across red-orange-yellow
        return { hue: h, breatheMul: flicker, ringHue: i => h + i * 2 };
      }
      case 'wave':
        return { hue: (200 + elapsed * 6) % 360, breatheMul: 1, ringHue: i => (200 + i * 26 + elapsed * 40) % 360 };
      case 'cycle':
      default:
        return { hue: (200 + elapsed * 6) % 360, breatheMul: 1, ringHue: i => (200 + elapsed * 6 + i * 12) % 360 };
    }
  }

  // Radiating spokes from the vanishing point out to the frame edge —
  // same gradient treatment as the site's original rail lines, but at
  // fixed angles around a circle instead of the 4 walls of a square, so
  // they still read as "flying through a tunnel" no matter which shape
  // the rings themselves currently are.
  //
  // Every spoke in a given frame shares the exact same hue/globalFade, and
  // project() is just a rotation-by-angle around the vanishing point plus a
  // uniform z-scale — so all 10 spokes are geometrically identical up to
  // rotation. That means one gradient (defined once in local, unrotated
  // space) can be reused for every spoke via ctx.rotate(), instead of the
  // previous approach of calling ctx.createLinearGradient() fresh for each
  // of the 10 spokes on every single animation frame (a real GC-pressure/
  // jank source at 60fps). This draws identically to before, just cheaper.
  function strokeSpokes(rot, globalFade, hue) {
    const rFar = A * F / Z_FAR, rNear = A * F / Z_NEAR;
    const grad = ctx.createLinearGradient(rFar, 0, rNear, 0);
    grad.addColorStop(0, `hsla(${hue}, 70%, 55%, 0)`);
    grad.addColorStop(0.35, `hsla(${hue}, 70%, 55%, ${0.26 * globalFade})`);
    grad.addColorStop(1, `hsla(${hue + 30}, 85%, 65%, ${0.5 * globalFade})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    for (const angle of SPOKES) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle + rot);
      ctx.beginPath();
      ctx.moveTo(rFar, 0);
      ctx.lineTo(rNear, 0);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawRing(ring, unitPts, rot, globalFade, hue) {
    const f = fadeFor(ring.z) * globalFade;
    if (f <= 0.01) return;
    ctx.strokeStyle = `hsla(${hue}, 72%, 62%, ${0.36 * f})`;
    ctx.lineWidth = 1.3;
    const n = unitPts.length;
    const pts = new Array(n);
    for (let i = 0; i < n; i++) {
      pts[i] = project(unitPts[i][0] * A, unitPts[i][1] * A, ring.z, rot);
    }
    // Smooth closed path through every point via a quadratic curve between
    // each successive pair of edge midpoints (using the original point as
    // the curve's control point) — this rounds every corner, including a
    // triangle's or star's sharp vertices, into continuous curvature
    // instead of a hard-angled line, so the outline itself reads as one
    // seamless line no matter which shape it currently is.
    ctx.beginPath();
    let mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    ctx.moveTo(mid.x, mid.y);
    for (let i = 1; i <= n; i++) {
      const cur = pts[i % n];
      const next = pts[(i + 1) % n];
      const nextMid = { x: (cur.x + next.x) / 2, y: (cur.y + next.y) / 2 };
      ctx.quadraticCurveTo(cur.x, cur.y, nextMid.x, nextMid.y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  // Where a ring at time t sits in the hold/morph cycle: which shape it's
  // currently based on, and how far blended toward the next one (0 = pure
  // current shape, 1 = fully arrived at the next shape).
  function morphStateAt(t) {
    if (t < 0) t = 0;
    const cycles = Math.floor(t / CYCLE);
    const local = t - cycles * CYCLE;
    const idx = cycles % SHAPES.length;
    if (local < HOLD_DUR) return { idx, blend: 0 };
    return { idx, blend: easeInOutCubic((local - HOLD_DUR) / MORPH_DUR) };
  }

  function morphedPoints(state) {
    const from = RESAMPLED[SHAPES[state.idx]];
    if (state.blend <= 0) return from;
    const to = RESAMPLED[SHAPES[(state.idx + 1) % SHAPES.length]];
    const out = new Array(MORPH_N);
    for (let i = 0; i < MORPH_N; i++) {
      out[i] = [
        from[i][0] + (to[i][0] - from[i][0]) * state.blend,
        from[i][1] + (to[i][1] - from[i][1]) * state.blend,
      ];
    }
    return out;
  }

  let raf, last = 0, elapsed = 0;

  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts; elapsed += dt;
    const rot = elapsed * ROT_SPEED;
    const cs = colorState(elapsed);
    const globalFade = Math.min(1, elapsed / 3.2) * 0.85 * cs.breatheMul;

    const pts = morphedPoints(morphStateAt(elapsed));

    ctx.clearRect(0, 0, W, H);
    strokeSpokes(rot, globalFade, cs.hue);
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      r.z -= BASE_SPEED * dt;
      if (r.z < Z_NEAR) r.z += (Z_FAR - Z_NEAR);
      drawRing(r, pts, rot, globalFade, cs.ringHue(i));
    }

    raf = requestAnimationFrame(frame);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    strokeSpokes(0, 0.6, 200);
    rings.forEach((r, i) => drawRing(r, RESAMPLED[SHAPES[0]], 0, 0.6, (200 + i * 12) % 360));
  }

  window.addEventListener('resize', size);
  size();

  if (reduceMotion) {
    drawStatic();
  } else {
    raf = requestAnimationFrame(frame);
    // Pause the rAF loop entirely while the tab/window isn't visible — no
    // point burning CPU/battery animating a canvas nobody can see, and this
    // is a much bigger win than any single in-frame optimization since it
    // drops CPU use to ~zero on a backgrounded tab. Resetting `last` to 0 on
    // resume avoids a huge one-off `dt` (and the resulting jump in rotation/
    // fade/ring position) built up from however long the tab was hidden.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
      } else if (!raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    });
  }
})();
