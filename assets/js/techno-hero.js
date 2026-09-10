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
   Static/Breathe/Flame/Wave/Meteor/City Lights/Pulse/Rapid Pulse/
   Multi-Pulse) driving the tunnel's hue, wired to the
   #hero-lighting-select control in index.html and persisted via
   localStorage — see RGB_KEY/loadProfile/saveProfile and colorState()
   below. Pure canvas math throughout, no images. */
(function () {
  const canvas = document.getElementById('techno-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Hero/Weekly-Lineup boundary canvas (2026-09-10, per Eric) -- a second,
  // much smaller canvas drawn in the same frame()/elapsed clock as the
  // tunnel above, so its shape is always in lockstep with the ring shape
  // currently on screen. Optional: index.html's own markup, not every
  // page that includes this script has it (board-mode captures etc.), so
  // this stays null-safe throughout.
  const boundaryCanvas = document.getElementById('hero-boundary-canvas');
  const bctx = boundaryCanvas ? boundaryCanvas.getContext('2d') : null;
  let BW, BH, BDPR;

  let W, H, DPR, cx, cy;
  const F = 300;
  const Z_NEAR = 60, Z_FAR = 1500;
  const BASE_SPEED = 92; // same travel pace the site's tunnel/cube previously settled on
  const ROT_SPEED = 0;

  // Fixed progression every ring works through, one step at a time.
  // 'egg' added 2026-09-03 (per Eric, referencing a CSS egg-shape example)
  // -- since this project's shapes are canvas-drawn vertex arrays, not CSS
  // border-radius boxes, the egg is reproduced as a continuous asymmetric
  // ovoid (see shapeVertices('egg') below) rather than ported literally.
  const SHAPES = ['square', 'triangle', 'star', 'pentagon', 'hexagon', 'egg', 'circle'];
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
    sizeBoundary();
  }

  function sizeBoundary() {
    if (!boundaryCanvas || !bctx) return;
    BDPR = Math.min(window.devicePixelRatio || 1, 2);
    BW = boundaryCanvas.clientWidth; BH = boundaryCanvas.clientHeight;
    if (BW <= 0 || BH <= 0) return; // e.g. board-mode hides the hero entirely
    boundaryCanvas.width = BW * BDPR; boundaryCanvas.height = BH * BDPR;
    bctx.setTransform(BDPR, 0, 0, BDPR, 0, 0);
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
    if (type === 'egg') {
      // A smooth, continuous ovoid -- narrower "small end" at the top,
      // rounder "large end" at the bottom -- built the same way as the
      // circle above (direct point sampling, no polygon corners to
      // resample from) so it morphs into/out of its neighbors cleanly.
      // The CSS reference (a border-radius asymmetric ellipse) can't be
      // ported literally since this is a canvas vertex path; a sinusoidal
      // radius squash produces the same egg silhouette without any seam.
      const n = 48, pts = [];
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 / n) * i - Math.PI / 2;
        // 2026-09-04 fix (per Eric: rendered upside-down): flipped the
        // sign so the ROUND/blunt end sits at the top (~1.3) and the
        // narrower end at the bottom (~0.7), matching a right-side-up egg.
        const squash = 1 - 0.3 * Math.sin(a);
        pts.push([Math.cos(a) * 0.82, Math.sin(a) * squash]);
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
  // 2026-09-10 (per Eric: "push the patterns of the RGB patterns further
  // and help create several unique profiles that feel like they pulse at
  // different rates or even have multi pulses"): three new profiles added
  // -- pulse (a slow two-beat "lub-dub" heartbeat), rapidpulse (the same
  // heartbeat language at roughly double the rate, a different hue), and
  // multipulse (several independently-paced pulses layered across the
  // tunnel's own depth at once, literally "multi pulses" in one profile).
  // See colorState() below for each one's actual math.
  const PROFILES = ['cycle', 'static', 'breathe', 'flame', 'wave', 'meteor', 'city', 'pulse', 'rapidpulse', 'multipulse'];

  // Fixed (not Math.random()-seeded) per-ring variation for the City
  // Lights profile, so each ring drifts its own independent hue and
  // twinkles on its own phase/speed — reads as scattered colorful lights
  // rather than one synchronized effect, the same idea as a Govee app's
  // multicolor "twinkle"/"comet" scenes. Fixed values (not randomized at
  // load) keep the effect visually consistent across reloads/screenshots.
  const CITY_SEEDS = [
    { hue: 200, speed: 18, tPhase: 0.0, tSpeed: 1.3 },
    { hue: 320, speed: -14, tPhase: 0.7, tSpeed: 1.7 },
    { hue: 40, speed: 10, tPhase: 1.4, tSpeed: 1.1 },
    { hue: 150, speed: -20, tPhase: 2.1, tSpeed: 1.9 },
    { hue: 280, speed: 16, tPhase: 2.8, tSpeed: 1.4 },
    { hue: 10, speed: -12, tPhase: 3.5, tSpeed: 1.6 },
    { hue: 190, speed: 22, tPhase: 4.2, tSpeed: 1.2 },
    { hue: 340, speed: -18, tPhase: 4.9, tSpeed: 1.8 },
    { hue: 90, speed: 14, tPhase: 5.6, tSpeed: 1.5 },
  ];
  const METEOR_PERIOD = 2.6; // seconds per pass, far -> near

  // Shared traveling-brightness helper (2026-09-03, per Eric: "please
  // ensure all the rgb profiles have similar motion" after liking Meteor's
  // traveling streak). One bright band travels far->near every `period`
  // seconds and every profile below now uses this same mechanic, just
  // tuned differently (Meteor and City Lights already had their own
  // hand-rolled version of this idea; this generalizes it instead of
  // leaving Cycle/Static/Breathe/Flame/Wave as flat, motionless washes).
  function travelSpike(elapsed, z, period, width, baseline, amp) {
    const t = (elapsed % period) / period;
    const travelZ = Z_FAR - t * (Z_FAR - Z_NEAR);
    const spike = Math.max(0, 1 - Math.abs(z - travelZ) / width);
    return baseline + spike * spike * amp;
  }
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
  // vary hue by depth), a brightness multiplier (breatheMul) applied on
  // top of the existing fade-in (Breathe and Flame both modulate this
  // instead of needing a second, separate alpha pipeline), and an
  // optional per-ring alpha function (ringAlpha(i, z), default 1 — how
  // Meteor and City Lights make individual rings flash/twinkle
  // independently rather than the whole tunnel moving as one brightness).
  function colorState(elapsed) {
    switch (profile) {
      case 'static':
        return {
          hue: 205, breatheMul: 1, ringHue: () => 205,
          ringAlpha: (i, z) => travelSpike(elapsed, z, 3.0, 240, 0.42, 2.0),
        };
      case 'breathe': {
        const mul = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(elapsed * 1.1));
        return {
          hue: 28, breatheMul: mul, ringHue: () => 28,
          ringAlpha: (i, z) => travelSpike(elapsed, z, 4.2, 300, 0.5, 1.7),
        };
      }
      case 'flame': {
        const flicker = 0.72 + 0.28 * Math.sin(elapsed * 9 + Math.sin(elapsed * 3.7) * 2.2);
        const h = 18 + Math.sin(elapsed * 2.3) * 14 + Math.sin(elapsed * 5.1) * 6; // wanders across red-orange-yellow
        return {
          hue: h, breatheMul: flicker, ringHue: i => h + i * 2,
          ringAlpha: (i, z) => travelSpike(elapsed, z, 2.2, 200, 0.48, 2.1),
        };
      }
      case 'wave':
        return {
          hue: (200 + elapsed * 6) % 360, breatheMul: 1, ringHue: i => (200 + i * 34 + elapsed * 52) % 360,
          ringAlpha: (i, z) => travelSpike(elapsed, z, 2.8, 260, 0.5, 1.9),
        };
      case 'meteor': {
        // A single bright streak races from the vanishing point toward the
        // viewer once every METEOR_PERIOD seconds; every ring outside its
        // glow stays dim, so the tunnel reads as mostly-dark with one
        // traveling flash — a comet/meteor scene, not a synchronized wash.
        const t = (elapsed % METEOR_PERIOD) / METEOR_PERIOD;
        const meteorZ = Z_FAR - t * (Z_FAR - Z_NEAR);
        const width = 220;
        return {
          hue: 195,
          breatheMul: 1,
          ringHue: () => 195,
          ringAlpha: (i, z) => {
            const spike = Math.max(0, 1 - Math.abs(z - meteorZ) / width);
            return 0.12 + spike * spike * 4.2;
          },
        };
      }
      case 'city': {
        // Scattered, independently-drifting colored lights -- each ring
        // owns its own fixed hue drift speed and twinkle phase (CITY_SEEDS
        // above) instead of the whole tunnel sharing one hue, the Govee-
        // style "multicolor twinkle" scene rather than a single-color mode.
        return {
          hue: 210,
          breatheMul: 1,
          ringHue: i => {
            const s = CITY_SEEDS[i % CITY_SEEDS.length];
            return ((s.hue + elapsed * s.speed) % 360 + 360) % 360;
          },
          ringAlpha: i => {
            const s = CITY_SEEDS[i % CITY_SEEDS.length];
            return 0.32 + 1.35 * (0.5 + 0.5 * Math.sin(elapsed * s.tSpeed + s.tPhase));
          },
        };
      }
      case 'pulse': {
        // Heartbeat-style double pulse ("lub-dub") -- a slow, rhythmic
        // single-rate pulse per Eric's ask. One full heartbeat every 1.8s:
        // a sharp strong "lub", a softer "dub" right behind it, then a
        // resting gap -- built from two narrow Gaussian bumps (not a hard
        // on/off flash) so it reads as a pulse, not a strobe. The same
        // period also drives ringAlpha's travelSpike, so each heartbeat
        // visibly sends its own bright band traveling down the tunnel.
        const T = 1.8;
        const tt = (elapsed % T) / T;
        const lub = Math.exp(-Math.pow((tt - 0.08) * 15, 2));
        const dub = 0.55 * Math.exp(-Math.pow((tt - 0.26) * 17, 2));
        const mul = 0.38 + (lub + dub) * 1.15;
        const h = 342; // warm red-pink -- reads as a literal "pulse," distinct from Flame's orange
        return {
          hue: h, breatheMul: mul, ringHue: () => h,
          ringAlpha: (i, z) => travelSpike(elapsed, z, T, 220, 0.4, 1.7),
        };
      }
      case 'rapidpulse': {
        // Same heartbeat language as Pulse, at roughly double the rate and
        // a cooler hue -- a second, more energetic single-rate option
        // rather than only one pulse speed. Kept under 3 beats/sec (WCAG
        // 2.3.1's photosensitive-seizure flash threshold) and built from
        // the same soft Gaussian bump, never a hard full-brightness flash.
        const T = 0.85;
        const tt = (elapsed % T) / T;
        const beat = Math.exp(-Math.pow((tt - 0.1) * 13, 2));
        const mul = 0.42 + beat * 1.05;
        const h = 178; // cyan -- distinct from Pulse's warm red-pink
        return {
          hue: h, breatheMul: mul, ringHue: () => h,
          ringAlpha: (i, z) => travelSpike(elapsed, z, T, 200, 0.42, 1.6),
        };
      }
      case 'multipulse': {
        // Several independently-paced pulses layered across the tunnel's
        // own depth at once -- per Eric's "even have multi pulses" ask.
        // Each ring is assigned one of three channels by index, and each
        // channel travels/pulses at its own period, width, and hue, so the
        // tunnel reads as multiple distinct heartbeats overlapping rather
        // than one synchronized profile.
        const CH = [
          { period: 1.5, width: 170, hue: 200 },
          { period: 2.4, width: 210, hue: 300 },
          { period: 3.6, width: 250, hue: 46 },
        ];
        return {
          hue: CH[0].hue,
          breatheMul: 1,
          ringHue: i => CH[i % CH.length].hue,
          ringAlpha: (i, z) => {
            const c = CH[i % CH.length];
            return travelSpike(elapsed, z, c.period, c.width, 0.4, 2.0);
          },
        };
      }
      case 'cycle':
      default:
        return {
          hue: (200 + elapsed * 6) % 360, breatheMul: 1, ringHue: i => (200 + elapsed * 6 + i * 12) % 360,
          ringAlpha: (i, z) => travelSpike(elapsed, z, 3.4, 260, 0.48, 1.8),
        };
    }
  }

  // 2026-09-03 follow-up: every profile above now carries a ringAlpha
  // traveling-brightness pass via travelSpike() (period/width/amp tuned
  // per profile), not just Meteor and City Lights -- so Cycle, Static,
  // Breathe, Flame, and Wave all have real depth motion now instead of a
  // flat, evenly-lit tunnel. See travelSpike() above for the shared math.
  // 2026-09-04 (per Eric: "push the RGB effects and glows and unique
  // patterns a bit more... make the options unique and eye catching"):
  // every profile's ringAlpha amplitude raised again (roughly +30-40%)
  // for punchier bright moments, and drawRing/strokeSpokes below now add
  // real glow (shadowBlur/shadowColor) and saturation that scale with how
  // bright a given ring/spoke is at that instant -- so the brightest
  // point of any profile's cycle now actually glows instead of just
  // getting more opaque, and each profile's already-different spike
  // timing/width/hue behavior reads as more visually distinct once it's
  // rendered with real light-bloom instead of flat strokes.

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
    // 2026-09-03 (per Eric: "a little bit brighter and a bit thicker"):
    // alpha stops raised (.26/.5 -> .4/.7) and line width raised (1 -> 1.5).
    grad.addColorStop(0, `hsla(${hue}, 70%, 55%, 0)`);
    grad.addColorStop(0.35, `hsla(${hue}, 70%, 55%, ${0.4 * globalFade})`);
    grad.addColorStop(1, `hsla(${hue + 30}, 85%, 65%, ${0.7 * globalFade})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    // 2026-09-04: a soft constant glow on the spokes (scaled by the same
    // globalFade every other brightness value already uses) so the tunnel
    // has real light-bloom even on frames where no ring is mid-spike.
    ctx.shadowColor = `hsla(${hue + 30}, 90%, 68%, ${0.55 * globalFade})`;
    ctx.shadowBlur = 10 * globalFade;
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
    ctx.shadowBlur = 0; // never leave glow bleeding into the next draw call
  }

  function drawRing(ring, unitPts, rot, globalFade, hue, alphaMul) {
    const f = fadeFor(ring.z) * globalFade;
    if (f <= 0.01) return;
    // 2026-09-03: alpha base raised .36 -> .5 and line width 1.3 -> 1.8
    // ("a little bit brighter and a bit thicker" per Eric), clamped to 1
    // since alphaMul (Meteor/City Lights' per-ring flash/twinkle) can push
    // it well past 1 on its own. Line width also grows slightly with a
    // bright spike so Meteor's streak reads as a thicker line passing
    // through, not just a color change.
    const am = alphaMul == null ? 1 : alphaMul;
    // 2026-09-04 (per Eric: push the glows/patterns more): saturation and
    // lightness now scale up with the same per-ring brightness spike that
    // already drives alpha/line-width, so a profile's bright traveling
    // moment reads as genuinely more vivid, not just more opaque -- and a
    // real shadowBlur glow kicks in once a ring is meaningfully above its
    // resting brightness (am > 1.05), reset after stroke() so it never
    // bleeds into whatever draws next.
    const bright = Math.max(0, am - 1);
    const sat = Math.min(100, 70 + bright * 12);
    const light = Math.min(74, 60 + bright * 6);
    const alpha = Math.min(1, 0.5 * f * am);
    ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
    ctx.lineWidth = 1.8 + bright * 1.5;
    if (bright > 0.05) {
      ctx.shadowColor = `hsla(${hue}, 95%, 68%, ${Math.min(1, alpha * 1.2)})`;
      ctx.shadowBlur = Math.min(30, bright * 15);
    }
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
    ctx.shadowBlur = 0; // never leave glow bleeding into the next ring/spoke draw
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

  // Read the real --bg custom property once at startup rather than
  // hardcoding a duplicate hex value, so this canvas fill can never drift
  // from the CSS variable every dark section actually uses.
  let BG_COLOR = '#060708';
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    if (v) BG_COLOR = v;
  } catch { /* getComputedStyle unavailable in some test harnesses -- fall back to the literal above */ }

  // Unrolls the tunnel's own current morphed-shape points (the exact same
  // `pts` array frame() already computed for the rings this frame) into a
  // horizontal "skyline" line across the boundary strip, solid-fills
  // everything below it in BG_COLOR, and leaves everything above it
  // untouched/transparent (so whatever the fixed tunnel layers are
  // currently faded to keeps showing through above the line). Each
  // point's *radius* from the shape's own center becomes the line's
  // height at that x position -- a Circle beat (constant radius) draws a
  // calm, nearly-flat line near the top of the strip (mostly open above
  // it); a Star beat (alternating ~1.0/~0.45 radius) draws a sharp
  // zigzag that dips much closer to full black at each inner vertex. That
  // mapping is deliberate: the "busier" the current tunnel shape reads,
  // the more the boundary itself visibly changes frame to frame and shape
  // to shape, instead of a flat divider that merely happens to redraw.
  const B_MIN_R = 0.45, B_MAX_R = 1.05; // matches this file's real shape radius range (star inner .. egg's widest)
  function drawBoundary(pts, hue, globalFade) {
    if (!bctx || !boundaryCanvas || BW <= 0 || BH <= 0) return;
    const n = pts.length;
    const yTop = BH * 0.12, yBottom = BH * 0.88;
    const xs = new Array(n), ys = new Array(n);
    for (let i = 0; i < n; i++) {
      const r = Math.hypot(pts[i][0], pts[i][1]);
      const t = Math.min(1, Math.max(0, (B_MAX_R - r) / (B_MAX_R - B_MIN_R)));
      xs[i] = (i / n) * BW;
      ys[i] = yTop + t * (yBottom - yTop);
    }
    bctx.clearRect(0, 0, BW, BH);

    // Smooth path through the unrolled points via the same
    // midpoint-quadratic technique drawRing() uses for the tunnel's own
    // outlines, so this reads as one continuous curve, not a faceted
    // polyline -- then closed down to the strip's bottom-right/bottom-left
    // corners and filled solid, so everything under the line is opaque.
    function tracePath() {
      bctx.beginPath();
      bctx.moveTo(0, ys[0]);
      for (let i = 0; i < n; i++) {
        const nextX = i + 1 < n ? xs[i + 1] : BW;
        const nextY = i + 1 < n ? ys[i + 1] : ys[n - 1];
        const midX = (xs[i] + nextX) / 2, midY = (ys[i] + nextY) / 2;
        bctx.quadraticCurveTo(xs[i], ys[i], midX, midY);
      }
    }

    tracePath();
    bctx.lineTo(BW, BH);
    bctx.lineTo(0, BH);
    bctx.closePath();
    bctx.fillStyle = BG_COLOR;
    bctx.fill();

    // A soft glowing stroke retraces the same line, tinted with the
    // active RGB lighting profile's current hue -- so the cut line's
    // color, not just its shape, keeps pace with whatever profile is
    // selected (e.g. Flame's warm flicker vs Wave's traveling hue).
    tracePath();
    bctx.strokeStyle = `hsla(${hue}, 80%, 62%, ${0.55 * globalFade})`;
    bctx.lineWidth = 2;
    bctx.shadowColor = `hsla(${hue}, 90%, 66%, ${0.6 * globalFade})`;
    bctx.shadowBlur = 18;
    bctx.stroke();
    bctx.shadowBlur = 0; // never leave glow bleeding into the next draw call
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
      drawRing(r, pts, rot, globalFade, cs.ringHue(i), cs.ringAlpha ? cs.ringAlpha(i, r.z) : 1);
    }
    drawBoundary(pts, cs.hue, globalFade);

    raf = requestAnimationFrame(frame);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    strokeSpokes(0, 0.6, 200);
    rings.forEach((r, i) => drawRing(r, RESAMPLED[SHAPES[0]], 0, 0.6, (200 + i * 12) % 360));
    // Reduced-motion still gets the boundary line (one still frame, same
    // as the tunnel above it) rather than an unshaped gap -- it's a
    // static shape either way for these users, just like the rest of the
    // hero's reduced-motion fallback.
    drawBoundary(RESAMPLED[SHAPES[0]], 200, 0.6);
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
