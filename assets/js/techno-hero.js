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
   present): the "ground" is not a plain line but the tunnel's own
   currently-morphed shape (square/triangle/star/pentagon/hexagon/circle),
   traced in white at a fixed, generous radius around a fixed anchor point
   — so it visibly morphs in lockstep with the decorative rings behind it
   ("the full background shape that is ever changing"). The character is a
   ball that walks all the way around that shape's own perimeter —
   Left/Right arrow keys, or press-and-hold on either half of the hero on
   touch — rather than sliding along a short straight lane, so the whole
   loop is playable ground.

   2026-08-26 redesign (per Eric): the anchor is the dead center of
   .hero-stack — the "GET IN / THE ZONE" heading — not a point lower in
   the hero, so the heading text visibly sits at the center of the shape
   the character runs around (the shape is already behind the heading via
   z-index; only its on-screen position changed). The anchor is
   recalculated every frame straight from .hero-stack's real
   getBoundingClientRect(), so it naturally scrolls with the page exactly
   like the heading does — but PATH_RADIUS (the shape's actual size) is
   only ever recomputed on resize (see sizeGame()), never from scroll
   position, so the shape's SCALE stays constant while scrolling; only its
   screen position tracks the heading. As the hero scrolls out of view, a
   continuous scroll-driven opacity (computeHeroFade(), 0..1 — not a
   binary IntersectionObserver on/off) fades the shape, character, and
   hazards out together, so "the game fades" reads as one smooth hero
   page rather than a hard cut. Every draw call is gated on that same
   fade value being above a tiny floor, which is also what fixed a real
   bug: the old binary approach kept drawing the game's last frozen frame
   at its last on-screen position even once scrolled well past the hero
   (stray orange hazard-arc lines appearing over unrelated page content
   below) — computing position and fade fresh, from real layout, every
   single frame regardless of visibility, means there's no stale frozen
   state left over to render.

   One of the background tunnel's own rings periodically turns hazardous:
   as it streams toward the viewer alongside the normal rings (same speed,
   same shape, just recolored orange over an arc of its own perimeter
   instead of the rainbow tunnel hue), only that arc-length slice of the
   loop is actually dangerous. Being anywhere else on the ring when it
   reaches the character's ground is a free clear — moving around the
   shape is a real way to dodge, not just cosmetic — while standing inside
   that orange arc means an actual jump is required.

   The ground shape's radius and position are fixed relative to the
   character's on-screen anchor (which only moves if the runner's real
   on-page position moves, e.g. scroll) — never derived from the tunnel's
   vanishing-point perspective math the way the decorative rings are. So
   the loop's size and center stay put; only its silhouette morphs, on the
   exact same cycle as the background.

   Jump timing is exact and simple: the instant a hazard ring's depth
   reaches the character's fixed depth (hz.z <= baseRingZ), it's resolved —
   a hit if the character's position on the loop is outside the hazard's
   orange arc OR they're airborne, a miss if they're standing inside that
   arc without jumping. Missing resets the current score AND the speed
   ramp back to base pace; the run keeps going and a best score persists
   via localStorage. The whole tunnel (rings, hazards alike) starts at a
   base pace and gradually speeds up the longer the player survives
   without a miss, capping out after a stretch of unbroken survival.
   Everything pauses (without resetting) whenever the hero scrolls out of
   view. Pure canvas math, no images. */
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
    sizeGame();
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
  const zoneEl = document.getElementById('hr-zone-val');
  const heroStackEl = document.querySelector('.hero-stack');
  const heroStageEl = document.querySelector('.hero-stage');
  const gameOn = !!(runnerWrap && scoreEl && bestEl && heroStackEl && !reduceMotion);

  const HS_KEY = 'gzHeroRunnerBest';
  function loadBest() { try { return parseInt(localStorage.getItem(HS_KEY), 10) || 0; } catch { return 0; } }
  function saveBest(v) { try { localStorage.setItem(HS_KEY, String(v)); } catch { /* private mode etc — fine to skip */ } }

  // 2026-08-28: ties the abstract dodge-a-hazard mechanic to the real
  // venue, per Eric's feedback that the hero game on its own doesn't
  // communicate "this is a real place." Each hazard is now labeled (in
  // the real, accessible HUD text below -- see zoneEl -- not drawn onto
  // the canvas itself) with one of the site's own real zone names,
  // exact same names/wording as About Gamer Zone's zone-stack cards
  // (index.html) -- no new or invented copy. Cycled in order rather than
  // randomly so a player sees a fair, even rotation across all five
  // rather than a random skew toward whichever the RNG favors this run.
  const ZONES = ['PC Gaming Zone', 'Racing & Immersive Zone', 'VR & Mixed Reality Zone', 'Console Gaming Zone', 'Broadcast'];
  let zoneCycleIdx = 0;
  // Deliberately a plain, un-animated text/class swap (no fade-in/out) --
  // an opacity or visibility transition here would risk the exact bug
  // the pin-node collision-avoidance fix (see CLAUDE.md's "Preregister
  // button" note) just had to work around: a contrast-audit screenshot
  // landing mid-transition and sampling a half-faded, technically-still-
  // there text node. This text is either fully present or (before the
  // first hazard resolves) not there at all -- nothing in between.
  function announceZone(zone, result) {
    if (!zoneEl) return;
    zoneEl.textContent = result === 'clear' ? `Cleared: ${zone}` : `Missed: ${zone}`;
    zoneEl.classList.toggle('is-clear', result === 'clear');
    zoneEl.classList.toggle('is-miss', result === 'miss');
  }

  let score = 0, best = 0;
  let gameActive = false; // derived every frame from heroFade — true while the hero is substantially on screen
  let heroFade = 1; // 0..1, continuous — how visible/active the game should be, driven by scroll position (see computeHeroFade)
  let anchorX = 0, anchorY = 0; // screen spot the ground shape/character are centered on — the center of .hero-stack, recomputed every frame
  let baseRingZ = 0; // fixed depth at which a hazard resolves (hit/miss)
  let surviveTime = 0; // seconds survived since the last miss — drives the speed ramp
  let charY = 0, vy = 0, jumping = false, flashT = 0;
  let charT = 0.25; // character's position around the ground shape's perimeter, a fraction 0..1 (wraps)
  let leftHeld = false, rightHeld = false;
  let hazards = [];
  let spawnTimer = 1.1;
  // Jump arc: peak height = JUMP_V^2 / (2*GRAVITY) ≈ 77px — just needs to
  // clear a hazard arc's line width, not the whole ground shape, so this
  // stays a quick hop regardless of how big the ground shape itself is.
  const GRAVITY = 1500, JUMP_V = -480, CHAR_R = 13;
  // The ground shape's on-screen radius, and how fast Left/Right movement
  // carries the character around its full perimeter (a fraction of the
  // loop per second). PATH_RADIUS/JUMP_CLEAR are recomputed from the
  // actual viewport height on every resize (see sizeGame() below) instead
  // of being fixed constants — this is what keeps the shape's SCALE
  // resize-driven only, never scroll-driven (Eric: "scrolling does not
  // effect the size and scale of the white shape").
  //
  // Sized (2026-08-26) so the ground shape reads at the same visual scale
  // as the big decorative tunnel rings passing through the hero text —
  // both PATH_RADIUS and the rings' own radius A are proportional to the
  // same underlying `A = max(W,H)*0.72` constant (see size() above), so
  // they can't drift out of sync with each other, clamped so it can't
  // balloon on an ultra-wide monitor or shrink below playable on a short
  // mobile viewport. The shape's SIZE never changes with scroll — only its
  // on-screen POSITION does, tracking .hero-stack's real position every
  // frame (see updateAnchor below) so the heading stays at its center as
  // the page scrolls, same as the heading itself would.
  let PATH_RADIUS = 210, JUMP_CLEAR = 90;
  const ANGLE_SPEED = 0.3;
  function sizeGame() {
    PATH_RADIUS = Math.max(150, Math.min(430, A * 0.4));
    JUMP_CLEAR = Math.max(50, Math.min(150, PATH_RADIUS * 0.34));
    // 2026-08-26: this used to also write .hero-runner's padding-top every
    // resize, reserving blank page space below the button for the shape to
    // occupy. Now that the shape is anchored to .hero-stack's own center
    // (see updateAnchor below) instead of living in dedicated space of its
    // own, nothing needs reserving -- the shape renders on the fixed
    // background canvas, already behind the heading via z-index. sizeGame()
    // still only runs on resize/init (never per-frame) since it's the one
    // place PATH_RADIUS/JUMP_CLEAR themselves get recomputed, which is what
    // keeps the shape's on-screen SCALE stable across scroll (scroll only
    // ever moves the anchor point via updateAnchor's per-frame read, it
    // never touches these).
  }

  if (gameOn) { best = loadBest(); bestEl.textContent = String(best); }

  // Shared pace for every moving piece (decorative rings + hazards alike):
  // starts at BASE_SPEED and ramps linearly up to MAX_SPEED the longer the
  // player survives without a miss, capping out after RAMP_SECONDS.
  function currentSpeed() {
    const t = Math.min(1, surviveTime / RAMP_SECONDS);
    return BASE_SPEED + (MAX_SPEED - BASE_SPEED) * t;
  }

  function updateAnchor() {
    // Runs every single frame regardless of visibility -- this is a pure
    // layout READ (getBoundingClientRect), never a write, so it's cheap
    // and doesn't cause the layout-thrashing a per-frame style WRITE would
    // (see sizeGame() above for the one-time-per-resize writes instead).
    // Reading fresh every frame -- rather than only while some binary
    // "active" flag was true -- is also what fixes the old stale-artifact
    // bug: there's never a frozen anchor left over from before a scroll.
    const r = heroStackEl.getBoundingClientRect();
    anchorX = r.left + r.width / 2;
    // 2026-08-26 (per Eric: "move the white shape down by 15%"): offset the
    // anchor 15% of the viewport height below the heading's true center,
    // rather than sitting exactly on it. Sized off H (the canvas viewport
    // height, recomputed in size() on resize) rather than a fixed pixel
    // value or PATH_RADIUS, so the shift scales consistently across screen
    // sizes the same way every other size in this file already does, and
    // stays resize-driven, never scroll-driven (same rule sizeGame() above
    // already follows). This moves the whole game (ground shape, character,
    // hazards) down together, since all of it is anchored off anchorY.
    anchorY = r.top + r.height / 2 + H * 0.15;
    // baseRingZ is the one fixed depth at which a hazard ring visually
    // arrives exactly at the anchor point (see hazardScreenPos below) —
    // solved the same way the tunnel's own rings scale with depth
    // (A*(F/z)), just anchored to the character's actual on-screen
    // distance from the vanishing point instead of the tunnel's nominal
    // radius. This is still what "reaches the character" means for
    // hit-testing; it no longer drives the ground shape's own size (that's
    // the fixed PATH_RADIUS instead — see drawPath below).
    const dx = anchorX - cx, dy = anchorY - cy;
    const baseRingRadius = Math.hypot(dx, dy) || 1;
    baseRingZ = (A * F) / baseRingRadius;
  }

  // Continuous 0..1 visibility/activity level for the whole hero game,
  // driven by how far .hero-stage has scrolled past the top of the
  // viewport -- NOT a binary IntersectionObserver on/off. Fully 1 while
  // the hero's bottom edge is comfortably below the viewport top; ramps
  // smoothly to 0 as that bottom edge approaches and then passes above the
  // viewport top, so the shape/character/hazards all fade out together as
  // "the game fades" (Eric's spec) rather than snapping off. Read every
  // frame alongside updateAnchor -- same cheap-read, no-write rule.
  const FADE_ZONE = 0.4; // fraction of viewport height the fade ramps over
  function computeHeroFade() {
    const r = heroStageEl.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    const zone = Math.max(1, vh * FADE_ZONE);
    return Math.max(0, Math.min(1, r.bottom / zone));
  }

  // Interpolated position at fraction t (0..1, wraps) around a closed,
  // evenly-arc-length-resampled point loop — used both to place the
  // character on the ground shape's own perimeter and to trace a hazard
  // ring's dangerous arc, so both read as genuinely part of that same
  // morphing outline rather than a separate straight-line abstraction.
  function pointAtT(pts, t) {
    const n = pts.length;
    const tt = ((t % 1) + 1) % 1;
    const f = tt * n;
    const i0 = Math.floor(f) % n, i1 = (i0 + 1) % n, frac = f - Math.floor(f);
    return [
      pts[i0][0] + (pts[i1][0] - pts[i0][0]) * frac,
      pts[i0][1] + (pts[i1][1] - pts[i0][1]) * frac,
    ];
  }

  // A short run of interpolated points spanning [start, start+width) of the
  // loop (wrapping past 1 as needed) — the actual arc a hazard ring draws
  // and hit-tests against.
  function sampleArc(pts, start, width, segments = 22) {
    const out = new Array(segments + 1);
    for (let i = 0; i <= segments; i++) out[i] = pointAtT(pts, start + width * (i / segments));
    return out;
  }

  // Is loop-position t inside the wrapping arc [start, start+width)?
  function inArc(t, start, width) {
    let d = t - start;
    d = ((d % 1) + 1) % 1;
    return d < width;
  }

  function jump() {
    if (!gameActive || jumping) return;
    jumping = true; vy = JUMP_V;
  }

  function onMiss(zone) {
    score = 0; flashT = 0.3; surviveTime = 0;
    scoreEl.textContent = '0';
    announceZone(zone, 'miss');
  }
  function onClear(zone) {
    score += 1;
    best = Math.max(best, score);
    scoreEl.textContent = String(score);
    bestEl.textContent = String(best);
    saveBest(best);
    announceZone(zone, 'clear');
  }

  function spawnHazard() {
    // Each hazard is a contiguous arc of the ground shape's own perimeter —
    // a random width between 14%-32% of the full loop, at a random start
    // position — not the whole ring, so standing anywhere else on the loop
    // when it arrives is a free clear. arcStart/arcWidth are fractions of
    // the loop (0..1); see sampleArc/inArc above and hazardScreenPos below
    // for how that maps to an actual screen position as it approaches.
    const width = 0.14 + Math.random() * 0.18;
    const start = Math.random();
    const zone = ZONES[zoneCycleIdx % ZONES.length];
    zoneCycleIdx++;
    hazards.push({ z: Z_FAR, resolved: false, arcStart: start, arcWidth: width, zone });
  }

  function updateGame(dt, rot, speed) {
    // NOTE: anchor + heroFade are computed once per frame in frame() itself
    // (unconditionally, so they never go stale) and gate whether this
    // function is even called -- see frame() below.
    if (jumping) {
      vy += GRAVITY * dt;
      charY += vy * dt;
      if (charY >= 0) { charY = 0; vy = 0; jumping = false; }
    }

    // Left/Right movement carries the character around the ground shape's
    // full perimeter, at all times (not just while jumping) — held
    // continuously via keyboard or a touch/pointer hold on either half of
    // the runner area (see initGame). The loop wraps, so there's no edge
    // to run out of room against.
    if (leftHeld) charT -= ANGLE_SPEED * dt;
    if (rightHeld) charT += ANGLE_SPEED * dt;
    charT = ((charT % 1) + 1) % 1;

    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawnHazard(); spawnTimer = 1.3 + Math.random() * 0.9; }

    // Same shared speed the decorative rings moved at this frame, and a
    // direct depth comparison against the character's fixed resolution
    // depth — the hit-test trigger fires the instant a hazard ring reaches
    // that depth, matching exactly what's drawn on screen (hazardScreenPos's
    // r(z)=1 case). A hazard only counts as blocking if the character's
    // current position on the loop falls inside ITS orange arc; standing
    // anywhere else on the loop clears it automatically, whether airborne
    // or not.
    for (const hz of hazards) {
      hz.z -= speed * dt;
      if (!hz.resolved && hz.z <= baseRingZ) {
        hz.resolved = true;
        const airborneEnough = -charY > CHAR_R * 2.6;
        if (!inArc(charT, hz.arcStart, hz.arcWidth) || airborneEnough) onClear(hz.zone); else onMiss(hz.zone);
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

  // Drawn as an arc of the SAME currently-morphed shape as the ground path
  // and the decorative tunnel rings (see sampleArc/pts) — so it reads as
  // literally one of the background's own lines, just recolored orange
  // over the dangerous stretch of its perimeter, converging toward the
  // anchor along the same vanishing-point ray every other receding ring
  // uses (hazardScreenPos), scaled down to a point and growing to full
  // PATH_RADIUS size as it arrives.
  function drawHazard(hz, pts, globalFade, heroFadeNow) {
    if (heroFadeNow <= 0.01) return; // nothing to draw once fully scrolled past -- avoids the old stale-artifact bug
    const { x, y, r } = hazardScreenPos(hz.z);
    const f = fadeFor(hz.z) * globalFade;
    if (f <= 0.01) return;
    const R = PATH_RADIUS * Math.max(r, 0.02);
    const arcPts = sampleArc(pts, hz.arcStart, hz.arcWidth);
    ctx.save();
    ctx.globalAlpha = heroFadeNow;
    ctx.strokeStyle = `hsla(28, 92%, 58%, ${Math.min(1, f * 1.7)})`;
    ctx.lineWidth = 5 * Math.max(0.4, r);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    arcPts.forEach((p, i) => {
      const sx = x + p[0] * R, sy = y + p[1] * R;
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    });
    ctx.stroke();
    ctx.restore();
  }

  // The ground the character walks on: the tunnel's own currently-morphed
  // shape, traced in white at a fixed radius/center on the anchor. Its
  // silhouette morphs on the exact same cycle as the decorative rings
  // (same `pts`, passed in from frame() below), but its size and position
  // depend only on the anchor and PATH_RADIUS — never on scroll or the
  // tunnel's vanishing-point perspective — so the loop itself never drifts
  // or rescales underfoot, only its shape changes.
  function drawPath(pts, globalFade, heroFadeNow) {
    if (heroFadeNow <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = heroFadeNow;
    ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, 0.55 + globalFade * 0.6)})`;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const n = pts.length;
    ctx.beginPath();
    let mid = { x: anchorX + (pts[0][0] + pts[1][0]) / 2 * PATH_RADIUS, y: anchorY + (pts[0][1] + pts[1][1]) / 2 * PATH_RADIUS };
    ctx.moveTo(mid.x, mid.y);
    for (let i = 1; i <= n; i++) {
      const cur = pts[i % n], next = pts[(i + 1) % n];
      const curPx = { x: anchorX + cur[0] * PATH_RADIUS, y: anchorY + cur[1] * PATH_RADIUS };
      const nextMid = { x: anchorX + (cur[0] + next[0]) / 2 * PATH_RADIUS, y: anchorY + (cur[1] + next[1]) / 2 * PATH_RADIUS };
      ctx.quadraticCurveTo(curPx.x, curPx.y, nextMid.x, nextMid.y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function drawCharacter(pts, heroFadeNow) {
    if (heroFadeNow <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = heroFadeNow;
    const p = pointAtT(pts, charT);
    const groundX = anchorX + p[0] * PATH_RADIUS, groundY = anchorY + p[1] * PATH_RADIUS;
    const bodyX = groundX;
    const bodyY = groundY + charY; // charY goes negative while airborne

    // Drop shadow: wide and solid when grounded, shrinks and fades as the
    // character gets higher — the same landing-timing cue Run 3 uses. A
    // dark fill alone disappears against this background, so it's paired
    // with a faint light rim to read as a distinct ground-contact ellipse.
    // Anchored to the actual ground point on the shape's perimeter (groundY)
    // rather than a fixed line, since the ground itself is no longer flat.
    const liftT = Math.min(1, -charY / 70); // tuned to the ~77px jump peak so the shadow's shrink/fade tracks the whole arc, not just its first two-thirds
    const shadowW = CHAR_R * (1.9 - 0.95 * liftT);
    const shadowAlpha = 1 - 0.75 * liftT;
    ctx.beginPath();
    ctx.ellipse(groundX, groundY + 5, shadowW, shadowW * 0.34, 0, 0, Math.PI * 2);
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
    ctx.restore();
  }

  function initGame() {
    if (!gameOn) return;
    updateAnchor();
    // gameActive/heroFade are no longer driven by an IntersectionObserver —
    // frame() recomputes both, continuously, every animation frame (see
    // computeHeroFade above). That's what lets the game fade smoothly
    // instead of snapping on/off, and it's what fixed the stale-artifact
    // bug (nothing is ever left stale to redraw).
    // WASD and Arrow keys only, both bound to the exact same movement
    // logic (held Left/A or Right/D carries the character around the
    // loop at ANGLE_SPEED, same as before) -- no other keyboard scheme.
    document.addEventListener('keydown', e => {
      if (!gameActive) return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); jump(); }
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); leftHeld = true; }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); rightHeld = true; }
    });
    document.addEventListener('keyup', e => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') leftHeld = false;
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') rightHeld = false;
    });
    // Touch/mouse: a quick tap jumps (matching the original single-tap
    // behavior); holding down on either half of the hero instead moves the
    // character continuously toward that side, so left/right movement
    // works without a keyboard. HOLD_MS is just long enough that an
    // ordinary tap-to-jump never accidentally registers as the start of a
    // hold.
    // 2026-08-26: the hit-region moved from the small #hero-runner box
    // (which used to sit well below the button, where the shape used to
    // live) to the whole .hero-stage -- the shape/character now render
    // centered on the heading, near the TOP of the hero, so that's where
    // players will naturally tap/hold. Clicks on a real link/button inside
    // the hero (the "Plan your visit" CTA) are explicitly excluded so the
    // game never hijacks that tap.
    const HOLD_MS = 220;
    let pressT = 0, pressSide = 0, holding = false;
    const stage = heroStageEl || runnerWrap;
    function isInteractiveTarget(e) {
      return !!(e.target.closest && e.target.closest('a, button'));
    }
    stage.addEventListener('pointerdown', e => {
      if (isInteractiveTarget(e)) return;
      pressT = performance.now();
      const r = stage.getBoundingClientRect();
      pressSide = (e.clientX - r.left) < r.width / 2 ? -1 : 1;
      holding = false;
      setTimeout(() => {
        if (performance.now() - pressT >= HOLD_MS - 5) {
          holding = true;
          if (pressSide < 0) leftHeld = true; else rightHeld = true;
        }
      }, HOLD_MS);
    });
    function releasePointer(e) {
      if (isInteractiveTarget(e)) return;
      if (!holding) jump();
      holding = false; leftHeld = false; rightHeld = false;
    }
    // Bound to window (not the stage) for up/cancel so a hold that drags
    // off the hero before releasing still cleanly stops movement.
    window.addEventListener('pointerup', releasePointer);
    window.addEventListener('pointercancel', releasePointer);
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

    // Anchor position and hero visibility are recomputed fresh from real
    // layout every single frame, unconditionally -- never gated behind a
    // binary "active" flag -- so there's never a stale/frozen position or
    // fade level left over to draw once the hero has scrolled away. This is
    // the direct fix for the old bug where hazard-arc lines kept rendering
    // at a frozen screen position after scrolling well past the hero.
    if (gameOn) { updateAnchor(); heroFade = computeHeroFade(); gameActive = heroFade > 0.05; }

    // The ramp only progresses while the game is substantially on screen, so
    // the pace freezes (rather than resets) whenever the hero scrolls out
    // of view, and everything — decorative rings and hazards alike — moves
    // at this one shared, ramping speed.
    if (gameOn && gameActive) surviveTime += dt;
    const speed = gameOn ? currentSpeed() : BASE_SPEED;

    const pts = morphedPoints(morphStateAt(elapsed));

    ctx.clearRect(0, 0, W, H);
    strokeSpokes(rot, globalFade, hue);
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      r.z -= speed * dt;
      if (r.z < Z_NEAR) r.z += (Z_FAR - Z_NEAR);
      drawRing(r, pts, rot, globalFade, (hue + i * 12) % 360);
    }

    if (gameOn) {
      if (gameActive) updateGame(dt, rot, speed);
      for (const hz of hazards) drawHazard(hz, pts, globalFade, heroFade);
      drawPath(pts, globalFade, heroFade);
      drawCharacter(pts, heroFade);
      // Score readout under the button fades on the exact same continuous
      // curve as the canvas-drawn shape/character (no separate CSS
      // transition to keep hand-tuned in sync with it) -- opacity is a
      // compositor-only property, so writing it every frame doesn't force
      // a layout recalc the way a size/position write would.
      runnerWrap.style.opacity = String(heroFade);
      runnerWrap.style.pointerEvents = heroFade > 0.5 ? 'auto' : 'none';
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
