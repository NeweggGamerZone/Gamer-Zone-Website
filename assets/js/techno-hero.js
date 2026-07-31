/* Homepage-only fixed background: an endless runner. A rotating perspective
   grid tunnel spins in the background purely as ambient decoration (dim,
   subtle) — the "spiraling squares" the site is themed around. Actual
   gameplay lives in a separate, non-rotating lane anchored low on the
   screen (clear of the headline/CTA text): two grid rails converge toward
   the vanishing point, crossed by tile boundaries that advance toward the
   camera exactly like the decorative rings, so the flat 2D player square
   visibly runs from one grid square straight into the next as each tile
   arrives and passes. Spikes and floating platforms spawn on that same
   lane and approach the player the same way. Only spikes reset the run;
   platforms are just optional footholds — missing one, or standing on one,
   never costs anything. Jump (Up Arrow / W) is the only control. Score
   ticks up dino-runner style: slow at first, gradually accelerating.
   Scrolling away from the hero fades the game out and pauses it — the
   decorative tunnel keeps drifting either way. Pure canvas math, no images. */
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
  const ROT_SPEED = 0.045; // tunnel spin speed, radians/sec — this + forward motion is the "spiral"

  // Gameplay depth plane — the player always sits at this fixed z on the
  // floor wall; obstacles travel from Z_FAR down to (and past) this point.
  const Z_PLAYER = 150;
  let UNIT, ULOCAL; // UNIT: on-screen px reference size at Z_PLAYER. ULOCAL: same size in tunnel-local units.
  let FLOOR_LOCAL_Y; // local y of the "floor" gameplay elements rest on, at Z_PLAYER's depth.
  let LANE_HALF_W; // local half-width of the gameplay lane (the two grid rails the player runs between).

  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx = W / 2; cy = H / 2;
    A = Math.max(W, H) * 0.72; B = A;
    buildRings();
    UNIT = Math.max(24, Math.min(H * 0.055, 42));
    ULOCAL = UNIT * Z_PLAYER / F;
    // The floor wall's true edge (B) is calibrated for the far-distance decor
    // rails and projects way off-canvas at the much-closer Z_PLAYER depth.
    // Gameplay elements instead sit at a screen-calibrated floor position,
    // low in the frame — clear of the centered headline/CTA copy — converted
    // back into local tunnel units at the player's fixed depth. Unlike the
    // decorative tunnel, this lane is never rotated, so it stays put instead
    // of swinging past the text.
    FLOOR_LOCAL_Y = (H * 0.90 - cy) * Z_PLAYER / F;
    LANE_HALF_W = ULOCAL * 1.6;
  }

  function buildRings() {
    rings = [];
    const count = 9;
    for (let i = 0; i < count; i++) rings.push({ z: Z_NEAR + (i / count) * (Z_FAR - Z_NEAR) });
  }

  // ---------------- tunnel projection ----------------
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

  // ---------------- dino-runner-style speed curve ----------------
  const SPEED_START = 6, SPEED_CAP = 13, RAMP_FROM = 100, RAMP_EASE = 500;
  const BASE_GRID_SPEED = 230;
  let runSpeed = SPEED_START;
  function updateRunSpeed(distance) {
    runSpeed = distance <= RAMP_FROM
      ? SPEED_START
      : SPEED_CAP - (SPEED_CAP - SPEED_START) * Math.exp(-(distance - RAMP_FROM) / RAMP_EASE);
  }

  // ---------------- flat 2D square player, glued to the floor wall ----------------
  function drawPlayerSquare(screenX, screenY, size, rot) {
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(rot);
    const h = size / 2;
    ctx.fillStyle = 'rgba(235,242,255,.97)';
    ctx.strokeStyle = 'rgba(90,150,255,.9)';
    ctx.lineWidth = Math.max(1.5, size * 0.045);
    ctx.shadowColor = 'rgba(120,170,255,.65)';
    ctx.shadowBlur = size * 0.35;
    ctx.beginPath();
    ctx.rect(-h, -h, size, size);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // ---------------- endless spiral track (lives on the floor wall) ----------------
  // Obstacles travel in tunnel-depth (z), spawning far away (near Z_FAR) and
  // approaching the fixed Z_PLAYER plane as the tunnel rotates them in.
  let obstacles = [];   // { kind: 'spike'|'gap'|'platform', z (near/leading edge), zThickness, height? }
  let spawnTimer = 1.2;
  let heroY = 0, heroVy = 0, jumping = false, jumpAngle = 0;
  const GRAVITY = 2300, JUMP_V = 950;
  let distance = 0, hitFlash = 0, invuln = 0;
  let highScore = 0;
  try { highScore = parseFloat(localStorage.getItem('gz-hero-highscore') || '0') || 0; } catch {}
  let visible = true;
  let charAlpha = 1;

  function jump() { if (!jumping) { jumping = true; heroVy = JUMP_V; } }
  window.addEventListener('keydown', e => {
    if (!visible || e.repeat) return;
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.code === 'KeyW' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
  });

  function spawnObstacle() {
    const r = Math.random();
    if (r < 0.45) {
      obstacles.push({ kind: 'spike', z: Z_FAR, zThickness: ULOCAL * 0.9 });
    } else {
      const heights = [1, 1, 2, 2, 3];
      const h = heights[Math.floor(Math.random() * heights.length)];
      obstacles.push({ kind: 'platform', z: Z_FAR, zThickness: ULOCAL * (1.7 + Math.random() * 1.0), height: h });
    }
  }

  function updateObstacles(dt, zSpeed) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = Math.max(0.95, 1.9 - distance * 0.0015) + Math.random() * 0.6;
      spawnObstacle();
    }
    for (let i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].z -= zSpeed * dt;
      if (obstacles[i].z + obstacles[i].zThickness < Z_NEAR - 40) obstacles.splice(i, 1);
    }
  }

  // Only spikes are checked for a reset — platforms are purely optional
  // footholds. An obstacle is "at the player" while its z-span straddles Z_PLAYER.
  function spikeAtPlayer() {
    for (const o of obstacles) {
      if (o.kind !== 'spike') continue;
      if (Z_PLAYER <= o.z && Z_PLAYER >= o.z - o.zThickness) return o;
    }
    return null;
  }
  function platformAtPlayer() {
    for (const o of obstacles) {
      if (o.kind !== 'platform') continue;
      if (Z_PLAYER <= o.z && Z_PLAYER >= o.z - o.zThickness) return o;
    }
    return null;
  }

  function triggerHit() {
    if (distance > highScore) {
      highScore = distance;
      try { localStorage.setItem('gz-hero-highscore', String(Math.floor(highScore))); } catch {}
    }
    distance = 0;
    hitFlash = 1;
    invuln = 0.8;
    heroY = 0; heroVy = 0; jumping = false;
  }

  function updatePlayer(dt) {
    heroVy -= GRAVITY * dt;
    heroY += heroVy * dt;

    const plat = platformAtPlayer();
    const floor = plat ? plat.height * UNIT : 0;
    if (floor > 0 && heroY <= floor && heroVy <= 0) {
      heroY = floor; heroVy = 0; jumping = false;
    } else if (heroY <= 0 && heroVy <= 0) {
      heroY = 0; heroVy = 0; jumping = false;
    }

    // Spikes are the only thing that can reset the run — never platforms.
    const spike = spikeAtPlayer();
    if (invuln <= 0 && spike && heroY < UNIT * 0.85 - 0.5) {
      triggerHit();
    }
  }

  // Gameplay elements stay fully visible through the whole player-relevant
  // range — only fade briefly at spawn (far) and right after they pass the
  // camera (near), unlike the decorative rails' much steeper fadeFor().
  function objFade(z) {
    const nearFade = Math.min(1, (z - (Z_NEAR - 40)) / 70);
    const farFade = Math.min(1, (Z_FAR - z) / 220);
    return Math.max(0, Math.min(1, nearFade * farFade));
  }

  // ---------------- the lane: two grid rails + advancing tile boundaries ----------------
  // Never rotated (rot is always 0 here) — this is what keeps the game glued
  // to a fixed spot low on screen instead of swinging past the headline text.
  // The tile cross-ties reuse the same `rings` array as the decorative tunnel
  // (already animated toward the camera), so each one visibly arrives at the
  // player, and the square "ahead" of it becomes the new active tile — the
  // cube runs from one grid square straight into the next.
  function drawLane(globalFade) {
    const railA = project(-LANE_HALF_W, FLOOR_LOCAL_Y, Z_FAR, 0);
    const railAn = project(-LANE_HALF_W, FLOOR_LOCAL_Y, Z_NEAR, 0);
    const railB = project(LANE_HALF_W, FLOOR_LOCAL_Y, Z_FAR, 0);
    const railBn = project(LANE_HALF_W, FLOOR_LOCAL_Y, Z_NEAR, 0);
    ctx.save();
    ctx.globalAlpha = 0.5 * globalFade;
    ctx.strokeStyle = 'rgba(140,185,255,.7)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(railA.x, railA.y); ctx.lineTo(railAn.x, railAn.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(railB.x, railB.y); ctx.lineTo(railBn.x, railBn.y); ctx.stroke();
    ctx.restore();

    for (const r of rings) {
      const f = objFade(r.z) * globalFade;
      if (f <= 0.02) continue;
      const a = project(-LANE_HALF_W, FLOOR_LOCAL_Y, r.z, 0);
      const b = project(LANE_HALF_W, FLOOR_LOCAL_Y, r.z, 0);
      ctx.save();
      ctx.globalAlpha = 0.45 * f;
      ctx.strokeStyle = 'rgba(140,185,255,.9)';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.restore();
    }
  }

  // ---------------- obstacle rendering (on the lane, never rotated) ----------------
  function drawSpike(o) {
    const halfW = Math.min(o.zThickness * 0.5, LANE_HALF_W * 0.9);
    const apexLocalY = FLOOR_LOCAL_Y - ULOCAL * 0.85;
    const z = Math.max(o.z - o.zThickness * 0.5, Z_NEAR - 40);
    const base1 = project(-halfW, FLOOR_LOCAL_Y, z, 0);
    const base2 = project(halfW, FLOOR_LOCAL_Y, z, 0);
    const apex = project(0, apexLocalY, z, 0);
    const f = objFade(z);
    ctx.save();
    ctx.globalAlpha = Math.max(0.35, f);
    ctx.fillStyle = 'rgba(255,150,40,.95)';
    ctx.shadowColor = 'rgba(255,140,40,.9)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(base1.x, base1.y);
    ctx.lineTo(apex.x, apex.y);
    ctx.lineTo(base2.x, base2.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,120,.9)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
  }

  function drawPlatform(o) {
    const halfW = Math.min(o.zThickness * 0.5, LANE_HALF_W * 0.9);
    const topLocalY = FLOOR_LOCAL_Y - o.height * ULOCAL;
    const z = Math.max(o.z - o.zThickness * 0.5, Z_NEAR - 40);
    const p1 = project(-halfW, topLocalY, z, 0);
    const p2 = project(halfW, topLocalY, z, 0);
    const p3 = project(halfW, FLOOR_LOCAL_Y, z, 0);
    const p4 = project(-halfW, FLOOR_LOCAL_Y, z, 0);
    const f = objFade(z);
    ctx.save();
    ctx.globalAlpha = Math.max(0.35, f);
    ctx.fillStyle = 'rgba(70,100,160,.88)';
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,190,255,.85)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
  }

  function drawObstacles() {
    for (const o of obstacles) {
      if (o.kind === 'spike') drawSpike(o);
      else if (o.kind === 'platform') drawPlatform(o);
    }
  }

  const hud = buildHud();
  function buildHud() {
    if (!document.body.classList.contains('home-page')) return null;
    const wrap = document.createElement('div');
    wrap.id = 'gz-hero-hud';
    wrap.innerHTML = '<span class="gz-hero-high">High Score <b id="gz-hero-high-val">0</b>m</span>' +
      '<span class="gz-hero-score">Score <b id="gz-hero-score-val">0</b>m</span>' +
      '<span class="gz-hero-help"><span class="gz-key">&#9650;</span> Jump</span>';
    document.body.appendChild(wrap);
    const style = document.createElement('style');
    style.textContent = `
      #gz-hero-hud{position:fixed;top:124px;left:clamp(1rem,4vw,2.2rem);z-index:40;
        display:flex;flex-direction:column;gap:.25rem;
        font-family:'Montserrat','Segoe UI',sans-serif;font-weight:800;letter-spacing:.04em;
        text-transform:uppercase;pointer-events:none;transition:opacity .5s ease;opacity:1}
      #gz-hero-hud .gz-hero-high{font-size:.68rem;color:#9db3d6;text-shadow:0 0 8px rgba(61,139,255,.4)}
      #gz-hero-hud .gz-hero-high b{color:#cfe0ff}
      #gz-hero-hud .gz-hero-score{font-size:.92rem;color:#cfe0ff;text-shadow:0 0 10px rgba(61,139,255,.55)}
      #gz-hero-hud .gz-hero-score b{color:#FA9D28;text-shadow:0 0 10px rgba(250,157,40,.6)}
      #gz-hero-hud .gz-hero-help{font-size:.62rem;font-weight:700;letter-spacing:.03em;color:#7f93b8;margin-top:.1rem}
      #gz-hero-hud .gz-hero-help .gz-key{color:#cfe0ff}
      #gz-hero-hud.hidden{opacity:0}
      @media(max-width:640px){#gz-hero-hud{top:104px}#gz-hero-hud .gz-hero-high{font-size:.6rem}#gz-hero-hud .gz-hero-score{font-size:.8rem}#gz-hero-hud .gz-hero-help{font-size:.56rem}}
    `;
    document.head.appendChild(style);
    return wrap;
  }

  let raf, last = 0, elapsed = 0;

  function updateVisibility() {
    visible = window.scrollY < window.innerHeight * 0.55;
    if (hud) hud.classList.toggle('hidden', !visible);
  }
  window.addEventListener('scroll', updateVisibility, { passive: true });

  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts; elapsed += dt;
    const rot = elapsed * ROT_SPEED; // tunnel spin — combined with forward z-motion, this is the spiral
    const globalFade = Math.min(1, elapsed / 3.2);
    const hue = (200 + elapsed * 6) % 360;
    charAlpha += ((visible ? 1 : 0) - charAlpha) * Math.min(1, dt * 4);
    invuln = Math.max(0, invuln - dt);

    ctx.clearRect(0, 0, W, H);

    const decorFade = globalFade * 0.85;
    const stops = [-1, -0.5, 0, 0.5, 1];
    for (const u of stops) { strokeRail('floor', u, 0, rot, decorFade, hue); strokeRail('ceiling', u, 0, rot, decorFade * 0.6, hue); }
    for (const v of stops) { strokeRail('left', 0, v, rot, decorFade * 0.6, hue); strokeRail('right', 0, v, rot, decorFade * 0.6, hue); }

    updateRunSpeed(distance);
    const ringSpeed = BASE_GRID_SPEED * (runSpeed / SPEED_START);
    for (const r of rings) {
      r.z -= ringSpeed * 0.4 * dt;
      if (r.z < Z_NEAR) r.z += (Z_FAR - Z_NEAR);
      drawRing(r.z, rot, decorFade);
    }

    // Obstacles travel faster than the decorative rings (foreground layer),
    // same ratio the old flat runner used between ground speed and parallax.
    const obstacleSpeed = ringSpeed * 2.5;
    if (visible) {
      updateObstacles(dt, obstacleSpeed);
      updatePlayer(dt);
      distance += runSpeed * 1.5 * dt;
      hitFlash = Math.max(0, hitFlash - dt * 2.2);
      if (hud) {
        hud.querySelector('#gz-hero-high-val').textContent = Math.floor(highScore);
        hud.querySelector('#gz-hero-score-val').textContent = Math.floor(distance);
      }
    }

    drawLane(globalFade);
    drawObstacles();

    const f = globalFade * charAlpha;
    if (f > 0.02) {
      jumpAngle = jumping ? jumpAngle + dt * 9 : 0;
      const liftLocal = heroY * (Z_PLAYER / F); // convert screen-px lift back to local units at the player's depth
      const p = project(0, FLOOR_LOCAL_Y - liftLocal, Z_PLAYER, 0);
      ctx.save();
      ctx.globalAlpha = f;
      drawPlayerSquare(p.x, p.y, UNIT, jumpAngle);
      ctx.restore();
    }

    if (hitFlash > 0.01) {
      ctx.save();
      ctx.globalAlpha = hitFlash * 0.22;
      ctx.fillStyle = '#FA9D28';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    raf = requestAnimationFrame(frame);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    const stops = [-1, -0.5, 0, 0.5, 1];
    for (const u of stops) { strokeRail('floor', u, 0, 0, 0.85, 200); strokeRail('ceiling', u, 0, 0, 0.5, 200); }
    for (const v of stops) { strokeRail('left', 0, v, 0, 0.5, 200); strokeRail('right', 0, v, 0, 0.5, 200); }
    for (const r of rings) drawRing(r.z, 0, 0.6);
    drawLane(1);
    const p = project(0, FLOOR_LOCAL_Y, Z_PLAYER, 0);
    drawPlayerSquare(p.x, p.y, UNIT, 0);
  }

  window.addEventListener('resize', size);
  updateVisibility();
  size();

  if (reduceMotion) {
    drawStatic();
  } else {
    raf = requestAnimationFrame(frame);
  }
})();
