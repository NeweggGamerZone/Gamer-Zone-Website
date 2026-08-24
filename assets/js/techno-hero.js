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
   present): a character stands on a fixed white path under the hero's
   "Plan your visit" button and can move freely left/right along it at any
   time (Left/Right arrow keys, or press-and-hold on either half of the
   runner area on touch) while colored hazard bars — drawn with the same
   shape/hue treatment as the decorative tunnel, just hotter — stream
   toward the viewer alongside the normal rings, at the exact same speed.
   Each hazard only blocks part of the path's width (a lane), not the
   whole thing: stepping outside a hazard's lane clears it automatically,
   while standing inside one means an actual jump is required — so moving
   left/right is a real way to dodge, not just cosmetic, and a jump only
   "matters" when you're actually in a hazard's way.

   The path itself is deliberately NOT part of the morphing-shape tunnel
   geometry: earlier versions drew it as a slice of one of the tunnel's own
   rings (scaled so it always passed under the character), which meant its
   local curvature subtly shifted with every shape swap AND with scroll
   (the character's on-screen anchor — and thus the ring's required scale —
   moves as the page scrolls under this fixed-position canvas). That read
   as "the ground moving," which undercuts jump timing. The path here is
   just a flat horizontal line at the character's anchor point, redrawn
   there every frame — it never changes shape, curvature, or position
   beyond tracking the anchor itself, regardless of scroll or which shape
   the background tunnel is currently showing.

   Jump timing is exact and simple: the instant a hazard's depth reaches
   the character's fixed depth (hz.z <= baseRingZ), it's resolved — a hit
   if the character is outside the hazard's lane OR airborne, a miss if
   they're standing in the hazard's lane without jumping. Missing resets
   the current score AND the speed ramp back to base pace; the run keeps
   going and a best score persists via localStorage. The whole tunnel
   (rings, hazards alike) starts at a base pace and gradually speeds up the
   longer the player survives without a miss, capping out after a stretch
   of unbroken survival. Everything pauses (without resetting) whenever the
   hero scrolls out of view. Pure canvas math, no images. */
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
  let anchorX = 0, anchorY = 0; // fixed screen spot the path/character sit at
  let baseRingZ = 0; // fixed depth at which a hazard resolves (hit/miss)
  let surviveTime = 0; // seconds survived since the last miss — drives the speed ramp
  let charY = 0, vy = 0, jumping = false, flashT = 0;
  let charX = 0; // character's offset from anchorX along the path, [-PATH_HALF_W, PATH_HALF_W]
  let leftHeld = false, rightHeld = false;
  let hazards = [];
  let spawnTimer = 1.1;
  // Jump arc: peak height = JUMP_V^2 / (2*GRAVITY) ≈ 77px, sized to the
  // ~150px of headroom .hero-runner's CSS padding-top now reserves above
  // the character (see updateAnchor below) — enough clearance to read as
  // a real jump without flying up behind the "Plan your visit" button
  // that sits just above this canvas layer. (Previously a much smaller
  // ~50px peak in a ~66px pocket, which read as a cramped little hop —
  // both the arc and its headroom were enlarged together here.)
  const GRAVITY = 1500, JUMP_V = -480, CHAR_R = 13;
  // The fixed path the character moves along: half-width in screen px, and
  // how fast Left/Right movement covers it.
  const PATH_HALF_W = 120, MOVE_SPEED = 260;

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
    anchorY = r.top + 100; // lower in the reserved padding = a larger baseRingRadius = a nearer (smaller-z) baseline, i.e. visually closer to the camera. Leaves ~100px of headroom above for the jump arc (peak ~77px) and ~50px below before the score/hint text.
    // baseRingZ is the one fixed depth at which a hazard visually arrives
    // exactly at the anchor point (see hazardScreenPos below) — solved the
    // same way the tunnel's own rings scale with depth (A*(F/z)), just
    // anchored to the character's actual on-screen distance from the
    // vanishing point instead of the tunnel's nominal radius. This is
    // still what "reaches the character" means for hit-testing; it no
    // longer drives any drawn shape's curvature (see drawPath below).
    const dx = anchorX - cx, dy = anchorY - cy;
    const baseRingRadius = Math.hypot(dx, dy) || 1;
    baseRingZ = (A * F) / baseRingRadius;
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
    // Each hazard blocks one contiguous slice of the path's width, not the
    // whole thing — a random width between 45%-85% of the full path,
    // placed at a random position that still fits within it. Lanes are
    // fractions of PATH_HALF_W (-1..1); see hazardScreenPos below for how
    // that maps to an actual screen position as the hazard approaches.
    const w = 0.45 + Math.random() * 0.4;
    const start = -1 + Math.random() * (2 - w);
    // No shape of its own — colored/hued the same as the tunnel (see
    // drawHazard), so it reads as one of the background's own lines that
    // happens to be hotter, not a foreign game object.
    hazards.push({ z: Z_FAR, resolved: false, laneStart: start, laneEnd: start + w });
  }

  function updateGame(dt, rot, speed) {
    if (!gameActive) return;
    updateAnchor();

    if (jumping) {
      vy += GRAVITY * dt;
      charY += vy * dt;
      if (charY >= 0) { charY = 0; vy = 0; jumping = false; }
    }

    // Left/Right movement along the fixed path, at all times (not just
    // while jumping) — held continuously via keyboard or a touch/pointer
    // hold on either half of the runner area (see initGame).
    if (leftHeld) charX -= MOVE_SPEED * dt;
    if (rightHeld) charX += MOVE_SPEED * dt;
    charX = Math.max(-PATH_HALF_W + CHAR_R, Math.min(PATH_HALF_W - CHAR_R, charX));

    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawnHazard(); spawnTimer = 1.3 + Math.random() * 0.9; }

    // Same shared speed the decorative rings moved at this frame, and a
    // direct depth comparison against the character's fixed resolution
    // depth — the hit-test trigger fires the instant a hazard reaches that
    // depth, matching exactly what's drawn on screen (hazardScreenPos's
    // r(z)=1 case). A hazard only counts as blocking if the character's
    // current path position falls inside ITS lane; standing outside a
    // hazard's lane clears it automatically, whether airborne or not.
    for (const hz of hazards) {
      hz.z -= speed * dt;
      if (!hz.resolved && hz.z <= baseRingZ) {
        hz.resolved = true;
        const inLane = charX >= hz.laneStart * PATH_HALF_W && charX <= hz.laneEnd * PATH_HALF_W;
        const airborneEnough = -charY > CHAR_R * 2.6;
        if (!inLane || airborneEnough) onClear(); else onMiss();
      }
    }
    hazards = hazards.filter(hz => hz.z > Z_NEAR - 40);

    if (flashT > 0) flashT = Math.max(0, flashT - dt);
  }

  // Where a hazard sits on screen at its current depth: it approaches
  // along the same ray from the vanishing point (cx,cy) through the
  // character's anchor that every other receding ring in this tunnel
  // scales along, converging exactly onto the anchor at r=1 (z===baseRingZ)
  // — so it visually reads as part of the same perspective, but the path
  // it's measured against (see drawPath) is otherwise a plain fixed line,
  // not tied to this ray at all.
  function hazardScreenPos(z) {
    const dx = anchorX - cx, dy = anchorY - cy;
    const r = Math.min(1, baseRingZ / z);
    return { x: cx + dx * r, y: cy + dy * r, r, dx, dy };
  }

  // Drawn as a straight bar spanning its own lane (see spawnHazard),
  // hued/colored the same live way the decorative rings are so it reads as
  // one of the background's own lines, just hotter — but its shape is a
  // simple lane bar, not the tunnel's currently-morphed polygon, so it
  // never inherits that shape's curvature.
  function drawHazard(hz, rot, globalFade, hue) {
    const { x, y, r } = hazardScreenPos(hz.z);
    const halfW = PATH_HALF_W * r;
    const x1 = x + hz.laneStart * halfW, x2 = x + hz.laneEnd * halfW;
    const f = fadeFor(hz.z) * globalFade;
    if (f <= 0.01) return;
    ctx.strokeStyle = `hsla(${hue}, 88%, 58%, ${Math.min(1, f * 1.7)})`;
    ctx.lineWidth = 4 * Math.max(0.4, r);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
  }

  // The path the character stands on and moves along: a plain straight
  // horizontal line at the anchor's own screen position, redrawn there
  // every frame. Deliberately NOT derived from the tunnel's current
  // shape/rotation/depth math (that was the old drawBaseRing, removed) --
  // this line's position and length depend only on the anchor (which
  // itself only moves if the runner's real on-page position moves, e.g.
  // scroll), never on which shape the background happens to be showing.
  function drawPath(globalFade) {
    if (!gameActive) return;
    ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, 0.55 + globalFade * 0.6)})`;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(anchorX - PATH_HALF_W, anchorY);
    ctx.lineTo(anchorX + PATH_HALF_W, anchorY);
    ctx.stroke();
  }

  function drawCharacter() {
    if (!gameActive) return;
    const bodyX = anchorX + charX;
    const bodyY = anchorY + charY; // charY goes negative while airborne

    // Drop shadow: wide and solid when grounded, shrinks and fades as the
    // character gets higher — the same landing-timing cue Run 3 uses. A
    // dark fill alone disappears against this background, so it's paired
    // with a faint light rim to read as a distinct ground-contact ellipse.
    const liftT = Math.min(1, -charY / 70); // tuned to the ~77px jump peak so the shadow's shrink/fade tracks the whole arc, not just its first two-thirds
    const shadowW = CHAR_R * (1.9 - 0.95 * liftT);
    const shadowAlpha = 1 - 0.75 * liftT;
    ctx.beginPath();
    ctx.ellipse(bodyX, anchorY + 5, shadowW, shadowW * 0.34, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(5,6,10,${0.55 * shadowAlpha})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(166,174,188,${0.32 * shadowAlpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    if (flashT > 0) {
      ctx.beginPath();
      ctx.arc(bodyX, bodyY, CHAR_R * 2.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,59,59,${(flashT / 0.3) * 0.3})`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(bodyX, bodyY, CHAR_R, 0, Math.PI * 2);
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
      else if (e.code === 'ArrowLeft') { e.preventDefault(); leftHeld = true; }
      else if (e.code === 'ArrowRight') { e.preventDefault(); rightHeld = true; }
    });
    document.addEventListener('keyup', e => {
      if (e.code === 'ArrowLeft') leftHeld = false;
      else if (e.code === 'ArrowRight') rightHeld = false;
    });
    // Touch/mouse: a quick tap jumps (matching the original single-tap
    // behavior); holding down on either half of the runner area instead
    // moves the character continuously toward that side, so left/right
    // movement works without a keyboard. HOLD_MS is just long enough that
    // an ordinary tap-to-jump never accidentally registers as the start of
    // a hold.
    const HOLD_MS = 220;
    let pressT = 0, pressSide = 0, holding = false;
    runnerWrap.addEventListener('pointerdown', e => {
      pressT = performance.now();
      const r = runnerWrap.getBoundingClientRect();
      pressSide = (e.clientX - r.left) < r.width / 2 ? -1 : 1;
      holding = false;
      setTimeout(() => {
        if (performance.now() - pressT >= HOLD_MS - 5) {
          holding = true;
          if (pressSide < 0) leftHeld = true; else rightHeld = true;
        }
      }, HOLD_MS);
    });
    function releasePointer() {
      if (!holding) jump();
      holding = false; leftHeld = false; rightHeld = false;
    }
    runnerWrap.addEventListener('pointerup', releasePointer);
    runnerWrap.addEventListener('pointercancel', releasePointer);
    runnerWrap.addEventListener('pointerleave', releasePointer);
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
    strokeSpokes(rot, globalFade, hue);
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      r.z -= speed * dt;
      if (r.z < Z_NEAR) r.z += (Z_FAR - Z_NEAR);
      const pts = morphedPoints(morphStateAt(elapsed));
      drawRing(r, pts, rot, globalFade, (hue + i * 12) % 360);
    }

    if (gameOn) {
      updateGame(dt, rot, speed);
      for (const hz of hazards) drawHazard(hz, rot, globalFade, hue);
      drawPath(globalFade);
      drawCharacter();
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
  initGame();

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
