/* Homepage-only fixed background: a purely decorative rotating perspective
   grid tunnel — the "spiraling squares" the site is themed around — plus a
   small ambient cube walker attached directly to one of this same tunnel's
   own rail lines. The cube, its obstacles, and the grid all share the exact
   same project()/fadeFor() math and the same 92/dt travel speed, so the
   cube reads as literally part of the grid rather than a separate overlay
   on top of it. No score, no input, no game logic here — purely decorative,
   for now. Pure canvas math, no images. */
(function () {
  const canvas = document.getElementById('techno-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W, H, DPR, cx, cy;
  const F = 300;
  const Z_NEAR = 60, Z_FAR = 1500;
  let A, B;
  let rings = [];
  const ROT_SPEED = 0.045;
  // Denser fan of rail lines radiating from the vanishing point out to the
  // frame edge — more spokes than before so the grid's own dimensionality
  // (floor/ceiling/left/right all converging on one center point) reads
  // clearly, not just the receding square rings.
  const STOPS = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1];

  let CUBE_HALF = 24;
  // The cube rides the same u=0 floor line strokeRail draws, but at a
  // shorter reach than the rail's own full length — the far end of that
  // line (out at y=B) crosses off the bottom of the frame almost right
  // away from the camera's perspective, same as the rail itself does, so
  // anchoring the cube there would leave it visible for only a sliver of
  // its lap. Riding in at CUBE_LINE_FRAC of the rail's length keeps it
  // on the exact same line/direction (still reads as attached to it) while
  // staying on-screen for most of the approach.
  const CUBE_LINE_FRAC = 0.7;
  let CUBE_LINE_Y = 0;

  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx = W / 2; cy = H / 2;
    A = Math.max(W, H) * 0.72; B = A;
    CUBE_HALF = Math.max(16, Math.min(H * 0.045, 30));
    CUBE_LINE_Y = B * CUBE_LINE_FRAC;
    buildRings();
  }

  function buildRings() {
    rings = [];
    const count = 9;
    for (let i = 0; i < count; i++) rings.push({ z: Z_NEAR + (i / count) * (Z_FAR - Z_NEAR) });
  }

  function project(x, y, z, rot) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const rx = x * c - y * s, ry = x * s + y * c;
    const sc = F / z;
    return { x: cx + rx * sc, y: cy + ry * sc, s: sc };
  }

  function wallPoint(wall, u, v) {
    if (wall === 'floor') return { x: u * A, y: B };
    if (wall === 'ceiling') return { x: u * A, y: -B };
    if (wall === 'left') return { x: -A, y: v * B };
    return { x: A, y: v * B };
  }

  function fadeFor(z) {
    const nearFade = Math.min(1, (z - Z_NEAR) / 320);
    const farFade = Math.min(1, (Z_FAR - z) / 820);
    return Math.max(0, Math.min(1, nearFade * farFade));
  }

  function strokeRail(wall, u, v, rot, globalFade, hue) {
    const w1 = wallPoint(wall, u, v);
    const a = project(w1.x, w1.y, Z_FAR, rot);
    const b = project(w1.x, w1.y, Z_NEAR, rot);
    const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    grad.addColorStop(0, `hsla(${hue}, 70%, 55%, 0)`);
    grad.addColorStop(0.35, `hsla(${hue}, 70%, 55%, ${0.3 * globalFade})`);
    grad.addColorStop(1, `hsla(${hue + 30}, 85%, 65%, ${0.58 * globalFade})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  function ringPts(z, rot) {
    return [[-A, -B], [A, -B], [A, B], [-A, B]].map(([x, y]) => project(x, y, z, rot));
  }

  function drawRing(z, rot, globalFade) {
    const f = fadeFor(z) * globalFade;
    if (f <= 0.01) return;
    const pts = ringPts(z, rot);
    ctx.strokeStyle = `rgba(138,180,237,${0.32 * f})`;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.stroke();
  }

  // ============================================================
  //  Ambient cube walker — attached to the center floor rail (the
  //  same u=0 line strokeRail already draws, from vanishing point out
  //  to the bottom-center edge — see CUBE_LINE_Y above for why it rides
  //  in at a shorter reach along that same line). One face of the cube
  //  sits flush against that line, and it slides along it from
  //  Z_FAR to Z_NEAR at the exact same 92/dt pace as the rings above,
  //  recycling back to Z_FAR just like they do. Obstacles/platforms
  //  sit ahead of it on that same line, pointing inward toward the
  //  tunnel's center, and fade in using the exact same
  //  fadeFor()*globalFade curve as the grid lines themselves — so
  //  everything appears in step, together. No score, no input.
  // ============================================================
  let cubeZ = Z_FAR;
  let cubeObstacles = [];
  let cubeY = 0, cubeVy = 0, cubeJumping = false;
  const CUBE_GRAVITY = 2600, CUBE_JUMP_V = 560;
  const CUBE_SPEED = 92;

  function spawnCubeObstacles() {
    cubeObstacles = [];
    const count = 2 + Math.floor(Math.random() * 3);
    const used = [];
    let tries = 0;
    while (used.length < count && tries < 40) {
      tries++;
      const z = Z_NEAR + 150 + Math.random() * (Z_FAR - Z_NEAR - 320);
      if (used.some(u => Math.abs(u - z) < 110)) continue;
      used.push(z);
    }
    used.forEach((z, i) => cubeObstacles.push({ z, kind: i % 2 === 0 ? 'spike' : 'platform', jumped: false }));
  }
  spawnCubeObstacles();

  function updateCube(dt) {
    cubeZ -= CUBE_SPEED * dt;
    if (cubeZ <= Z_NEAR) {
      cubeZ = Z_FAR; cubeY = 0; cubeVy = 0; cubeJumping = false;
      spawnCubeObstacles();
    }
    // Auto-hop timed so the jump's apex lines up with each obstacle's own
    // position on the line — a fixed animation, not a reaction to input.
    const JUMP_LEAD = 24;
    for (const o of cubeObstacles) {
      if (!o.jumped && cubeZ <= o.z + JUMP_LEAD) {
        o.jumped = true;
        cubeJumping = true; cubeVy = CUBE_JUMP_V;
      }
    }
    cubeVy -= CUBE_GRAVITY * dt;
    cubeY += cubeVy * dt;
    if (cubeY <= 0 && cubeVy <= 0) { cubeY = 0; cubeVy = 0; cubeJumping = false; }
  }

  // Obstacles always point "inward" (toward -y, up into the tunnel's
  // center/vanishing point) since they live on the fixed floor rail —
  // no need to compute an outward direction, it's always the same way.
  function drawCubeObstacle(o, rot, globalFade) {
    const f = fadeFor(o.z) * globalFade;
    if (f <= 0.02) return;
    const push = CUBE_HALF * (o.kind === 'platform' ? 2.4 : 3.4);
    const baseA = project(-CUBE_HALF * 1.15, CUBE_LINE_Y, o.z, rot);
    const baseB = project(CUBE_HALF * 1.15, CUBE_LINE_Y, o.z, rot);
    ctx.save();
    ctx.globalAlpha = f;
    if (o.kind === 'spike') {
      const tip = project(0, CUBE_LINE_Y - push, o.z, rot);
      ctx.fillStyle = 'rgba(255,150,40,.9)';
      ctx.shadowColor = 'rgba(255,140,40,.85)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(baseA.x, baseA.y); ctx.lineTo(tip.x, tip.y); ctx.lineTo(baseB.x, baseB.y);
      ctx.closePath(); ctx.fill();
    } else {
      const topA = project(-CUBE_HALF * 1.15, CUBE_LINE_Y - push, o.z, rot);
      const topB = project(CUBE_HALF * 1.15, CUBE_LINE_Y - push, o.z, rot);
      ctx.fillStyle = 'rgba(120,220,255,.75)';
      ctx.strokeStyle = 'rgba(200,240,255,.9)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(baseA.x, baseA.y); ctx.lineTo(topA.x, topA.y); ctx.lineTo(topB.x, topB.y); ctx.lineTo(baseB.x, baseB.y);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  // A simple flat-shaded cube: front face flush against the floor rail's
  // own y=B, a lighter top face and darker right-side face faked by
  // projecting the same local x/y at a slightly deeper z (same trick as
  // the perspective grid itself uses to suggest depth).
  function drawCube(rot, globalFade) {
    const f = fadeFor(cubeZ) * globalFade;
    if (f <= 0.02) return;
    const liftLocal = cubeY * (cubeZ / F);
    const yTop = CUBE_LINE_Y - liftLocal - CUBE_HALF * 2;
    const yBot = CUBE_LINE_Y - liftLocal;
    const backZ = cubeZ + CUBE_HALF * 3.2;
    // Front face corners (flush against the rail at cubeZ — this is the
    // "side attached to the grid line").
    const flTop = project(-CUBE_HALF, yTop, cubeZ, rot), frTop = project(CUBE_HALF, yTop, cubeZ, rot);
    const flBot = project(-CUBE_HALF, yBot, cubeZ, rot), frBot = project(CUBE_HALF, yBot, cubeZ, rot);
    // Back corners (same local x/y, projected slightly deeper) fake the
    // top and right-side faces receding away from the viewer.
    const blTop = project(-CUBE_HALF, yTop, backZ, rot), brTop = project(CUBE_HALF, yTop, backZ, rot);
    const brBot = project(CUBE_HALF, yBot, backZ, rot);
    ctx.save();
    ctx.globalAlpha = f;
    // top face
    ctx.fillStyle = 'rgba(160,210,255,.95)';
    ctx.beginPath();
    ctx.moveTo(flTop.x, flTop.y); ctx.lineTo(frTop.x, frTop.y); ctx.lineTo(brTop.x, brTop.y); ctx.lineTo(blTop.x, blTop.y);
    ctx.closePath(); ctx.fill();
    // right-side face
    ctx.fillStyle = 'rgba(40,110,210,.95)';
    ctx.beginPath();
    ctx.moveTo(frTop.x, frTop.y); ctx.lineTo(frBot.x, frBot.y); ctx.lineTo(brBot.x, brBot.y); ctx.lineTo(brTop.x, brTop.y);
    ctx.closePath(); ctx.fill();
    // front face — the one flush against the grid line
    ctx.fillStyle = 'rgba(70,150,255,.96)';
    ctx.strokeStyle = 'rgba(180,220,255,.95)';
    ctx.lineWidth = Math.max(1, CUBE_HALF * 0.08);
    ctx.beginPath();
    ctx.moveTo(flTop.x, flTop.y); ctx.lineTo(frTop.x, frTop.y); ctx.lineTo(frBot.x, frBot.y); ctx.lineTo(flBot.x, flBot.y);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  let raf, last = 0, elapsed = 0;

  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts; elapsed += dt;
    const rot = elapsed * ROT_SPEED;
    const globalFade = Math.min(1, elapsed / 3.2) * 0.85;
    const hue = (200 + elapsed * 6) % 360;

    ctx.clearRect(0, 0, W, H);
    for (const u of STOPS) { strokeRail('floor', u, 0, rot, globalFade, hue); strokeRail('ceiling', u, 0, rot, globalFade * 0.6, hue); }
    for (const v of STOPS) { strokeRail('left', 0, v, rot, globalFade * 0.6, hue); strokeRail('right', 0, v, rot, globalFade * 0.6, hue); }
    for (const r of rings) {
      r.z -= 92 * dt;
      if (r.z < Z_NEAR) r.z += (Z_FAR - Z_NEAR);
      drawRing(r.z, rot, globalFade);
    }
    updateCube(dt);
    for (const o of cubeObstacles) drawCubeObstacle(o, rot, globalFade);
    drawCube(rot, globalFade);
    raf = requestAnimationFrame(frame);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    for (const u of STOPS) { strokeRail('floor', u, 0, 0, 0.6, 200); strokeRail('ceiling', u, 0, 0, 0.4, 200); }
    for (const v of STOPS) { strokeRail('left', 0, v, 0, 0.4, 200); strokeRail('right', 0, v, 0, 0.4, 200); }
    for (const r of rings) drawRing(r.z, 0, 0.5);
    for (const o of cubeObstacles) drawCubeObstacle(o, 0, 0.5);
    drawCube(0, 0.5);
  }

  window.addEventListener('resize', size);
  size();

  if (reduceMotion) {
    drawStatic();
  } else {
    raf = requestAnimationFrame(frame);
  }
})();
