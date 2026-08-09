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

   Hero Runner game (index.html only, when the #hero-runner markup is
   present): a single extra shape ("hazard", drawn in red using the exact
   same shape/projection code as the decorative tunnel) streams toward the
   viewer alongside the normal rings, at the exact same speed as those
   rings. A character sits at a fixed screen position under the hero's
   "Plan your visit" button, standing on a second ring — the "baseline"
   ring — that morphs through the same shape sequence as the rest of the
   tunnel but, unlike every other ring, never recedes: it's held at one
   fixed depth (baseRingZ, derived once from the character's on-screen
   distance from the tunnel's vanishing point) so it's always the same
   size/place, right under the character. Jump timing is exact and simple:
   the instant a hazard's depth reaches that same fixed depth
   (hz.z <= baseRingZ), it's resolved as a hit or a miss. Missing resets
   the current score AND the speed ramp back to base pace; the run keeps
   going and a best score persists via localStorage. The whole tunnel
   (rings, baseline, hazards alike) starts at a base pace and gradually
   speeds up the longer the player survives without a miss, capping out
   after a stretch of unbroken survival — same single-button jump-timing
   feel as Chrome's dino game, just staged inside this tunnel instead of a
   separate strip. Everything pauses (without resetting) whenever the hero
   scrolls out of view. Pure canvas math, no images. */
(function () {
  const canvas = document.getElementById('techno-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W, H, DPR, cx, cy;
  const F = 300;
  const Z_NEAR = 60, Z_FAR = 1500;
  const BASE_SPEED = 92; // same travel pace the site's tunnel/cube previously settled on
  const MAX_SPEED = 230; // top pace once fully ramped — matches the old dedicated hazard speed
  const RAMP_SECONDS = 45; // seconds of unbroken survival to reach max speed (the "1000m" ramp)
  const ROT_SPEED = 0.045;

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
  // Hero Runner game state. Only active when this page has the runner
  // markup (index.html's hero) — everywhere else techno-hero.js behaves
  // exactly as the plain decorative tunnel described above.
  // ------------------------------------------------------------------
  const runnerWrap = document.getElementById('hero-runner');
  const scoreEl = document.getElementById('hr-score-val');
  const bestEl = document.getElementById('hr-best-val');
  const gameOn = !!(runnerWrap && scoreEl && bestEl && !reduceMotion);

  const HS_KEY = 'gzHeroRunnerBest';
  function loadBest() { try { return parseInt(localStorage.getItem(HS_KEY), 10) || 0; } catch { return 0; } }
  function saveBest(v) { try { localStorage.setItem(HS_KEY, String(v)); } catch { /* private mode etc — fine to skip */ } }

  let score = 0, best = 0;
  let gameActive = false; // true only while the hero is on screen
  let anchorX = 0, anchorY = 0; // fixed screen spot the character stands at
  let baseRingZ = 0; // fixed depth of the stationary baseline ring under the character
  let anchorAngle = 0; // the anchor's fixed angle from the vanishing point, unrotated
  let surviveTime = 0; // seconds survived since the last miss — drives the speed ramp
  let charY = 0, vy = 0, jumping = false, flashT = 0;
  let hazards = [];
  let spawnTimer = 1.1;
  // Jump height is deliberately modest (~50px peak) — the character sits
  // close under the button, and a big leap would fly up behind it (the
  // button sits above this canvas layer and would hide the character
  // mid-jump). Keeping the arc short also keeps the timing snappy.
  const GRAVITY = 1500, JUMP_V = -390, CHAR_R = 10;

  if (gameOn) { best = loadBest(); bestEl.textContent = String(best); }

  // Shared pace for every moving piece (decorative rings + hazards alike):
  // starts at BASE_SPEED and ramps linearly up to MAX_SPEED the longer the
  // player survives without a miss, capping out after RAMP_SECONDS.
  function currentSpeed() {
    const t = Math.min(1, surviveTime / RAMP_SECONDS);
    return BASE_SPEED + (MAX_SPEED - BASE_SPEED) * t;
  }

  function updateAnchor() {
    const r = runnerWrap.getBoundingClientRect();
    anchorX = r.left + r.width / 2;
    anchorY = r.top + 52;
    // The baseline ring's fixed depth: rotation preserves a point's distance
    // from the vanishing point, so a ring point at local radius A always
    // projects to a screen distance of A*(F/z) from center regardless of the
    // tunnel's current rotation. Solving that for z with the character's own
    // on-screen distance from center gives the one depth at which the ring
    // sits exactly under the character at every rotation.
    const dx = anchorX - cx, dy = anchorY - cy;
    const baseRingRadius = Math.hypot(dx, dy) || 1;
    baseRingZ = (A * F) / baseRingRadius;
    anchorAngle = Math.atan2(dy, dx);
  }

  function jump() {
    if (!gameActive || jumping) return;
    jumping = true; vy = JUMP_V;
  }

  function onMiss() {
    score = 0; flashT = 0.3; surviveTime = 0;
    scoreEl.textContent = '0';
  }
  function onClear() {
    score += 1;
    best = Math.max(best, score);
    scoreEl.textContent = String(score);
    bestEl.textContent = String(best);
    saveBest(best);
  }

  function spawnHazard() {
    // No shape of its own — it's whichever shape the tunnel is currently
    // showing (see drawHazard), so it reads as one of the real background
    // rings that happens to be red, not a foreign game object.
    hazards.push({ z: Z_FAR, resolved: false });
  }

  function updateGame(dt, rot, speed) {
    if (!gameActive) return;
    updateAnchor();

    if (jumping) {
      vy += GRAVITY * dt;
      charY += vy * dt;
      if (charY >= 0) { charY = 0; vy = 0; jumping = false; }
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawnHazard(); spawnTimer = 1.3 + Math.random() * 0.9; }

    // Same shared speed the decorative rings moved at this frame, and a
    // direct depth comparison against the stationary baseline ring's fixed
    // depth — the jump-timing trigger fires the instant a hazard reaches
    // that depth, matching exactly what's drawn on screen.
    for (const hz of hazards) {
      hz.z -= speed * dt;
      if (!hz.resolved && hz.z <= baseRingZ) {
        hz.resolved = true;
        const airborneEnough = -charY > CHAR_R * 2.6;
        if (airborneEnough) onClear(); else onMiss();
      }
    }
    hazards = hazards.filter(hz => hz.z > Z_NEAR - 40);

    if (flashT > 0) flashT = Math.max(0, flashT - dt);
  }

  // A hazard is drawn with the exact same drawRing() geometry/curve-smoothing
  // as every decorative ring, using whatever shape the tunnel currently
  // shows (morphedPoints/morphStateAt — the same call the decorative loop
  // makes) — the only difference is color. That's what makes it read as
  // "one of the background's own shapes, just red" instead of a separate
  // game object rendered on top of the scene.
  function drawHazard(hz, rot, globalFade) {
    const pts = morphedPoints(morphStateAt(elapsed));
    drawRing(hz, pts, rot, globalFade, 0, f => `rgba(255,53,53,${Math.min(1, f * 1.7)})`);
  }

  // How far a closed unit-space polygon (its perimeter points, in order)
  // extends from the origin at a given angle — found by ray-casting from
  // the origin out along that angle and intersecting whichever edge it
  // crosses. Square/triangle/pentagon/hexagon/star all have vertices at
  // radius 1 but dip inward between them (down to ~0.45 for the star's
  // inner points), so this varies by angle even though every shape is
  // "unit-sized" — exactly what lets the baseline ring below correct for
  // that and land precisely on the character regardless of which shape or
  // rotation the tunnel is currently showing.
  function radiusAtAngle(pts, theta) {
    const dx = Math.cos(theta), dy = Math.sin(theta);
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const ex = b[0] - a[0], ey = b[1] - a[1];
      const denom = dx * ey - dy * ex;
      if (Math.abs(denom) < 1e-9) continue;
      const t = (a[0] * ey - a[1] * ex) / denom;
      const u = (a[0] * dy - a[1] * dx) / denom;
      if (t > 0 && u >= -1e-6 && u <= 1 + 1e-6) return t;
    }
    return 1; // shouldn't happen for these star-shaped outlines
  }

  // The one stationary ring the character lives on: the exact same morphing
  // shape as the decorative tunnel (drawn via the shared drawRing()), still
  // rotating right along with everything else, but held at a single fixed
  // depth (baseRingZ) instead of receding — so it never moves and it's
  // obvious exactly where an approaching red hazard needs to be jumped
  // rather than the player having to guess the timing from the shape's
  // motion alone. A plain fixed-z/fixed-scale ring would only pass exactly
  // through the character while the tunnel happens to show a circle —
  // every other shape's outline sits nearer or farther from center
  // depending on the angle it's currently rotated to (a square's flat edge
  // vs. its corner, say). radiusAtAngle() measures that shape's actual
  // reach at the exact angle the character sits at, and scaling the whole
  // ring by its inverse keeps that one point locked exactly onto the
  // character at every rotation and every shape — the ring's overall size
  // breathes a little as it spins as the trade-off, but the character
  // always visibly stands right on its line. Drawn at full brightness
  // regardless of depth fog (skipDepthFade), since unlike a real ring it
  // isn't traveling through the fade zones.
  function drawBaseRing(rot, globalFade) {
    if (!gameActive || !baseRingZ) return;
    const pts = morphedPoints(morphStateAt(elapsed));
    const localAngle = anchorAngle - rot;
    const localR = Math.max(0.05, radiusAtAngle(pts, localAngle));
    const k = 1 / localR;
    const scaledPts = pts.map(p => [p[0] * k, p[1] * k]);
    drawRing({ z: baseRingZ }, scaledPts, rot, globalFade, 0, f => `rgba(255,255,255,${Math.min(1, 0.55 + f * 0.6)})`, true);
  }

  function drawCharacter() {
    if (!gameActive) return;
    const bodyY = anchorY + charY; // charY goes negative while airborne

    // Drop shadow: wide and solid when grounded, shrinks and fades as the
    // character gets higher — the same landing-timing cue Run 3 uses. A
    // dark fill alone disappears against this background, so it's paired
    // with a faint light rim to read as a distinct ground-contact ellipse.
    const liftT = Math.min(1, -charY / 46);
    const shadowW = CHAR_R * (1.9 - 0.95 * liftT);
    const shadowAlpha = 1 - 0.75 * liftT;
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 5, shadowW, shadowW * 0.34, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(5,6,10,${0.55 * shadowAlpha})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(166,174,188,${0.32 * shadowAlpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    if (flashT > 0) {
      ctx.beginPath();
      ctx.arc(anchorX, bodyY, CHAR_R * 2.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,59,59,${(flashT / 0.3) * 0.3})`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(anchorX, bodyY, CHAR_R, 0, Math.PI * 2);
    ctx.fillStyle = '#FA9D28';
    ctx.fill();
  }

  function initGame() {
    if (!gameOn) return;
    updateAnchor();
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        gameActive = entries[0].isIntersecting;
        runnerWrap.classList.toggle('is-active', gameActive);
        if (gameActive) updateAnchor();
      }, { threshold: 0.4 });
      io.observe(runnerWrap);
    } else {
      gameActive = true;
      runnerWrap.classList.add('is-active');
    }
    document.addEventListener('keydown', e => {
      if (!gameActive) return;
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
    });
    runnerWrap.addEventListener('pointerdown', jump);
    window.addEventListener('resize', updateAnchor);
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

  // Radiating spokes from the vanishing point out to the frame edge —
  // same gradient treatment as the site's original rail lines, but at
  // fixed angles around a circle instead of the 4 walls of a square, so
  // they still read as "flying through a tunnel" no matter which shape
  // the rings themselves currently are.
  function strokeSpoke(angle, rot, globalFade, hue) {
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const a = project(dx * A, dy * A, Z_FAR, rot);
    const b = project(dx * A, dy * A, Z_NEAR, rot);
    const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    grad.addColorStop(0, `hsla(${hue}, 70%, 55%, 0)`);
    grad.addColorStop(0.35, `hsla(${hue}, 70%, 55%, ${0.26 * globalFade})`);
    grad.addColorStop(1, `hsla(${hue + 30}, 85%, 65%, ${0.5 * globalFade})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  function drawRing(ring, unitPts, rot, globalFade, hue, colorFn, skipDepthFade) {
    const f = skipDepthFade ? globalFade : fadeFor(ring.z) * globalFade;
    if (f <= 0.01) return;
    ctx.strokeStyle = colorFn ? colorFn(f) : `hsla(${hue}, 72%, 62%, ${0.36 * f})`;
    ctx.lineWidth = colorFn ? 1.6 : 1.3;
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

  let raf, last = 0, elapsed = 0;

  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts; elapsed += dt;
    const rot = elapsed * ROT_SPEED;
    const globalFade = Math.min(1, elapsed / 3.2) * 0.85;
    const hue = (200 + elapsed * 6) % 360;

    // The ramp only progresses while the game is actually being played, so
    // the pace freezes (rather than resets) whenever the hero scrolls out
    // of view, and everything — decorative rings and hazards alike — moves
    // at this one shared, ramping speed.
    if (gameOn && gameActive) surviveTime += dt;
    const speed = gameOn ? currentSpeed() : BASE_SPEED;

    ctx.clearRect(0, 0, W, H);
    for (const a of SPOKES) strokeSpoke(a, rot, globalFade, hue);
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      r.z -= speed * dt;
      if (r.z < Z_NEAR) r.z += (Z_FAR - Z_NEAR);
      const pts = morphedPoints(morphStateAt(elapsed));
      drawRing(r, pts, rot, globalFade, (hue + i * 12) % 360);
    }

    if (gameOn) {
      updateGame(dt, rot, speed);
      for (const hz of hazards) drawHazard(hz, rot, globalFade);
      drawBaseRing(rot, globalFade);
      drawCharacter();
    }

    raf = requestAnimationFrame(frame);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    for (const a of SPOKES) strokeSpoke(a, 0, 0.6, 200);
    rings.forEach((r, i) => drawRing(r, RESAMPLED[SHAPES[0]], 0, 0.6, (200 + i * 12) % 360));
  }

  window.addEventListener('resize', size);
  size();
  initGame();

  if (reduceMotion) {
    drawStatic();
  } else {
    raf = requestAnimationFrame(frame);
  }
})();
