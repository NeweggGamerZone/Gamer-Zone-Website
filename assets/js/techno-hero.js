/* Homepage-only fixed background: an endless side-scrolling runner in the
   style of Geometry Dash. The rotating perspective grid tunnel from earlier
   versions is kept, but purely as ambient decoration (dimmed, no gameplay
   tied to it) — the actual game is a flat 2D track along the lower part of
   the screen. A small pseudo-3D cube sits at a fixed screen position (it
   never moves horizontally); the ground/platforms/spikes scroll from right
   to left underneath and toward it, so relative to the camera only the
   level moves, exactly like Geometry Dash's cube mode. Up Arrow or W jumps
   (not Space/Down, which the browser treats as page-scroll keys) over spike
   triangles and pits, or up onto floating platforms 1-3 cube-units tall —
   clearing a platform requires jumping before its leading edge reaches the
   player and staying at or above its height until it's passed; the cube
   spins while airborne, Geometry-Dash style. Score ticks up dino-runner
   style: slow at first, gradually accelerating. Scrolling away from the
   hero fades the game out and pauses it — the decorative grid keeps
   drifting either way. Pure canvas math, no images. */
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
  const ROT_SPEED = 0.045; // slow ambient roll, radians/sec — purely decorative now

  // Side-scroll runner geometry — recomputed on resize in size().
  let UNIT, GROUND_Y, PLAYER_X;

  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx = W / 2; cy = H / 2;
    A = Math.max(W, H) * 0.72; B = A;
    buildRings();
    UNIT = Math.max(26, Math.min(H * 0.07, 52));
    GROUND_Y = H * 0.72;
    PLAYER_X = W * 0.16;
  }

  function buildRings() {
    rings = [];
    const count = 9;
    for (let i = 0; i < count; i++) rings.push({ z: Z_NEAR + (i / count) * (Z_FAR - Z_NEAR) });
  }

  // ---------------- decorative background tunnel (unchanged math) ----------------
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

  // ---------------- pseudo-3D cube (player) ----------------
  const CUBE_TOP = 'rgba(255,255,255,1)';
  const CUBE_LEFT = 'rgba(178,204,255,1)';
  const CUBE_RIGHT = 'rgba(120,150,214,1)';
  const CUBE_EDGE = 'rgba(20,30,50,.55)';

  function drawCube(s) {
    const depth = s * 0.42;
    const hw = s / 2;
    ctx.fillStyle = CUBE_LEFT;
    ctx.beginPath();
    ctx.moveTo(-hw, 0); ctx.lineTo(-hw, -s); ctx.lineTo(0, -s + depth * 0.28); ctx.lineTo(0, depth * 0.28);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = CUBE_EDGE; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = CUBE_RIGHT;
    ctx.beginPath();
    ctx.moveTo(hw, 0); ctx.lineTo(hw, -s); ctx.lineTo(0, -s + depth * 0.28); ctx.lineTo(0, depth * 0.28);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = CUBE_TOP;
    ctx.beginPath();
    ctx.moveTo(-hw, -s); ctx.lineTo(0, -s - depth * 0.55); ctx.lineTo(hw, -s); ctx.lineTo(0, -s + depth * 0.28);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  // ---------------- endless-runner track ----------------
  let obstacles = [];       // { kind: 'spike'|'gap'|'platform', x, width, height? } — x is screen-space, decreasing over time
  let spawnTimer = 1.2;
  let heroY = 0, heroVy = 0, jumping = false, jumpAngle = 0;
  // Tuned so a full jump (v^2/2g) clears a 3-unit platform at the largest
  // UNIT size with comfortable margin, while staying reasonably snappy.
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
    // Only jump is bound — Space/Down are left alone (default browser
    // page-scroll keys); there's no left/right in an auto-runner.
    if (e.code === 'KeyW' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
  });

  function spawnObstacle() {
    const r = Math.random();
    if (r < 0.40) {
      obstacles.push({ kind: 'spike', x: W + 40, width: UNIT * 0.8 });
    } else if (r < 0.55) {
      obstacles.push({ kind: 'gap', x: W + 40, width: UNIT * (1.1 + Math.random() * 0.4) });
    } else {
      const heights = [1, 1, 2, 2, 3];
      const h = heights[Math.floor(Math.random() * heights.length)];
      obstacles.push({ kind: 'platform', x: W + 40, width: UNIT * (1.6 + Math.random() * 0.9), height: h });
    }
  }

  function updateObstacles(dt, scrollSpeed) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = Math.max(0.95, 1.9 - distance * 0.0015) + Math.random() * 0.6;
      spawnObstacle();
    }
    for (let i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].x -= scrollSpeed * dt;
      if (obstacles[i].x + obstacles[i].width < -40) obstacles.splice(i, 1);
    }
  }

  function obstacleAtPlayer() {
    for (const o of obstacles) {
      if (PLAYER_X >= o.x && PLAYER_X <= o.x + o.width) return o;
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
    const o = obstacleAtPlayer();
    let floor = 0, dangerTop = null;
    if (o) {
      if (o.kind === 'gap') floor = null;
      else if (o.kind === 'platform') { floor = o.height * UNIT; dangerTop = floor; }
      else if (o.kind === 'spike') { floor = 0; dangerTop = UNIT * 0.85; }
    }
    if (invuln <= 0 && dangerTop !== null && heroY < dangerTop - 0.5) {
      triggerHit();
    } else if (invuln <= 0 && floor === null && heroY <= 0) {
      triggerHit();
    } else if (floor !== null && heroY <= floor && heroVy <= 0) {
      heroY = floor; heroVy = 0; jumping = false;
    }
  }

  // ---------------- track rendering ----------------
  function drawGround() {
    ctx.save();
    ctx.strokeStyle = 'rgba(120,170,255,.55)';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(90,150,255,.6)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    let x = 0;
    const gaps = obstacles.filter(o => o.kind === 'gap').sort((a, b) => a.x - b.x);
    for (const g of gaps) {
      if (g.x > x) { ctx.moveTo(x, GROUND_Y); ctx.lineTo(g.x, GROUND_Y); }
      x = g.x + g.width;
    }
    if (x < W) { ctx.moveTo(x, GROUND_Y); ctx.lineTo(W, GROUND_Y); }
    ctx.stroke();
    ctx.restore();
  }

  function drawBlock(x, topY, width, height) {
    const topH = Math.min(10, height * 0.3);
    ctx.fillStyle = 'rgba(150,190,255,.92)';
    ctx.fillRect(x, topY, width, topH);
    ctx.fillStyle = 'rgba(70,100,160,.88)';
    ctx.fillRect(x, topY + topH, width, height - topH);
    ctx.strokeStyle = 'rgba(20,30,50,.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, topY + 0.5, width - 1, height - 1);
  }

  function drawSpike(o) {
    const h = UNIT * 0.85;
    ctx.save();
    ctx.fillStyle = 'rgba(255,150,40,.95)';
    ctx.shadowColor = 'rgba(255,140,40,.9)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(o.x, GROUND_Y);
    ctx.lineTo(o.x + o.width / 2, GROUND_Y - h);
    ctx.lineTo(o.x + o.width, GROUND_Y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,120,.9)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
  }

  function drawObstacles() {
    for (const o of obstacles) {
      if (o.kind === 'platform') drawBlock(o.x, GROUND_Y - o.height * UNIT, o.width, o.height * UNIT);
      else if (o.kind === 'spike') drawSpike(o);
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
    const rot = elapsed * ROT_SPEED; // reads clockwise on screen — ambient only
    const globalFade = Math.min(1, elapsed / 3.2);
    const hue = (200 + elapsed * 6) % 360;
    charAlpha += ((visible ? 1 : 0) - charAlpha) * Math.min(1, dt * 4);
    invuln = Math.max(0, invuln - dt);

    ctx.clearRect(0, 0, W, H);

    // Decorative rotating tunnel — dimmed, no gameplay tied to it.
    const decorFade = globalFade * 0.5;
    const stops = [-1, -0.5, 0, 0.5, 1];
    for (const u of stops) { strokeRail('floor', u, 0, rot, decorFade, hue); strokeRail('ceiling', u, 0, rot, decorFade, hue); }
    for (const v of stops) { strokeRail('left', 0, v, rot, decorFade, hue); strokeRail('right', 0, v, rot, decorFade, hue); }

    updateRunSpeed(distance);
    const scrollSpeed = BASE_GRID_SPEED * (runSpeed / SPEED_START);
    for (const r of rings) {
      r.z -= scrollSpeed * 0.4 * dt; // slower parallax drift than the foreground track
      if (r.z < Z_NEAR) r.z += (Z_FAR - Z_NEAR);
      drawRing(r.z, rot, decorFade);
    }

    if (visible) {
      updateObstacles(dt, scrollSpeed);
      updatePlayer(dt);
      distance += runSpeed * 1.5 * dt;
      hitFlash = Math.max(0, hitFlash - dt * 2.2);
      if (hud) {
        hud.querySelector('#gz-hero-high-val').textContent = Math.floor(highScore);
        hud.querySelector('#gz-hero-score-val').textContent = Math.floor(distance);
      }
    }

    drawGround();
    drawObstacles();

    const f = globalFade * charAlpha;
    if (f > 0.02) {
      jumpAngle = jumping ? jumpAngle + dt * 9 : 0;
      ctx.save();
      ctx.translate(PLAYER_X, GROUND_Y - heroY);
      ctx.rotate(jumpAngle);
      ctx.globalAlpha = f;
      drawCube(UNIT);
      ctx.restore();
    }

    if (hitFlash > 0.01) {
      ctx.save();
      ctx.globalAlpha = hitFlash * 0.22;
      ctx.fillStyle = '#ff2e78';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    raf = requestAnimationFrame(frame);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    const stops = [-1, -0.5, 0, 0.5, 1];
    for (const u of stops) { strokeRail('floor', u, 0, 0, 0.5, 200); strokeRail('ceiling', u, 0, 0, 0.5, 200); }
    for (const v of stops) { strokeRail('left', 0, v, 0, 0.5, 200); strokeRail('right', 0, v, 0, 0.5, 200); }
    for (const r of rings) drawRing(r.z, 0, 0.5);
    drawGround();
    ctx.save();
    ctx.translate(PLAYER_X, GROUND_Y);
    drawCube(UNIT);
    ctx.restore();
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
