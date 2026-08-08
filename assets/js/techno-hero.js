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
   viewer alongside the normal rings. A character sits at a fixed screen
   position under the hero's "Plan your visit" button and must jump the
   instant a hazard's outline reaches it — same single-button jump-timing
   feel as Chrome's dino game, just staged inside this tunnel instead of a
   separate strip. Missing just resets the current score to zero and the
   run keeps going; a best score persists via localStorage. Everything
   pauses (without resetting) whenever the hero scrolls out of view. Pure
   canvas math, no images. */
(function () {
  const canvas = document.getElementById('techno-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W, H, DPR, cx, cy;
  const F = 300;
  const Z_NEAR = 60, Z_FAR = 1500;
  const SPEED = 92; // same travel pace the site's tunnel/cube previously settled on
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
  let charY = 0, vy = 0, jumping = false, flashT = 0;
  let hazards = [];
  let spawnTimer = 1.1;
  // Jump height is deliberately modest (~50px peak) — the character sits
  // close under the button, and a big leap would fly up behind it (the
  // button sits above this canvas layer and would hide the character
  // mid-jump). Keeping the arc short also keeps the timing snappy.
  const GRAVITY = 1500, JUMP_V = -390, CHAR_R = 10;
  const HAZARD_SPEED = 230;
  const HAZARD_SHAPES = ['square', 'triangle', 'star', 'pentagon', 'hexagon'];

  if (gameOn) { best = loadBest(); bestEl.textContent = String(best); }

  function updateAnchor() {
    const r = runnerWrap.getBoundingClientRect();
    anchorX = r.left + r.width / 2;
    anchorY = r.top + 52;
  }

  function jump() {
    if (!gameActive || jumping) return;
    jumping = true; vy = JUMP_V;
  }

  function onMiss() {
    score = 0; flashT = 0.3;
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
    const shape = HAZARD_SHAPES[Math.floor(Math.random() * HAZARD_SHAPES.length)];
    hazards.push({ z: Z_FAR, shape, resolved: false });
  }

  // The same project() used for every decorative ring point tells us
  // exactly where a hazard's "straight down from center" edge lands on
  // screen at its current depth — so the jump-timing trigger fires the
  // instant the shape visually reaches the character, not at some
  // unrelated fixed pixel line.
  function hazardReachY(z, rot) { return project(0, A, z, rot).y; }

  function updateGame(dt, rot) {
    if (!gameActive) return;
    updateAnchor();

    if (jumping) {
      vy += GRAVITY * dt;
      charY += vy * dt;
      if (charY >= 0) { charY = 0; vy = 0; jumping = false; }
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawnHazard(); spawnTimer = 1.3 + Math.random() * 0.9; }

    for (const hz of hazards) {
      hz.z -= HAZARD_SPEED * dt;
      if (!hz.resolved && hazardReachY(hz.z, rot) >= anchorY) {
        hz.resolved = true;
        const airborneEnough = -charY > CHAR_R * 2.6;
        if (airborneEnough) onClear(); else onMiss();
      }
    }
    hazards = hazards.filter(hz => hz.z > Z_NEAR - 40);

    if (flashT > 0) flashT = Math.max(0, flashT - dt);
  }

  function drawHazard(hz, rot) {
    const f = fadeFor(hz.z);
    if (f <= 0.01) return;
    const pts = RESAMPLED[hz.shape];
    const n = pts.length;
    const proj = new Array(n);
    for (let i = 0; i < n; i++) proj[i] = project(pts[i][0] * A, pts[i][1] * A, hz.z, rot);
    ctx.beginPath();
    let mid = { x: (proj[0].x + proj[1].x) / 2, y: (proj[0].y + proj[1].y) / 2 };
    ctx.moveTo(mid.x, mid.y);
    for (let i = 1; i <= n; i++) {
      const cur = proj[i % n];
      const next = proj[(i + 1) % n];
      const nextMid = { x: (cur.x + next.x) / 2, y: (cur.y + next.y) / 2 };
      ctx.quadraticCurveTo(cur.x, cur.y, nextMid.x, nextMid.y);
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(255,59,59,${0.16 * f})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255,64,64,${0.9 * f})`;
    ctx.lineWidth = 2.4;
    ctx.stroke();
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

  let raf, last = 0, elapsed = 0;

  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts; elapsed += dt;
    const rot = elapsed * ROT_SPEED;
    const globalFade = Math.min(1, elapsed / 3.2) * 0.85;
    const hue = (200 + elapsed * 6) % 360;

    ctx.clearRect(0, 0, W, H);
    for (const a of SPOKES) strokeSpoke(a, rot, globalFade, hue);
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      r.z -= SPEED * dt;
      if (r.z < Z_NEAR) r.z += (Z_FAR - Z_NEAR);
      const pts = morphedPoints(morphStateAt(elapsed));
      drawRing(r, pts, rot, globalFade, (hue + i * 12) % 360);
    }

    if (gameOn) {
      updateGame(dt, rot);
      for (const hz of hazards) drawHazard(hz, rot);
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
