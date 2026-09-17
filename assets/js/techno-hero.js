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

  // 2026-09-17, per Eric ("have my mouse be able to do a ripple or water
  // effect on the shapes in the background... water ripple on the
  // shapes" -- confirmed via AskUserQuestion over the ASCII-trail
  // alternative): replaces the old rgb-cursor.js light-trail canvas
  // entirely (see that file's own updated header comment). Ripples are
  // real screen-space origins (mouse position at spawn time); every
  // frame, every ring's already-projected screen points get an extra
  // radial offset from each still-alive ripple -- a concentric sine wave
  // centered on the ripple's origin, exactly like a stone dropped in
  // water: `sin(distance*FREQ - age*PHASE_SPEED)` produces several
  // alternating rings that visibly travel outward from the origin over
  // time (not a single static bump), an exponential falloff with real
  // distance from the origin keeps the effect local rather than
  // disturbing the whole tunnel, and an age-based falloff fades the whole
  // ripple to nothing by RIPPLE_LIFE seconds -- "decaying by both
  // distance and age" per the original spec. Applied directly to each
  // ring's screen-space points (in drawRing, after project()), not to the
  // spokes -- the rings are what reads as "the shapes," and this keeps
  // the effect cheap (one extra sin() + a couple sqrt-free-ish ops per
  // point, ~9 rings * 56 points/frame, trivial at 60fps).
  let ripples = []; // {x, y, t0 (elapsed seconds at spawn), amp}
  const RIPPLE_LIFE = 1.6;          // seconds -- matches the "~1-2s lifespan" spec
  const RIPPLE_FREQ = 0.035;        // radians per px of distance -- controls ring spacing
  const RIPPLE_PHASE_SPEED = 7.5;   // radians/sec -- how fast the concentric rings visibly propagate outward
  const RIPPLE_REACH = 850;         // px -- exponential distance falloff scale
  const MAX_RIPPLES = 24;           // hard cap so a long mouse drag can't grow this unbounded
  const RIPPLE_MOVE_AMP = 7;        // px, a gentle continuous disturbance while moving
  const RIPPLE_CLICK_AMP = 18;      // px, a real "splash" on click -- roughly 2.5x a move ripple

  function addRipple(x, y, amp) {
    ripples.push({ x, y, t0: elapsed, amp });
    // Cap by dropping the oldest -- simpler than a separate prune pass,
    // and correct since ripples are always pushed in time order.
    if (ripples.length > MAX_RIPPLES) ripples.shift();
  }

  // Mutates `pt` (a {x,y} screen point already produced by project()) in
  // place, adding every still-alive ripple's radial contribution.
  function applyRipples(pt) {
    if (!ripples.length) return;
    let ox = 0, oy = 0;
    for (let k = 0; k < ripples.length; k++) {
      const rp = ripples[k];
      const age = elapsed - rp.t0;
      if (age < 0 || age > RIPPLE_LIFE) continue;
      const dx = pt.x - rp.x, dy = pt.y - rp.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.5) continue; // avoid a divide-by-near-zero direction vector
      const distanceDecay = Math.exp(-dist / RIPPLE_REACH);
      const ageDecay = Math.pow(1 - age / RIPPLE_LIFE, 1.4);
      const phase = dist * RIPPLE_FREQ - age * RIPPLE_PHASE_SPEED;
      const mag = rp.amp * Math.sin(phase) * distanceDecay * ageDecay;
      const inv = 1 / dist;
      ox += dx * inv * mag;
      oy += dy * inv * mag;
    }
    pt.x += ox; pt.y += oy;
  }

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

  // 2026-09-16, round 4: a custom "grid line" color override, per Eric's
  // direct request ("clicking on the color should open up a mini pop up
  // tab... and it should be changing the color of the background grid
  // lines"). Distinct from `profile` -- the select still picks the
  // *animation pattern* (Cycle/Breathe/Meteor/etc.); this is a color tint
  // layered on top of whichever pattern is active, applied in frame() via
  // a hue-shift so the pattern's own motion/brightness is untouched. null
  // means "no override, use the profile's own real hue" (the previous,
  // still-default behavior). Cached the same way as RGB_KEY.
  const GRID_HUE_KEY = 'gzGridHue';
  function loadGridHue() {
    try {
      const v = localStorage.getItem(GRID_HUE_KEY);
      if (v === null || v === 'auto') return null;
      const n = Number(v);
      return (Number.isFinite(n) && n >= 0 && n < 360) ? n : null;
    } catch { return null; }
  }
  function saveGridHue(v) {
    try { localStorage.setItem(GRID_HUE_KEY, v === null ? 'auto' : String(v)); } catch { /* private mode etc -- fine to skip */ }
  }
  let gridHueOverride = loadGridHue();
  // Exposed so assets/js/rgb-cursor.js's color-wheel popover can drive this
  // without techno-hero.js and rgb-cursor.js needing to independently agree
  // on a localStorage key/shape -- one real API, one source of truth for
  // "what color is the tunnel actually rendering right now."
  window.GZ_HERO = window.GZ_HERO || {};
  window.GZ_HERO.getCustomHue = () => gridHueOverride;
  window.GZ_HERO.setCustomHue = (h) => {
    gridHueOverride = (h === null) ? null : (((h % 360) + 360) % 360);
    saveGridHue(gridHueOverride);
    updateSwatch();
  };

  // RGB-picker discoverability swatch (2026-09-16, Phase 5 of the design-
  // audit follow-through -- per Eric's go-ahead). The lighting picker was a
  // plain <select> with no visual hint that it's a real customization
  // feature rather than decorative text. Each profile's own representative
  // hue (the same base hue colorState() above already returns for that
  // profile -- not a second, independently-guessed color) now fills a small
  // circular swatch next to the control, updated once on load and once per
  // real selection change -- NOT every animation frame, per this file's own
  // "don't force a layout recalculation every frame" rule (writing a style
  // property is cheap, but there's no reason to do it 60x/sec for a value
  // that only actually changes on user input). `cycle` is the one profile
  // whose hue never settles on a single value, so it gets an honest
  // rainbow-conic swatch (`.is-cycle` in style.css) instead of a fixed
  // color that would misrepresent it as a single hue.
  // 2026-09-16: kept in lockstep with colorState()'s own updated base hues
  // above (static/breathe/flame/wave/meteor/multipulse all moved to spread
  // further apart around the wheel) -- still the exact same values
  // colorState() actually renders, not a second independently-guessed set.
  const SWATCH_HUE = { static: 220, breathe: 45, flame: 10, wave: 150, meteor: 265, city: 210, pulse: 342, rapidpulse: 178, multipulse: 95 };
  const swatchEl = document.getElementById('hero-lighting-swatch');
  function updateSwatch() {
    if (!swatchEl) return;
    // 2026-09-16, round 4: a custom grid-hue override always wins the
    // swatch display -- it's the more specific, more recently-chosen
    // "what color is this actually rendering" answer than the profile's
    // own base hue. (Disclosed simplification for Cycle-with-override: the
    // true rendered hue still drifts under Cycle even with an override
    // active, since the override is a fixed *shift*, not a fixed value --
    // showing the override's own color here is a close, honest-enough
    // approximation rather than a second rainbow-vs-static distinction.)
    if (gridHueOverride !== null) {
      swatchEl.classList.remove('is-cycle');
      const color = `hsl(${gridHueOverride}, 85%, 55%)`;
      swatchEl.style.background = color;
      swatchEl.style.color = color;
      return;
    }
    if (profile === 'cycle') {
      swatchEl.classList.add('is-cycle');
      swatchEl.style.background = '';
      swatchEl.style.color = '';
    } else {
      swatchEl.classList.remove('is-cycle');
      const color = `hsl(${SWATCH_HUE[profile] ?? 205}, 85%, 55%)`;
      swatchEl.style.background = color;
      // .hero-lighting-swatch's glow ring reads this via currentColor (see
      // style.css) so the glow always matches the fill exactly, one real
      // color set once rather than two independently-guessed values.
      swatchEl.style.color = color;
    }
  }

  const lightingSelect = document.getElementById('hero-lighting-select');
  if (lightingSelect) {
    lightingSelect.value = profile;
    updateSwatch();
    lightingSelect.addEventListener('change', () => {
      profile = PROFILES.includes(lightingSelect.value) ? lightingSelect.value : 'cycle';
      saveProfile(profile);
      updateSwatch();
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
        // 2026-09-16 (per Eric: "make the RGB patterns more intense... so
        // they are each unique"): hue shifted 205->220 (a deeper blue) so it
        // reads clearly apart from Wave's now-green base and Meteor's now-
        // violet base -- the three used to sit within ~15deg of each other
        // in the same blue/cyan band. Amplitude raised across the board.
        return {
          hue: 220, breatheMul: 1, ringHue: () => 220,
          ringAlpha: (i, z) => travelSpike(elapsed, z, 3.0, 240, 0.48, 2.6),
        };
      case 'breathe': {
        // Hue moved 28->45 (a brighter amber/gold) to sit clearly apart
        // from Flame's now-narrower deep-red-orange range; breathe range
        // widened (deeper dip, higher peak) for a more dramatic inhale/exhale.
        const mul = 0.28 + 0.87 * (0.5 + 0.5 * Math.sin(elapsed * 1.1));
        return {
          hue: 45, breatheMul: mul, ringHue: () => 45,
          ringAlpha: (i, z) => travelSpike(elapsed, z, 4.2, 300, 0.5, 2.2),
        };
      }
      case 'flame': {
        // Flicker range and hue wander both widened for a more dramatic,
        // less even flame; hue center pulled down to a deeper red (was
        // wandering into the same amber territory Breathe now owns).
        const flicker = 0.6 + 0.45 * Math.sin(elapsed * 9 + Math.sin(elapsed * 3.7) * 2.2);
        const h = 10 + Math.sin(elapsed * 2.3) * 18 + Math.sin(elapsed * 5.1) * 8; // wanders deep red -> orange
        return {
          hue: h, breatheMul: flicker, ringHue: i => h + i * 2,
          ringAlpha: (i, z) => travelSpike(elapsed, z, 2.2, 200, 0.5, 2.7),
        };
      }
      case 'wave':
        // Base hue moved from blue (200) to green (150) -- Wave used to
        // sit almost on top of Static/Meteor's old blue-cyan cluster.
        return {
          hue: (150 + elapsed * 6) % 360, breatheMul: 1, ringHue: i => (150 + i * 34 + elapsed * 52) % 360,
          ringAlpha: (i, z) => travelSpike(elapsed, z, 2.8, 260, 0.52, 2.4),
        };
      case 'meteor': {
        // A single bright streak races from the vanishing point toward the
        // viewer once every METEOR_PERIOD seconds; every ring outside its
        // glow stays dim, so the tunnel reads as mostly-dark with one
        // traveling flash — a comet/meteor scene, not a synchronized wash.
        // Hue moved 195 (cyan, overlapping Rapid Pulse) -> 265 (violet);
        // background dimmed and the streak itself brightened for more
        // contrast between "resting" and "flash" moments.
        const t = (elapsed % METEOR_PERIOD) / METEOR_PERIOD;
        const meteorZ = Z_FAR - t * (Z_FAR - Z_NEAR);
        const width = 220;
        return {
          hue: 265,
          breatheMul: 1,
          ringHue: () => 265,
          ringAlpha: (i, z) => {
            const spike = Math.max(0, 1 - Math.abs(z - meteorZ) / width);
            return 0.09 + spike * spike * 5.2;
          },
        };
      }
      case 'city': {
        // Scattered, independently-drifting colored lights -- each ring
        // owns its own fixed hue drift speed and twinkle phase (CITY_SEEDS
        // above) instead of the whole tunnel sharing one hue, the Govee-
        // style "multicolor twinkle" scene rather than a single-color mode.
        // Twinkle range widened (dimmer troughs, brighter peaks) for more
        // contrast between lights as they twinkle in and out.
        return {
          hue: 210,
          breatheMul: 1,
          ringHue: i => {
            const s = CITY_SEEDS[i % CITY_SEEDS.length];
            return ((s.hue + elapsed * s.speed) % 360 + 360) % 360;
          },
          ringAlpha: i => {
            const s = CITY_SEEDS[i % CITY_SEEDS.length];
            return 0.26 + 1.75 * (0.5 + 0.5 * Math.sin(elapsed * s.tSpeed + s.tPhase));
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
        // Baseline dimmed and beat amplitude raised for a punchier contrast
        // between "resting" and "beat" moments.
        const T = 1.8;
        const tt = (elapsed % T) / T;
        const lub = Math.exp(-Math.pow((tt - 0.08) * 15, 2));
        const dub = 0.55 * Math.exp(-Math.pow((tt - 0.26) * 17, 2));
        const mul = 0.3 + (lub + dub) * 1.5;
        const h = 342; // warm red-pink -- reads as a literal "pulse," distinct from Flame's orange
        return {
          hue: h, breatheMul: mul, ringHue: () => h,
          ringAlpha: (i, z) => travelSpike(elapsed, z, T, 220, 0.42, 2.2),
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
        const mul = 0.34 + beat * 1.4;
        const h = 178; // cyan -- distinct from Pulse's warm red-pink
        return {
          hue: h, breatheMul: mul, ringHue: () => h,
          ringAlpha: (i, z) => travelSpike(elapsed, z, T, 200, 0.44, 2.1),
        };
      }
      case 'multipulse': {
        // Several independently-paced pulses layered across the tunnel's
        // own depth at once -- per Eric's "even have multi pulses" ask.
        // Each ring is assigned one of three channels by index, and each
        // channel travels/pulses at its own period, width, and hue, so the
        // tunnel reads as multiple distinct heartbeats overlapping rather
        // than one synchronized profile. Channel 1 moved from blue (200,
        // overlapping Static/Wave) to yellow-green (95) for a cleaner
        // 3-way spread against channels 2/3; amplitude raised on all three.
        const CH = [
          { period: 1.5, width: 170, hue: 95 },
          { period: 2.4, width: 210, hue: 300 },
          { period: 3.6, width: 250, hue: 20 },
        ];
        return {
          hue: CH[0].hue,
          breatheMul: 1,
          ringHue: i => CH[i % CH.length].hue,
          ringAlpha: (i, z) => {
            const c = CH[i % CH.length];
            return travelSpike(elapsed, z, c.period, c.width, 0.42, 2.6);
          },
        };
      }
      case 'cycle':
      default:
        return {
          hue: (200 + elapsed * 6) % 360, breatheMul: 1, ringHue: i => (200 + elapsed * 6 + i * 12) % 360,
          ringAlpha: (i, z) => travelSpike(elapsed, z, 3.4, 260, 0.5, 2.3),
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
    // 2026-09-16 (per Eric: "make the RGB patterns more intense"): the same
    // brightness-driven saturation/lightness/glow scaling as before, just
    // steeper -- a profile's bright traveling moment now pushes further
    // toward full saturation and a bigger, brighter glow than the 2026-09-04
    // pass did, on top of that same pass's per-profile amplitude increases.
    const bright = Math.max(0, am - 1);
    const sat = Math.min(100, 75 + bright * 18);
    const light = Math.min(78, 62 + bright * 10);
    const alpha = Math.min(1, 0.5 * f * am);
    ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
    ctx.lineWidth = 1.8 + bright * 2.2;
    if (bright > 0.05) {
      ctx.shadowColor = `hsla(${hue}, 95%, 68%, ${Math.min(1, alpha * 1.3)})`;
      ctx.shadowBlur = Math.min(38, bright * 20);
    }
    const n = unitPts.length;
    const pts = new Array(n);
    for (let i = 0; i < n; i++) {
      const p = project(unitPts[i][0] * A, unitPts[i][1] * A, ring.z, rot);
      applyRipples(p);
      pts[i] = p;
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

  let raf, last = 0, elapsed = 0;

  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts; elapsed += dt;
    const rot = elapsed * ROT_SPEED;
    let cs = colorState(elapsed);
    // 2026-09-16, round 4 (per Eric: the color-wheel popover should recolor
    // the tunnel's own grid lines, not just a separate cursor-only value,
    // and the cursor should always mirror whatever the tunnel actually
    // renders): if a custom grid hue is active, rotate every hue this
    // profile would have produced by the same fixed delta that brings its
    // base hue to the custom target. This keeps each profile's own
    // animation/brightness pattern (breatheMul, ringAlpha, the per-ring
    // hue *spread* for multi-hue profiles like City Lights) fully intact --
    // only the palette's center point moves, not its shape or motion.
    if (gridHueOverride !== null) {
      const shift = ((gridHueOverride - cs.hue) % 360 + 360) % 360;
      const baseRingHue = cs.ringHue;
      cs = { hue: gridHueOverride, breatheMul: cs.breatheMul, ringHue: i => (baseRingHue(i) + shift) % 360, ringAlpha: cs.ringAlpha };
    }
    // 2026-09-16, RGB cursor feature: expose the tunnel's real live hue
    // (the exact same value driving the spokes this frame, not a second
    // guessed color) so assets/js/rgb-cursor.js can mirror it without
    // duplicating colorState()'s own math. A plain number write, not a
    // DOM/style write, so this costs nothing extra per the "don't force
    // layout every frame" rule -- it's cheaper than the canvas draw calls
    // already happening on this same line.
    window.GZ_HERO_HUE = cs.hue;
    // Same "plain number write, not a DOM/style write" reasoning as
    // GZ_HERO_HUE above -- exposes how many spawned ripples are still
    // within their RIPPLE_LIFE window, for live debugging/QA (confirming
    // ripples actually decay over real time rather than piling up) without
    // needing to reach into this IIFE's closure state.
    let activeRipples = 0;
    for (let k = 0; k < ripples.length; k++) { if (elapsed - ripples[k].t0 <= RIPPLE_LIFE) activeRipples++; }
    window.GZ_HERO_RIPPLE_COUNT = activeRipples;
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

    raf = requestAnimationFrame(frame);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    strokeSpokes(0, 0.6, 200);
    rings.forEach((r, i) => drawRing(r, RESAMPLED[SHAPES[0]], 0, 0.6, (200 + i * 12) % 360));
  }

  // Spawn ripples from real pointer input -- fine-pointer, motion-enabled
  // devices only (matches rgb-cursor.js's own existing coarse-pointer/
  // reduced-motion opt-outs: there's no real "mouse dragging across the
  // surface" gesture on a touch device, and reduced-motion means frame()
  // never runs in the first place, so ripples would never even draw).
  // Movement is throttled by both distance (>=24px since the last spawn)
  // and time (>=55ms) so a fast continuous drag reads as a real trail of
  // ripples, not one ripple per raw pointermove event (which can fire far
  // more often than needed and would blow past MAX_RIPPLES instantly). A
  // click/tap-down always spawns one, stronger, single ripple regardless
  // of the movement throttle -- a deliberate "drop" versus the ambient
  // "disturbance while moving" feel.
  const isCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (!reduceMotion && !isCoarsePointer) {
    let lastSpawnT = 0, lastSpawnX = null, lastSpawnY = null;
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const movedFar = lastSpawnX === null || Math.hypot(e.clientX - lastSpawnX, e.clientY - lastSpawnY) >= 24;
      if (movedFar && now - lastSpawnT >= 55) {
        addRipple(e.clientX, e.clientY, RIPPLE_MOVE_AMP);
        lastSpawnT = now; lastSpawnX = e.clientX; lastSpawnY = e.clientY;
      }
    }, { passive: true });
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      addRipple(e.clientX, e.clientY, RIPPLE_CLICK_AMP);
    });
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
