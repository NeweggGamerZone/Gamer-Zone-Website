/* Homepage-only fixed background: a full-page grid tunnel through the inside
   of a PC — and a small interactive bit riding along it. A single-color
   pixel egg-bot rides the slow ambient spin of the grid, always centered on
   whichever of the tunnel's 4 sides (floor/right/ceiling/left) it currently
   occupies, and turns so its head always faces the center of the screen
   (upright on the floor, upside-down on the ceiling, on its side on the
   walls). Left/Right (or A/D) glide it over to a different side — the grid
   itself never rotates in response, only the character moves. Space jumps
   over the spiked red hazard lines traveling out of the vanishing point
   toward the viewer (in single-wall, opposite-wall, adjacent-wall, or
   full-ring patterns, always riding along with the background grid); cyan/
   rainbow RGB pulses instead grant a brief speed boost tinted the pulse's own
   color when caught. Score ticks up dino-runner style: slow at first,
   gradually accelerating after 100m. Scrolling away from the hero fades the
   character out and pauses scoring — the grid keeps drifting either way.
   Pure canvas perspective-projection math, no images, no PC-part clutter. */
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
  let pulses = [];
  let hazards = [];
  const ROT_SPEED = 0.045; // slow ambient roll, radians/sec — the grid always drifts on its own

  let sizeInited = false;
  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx = W / 2; cy = H / 2;
    A = Math.max(W, H) * 0.72; B = A;
    buildRings();
    // A/B aren't known until the first size() call, so the hero's starting
    // world position has to be set here rather than at declaration time.
    if (!sizeInited) { sizeInited = true; heroLocal = wallPoint(WALL_NAMES[currentWall], 0, 0); }
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
  // wall index (0=floor,1=right,2=ceiling,3=left) <-> the named walls above.
  const WALL_NAMES = ['floor', 'right', 'ceiling', 'left'];
  // Rotation so the egg's head always points toward the screen's center,
  // regardless of which side of the tunnel it's standing on.
  const WALL_ANGLE = [0, -Math.PI / 2, Math.PI, Math.PI / 2];

  function fadeFor(z) {
    const nearFade = Math.min(1, (z - Z_NEAR) / 320); // fade out slowly as it nears the outer edge
    const farFade = Math.min(1, (Z_FAR - z) / 820); // fade in very slowly as it spawns near the vanishing point
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
  // Flat & slow until 100m, then eases up toward a capped max — same shape as
  // the Chrome dino game's acceleration. speed 6 -> ~9 pts/sec, speed 13 (cap)
  // -> ~19.5 pts/sec (scoreRate = speed * 1.5 exactly reproduces both ends).
  const SPEED_START = 6, SPEED_CAP = 13, RAMP_FROM = 100, RAMP_EASE = 500;
  const BASE_GRID_SPEED = 230; // ring/hazard/pulse travel rate at SPEED_START
  let runSpeed = SPEED_START;
  function updateRunSpeed(distance) {
    runSpeed = distance <= RAMP_FROM
      ? SPEED_START
      : SPEED_CAP - (SPEED_CAP - SPEED_START) * Math.exp(-(distance - RAMP_FROM) / RAMP_EASE);
  }

  // ---------------- shared wall-pattern pool ----------------
  // Every hazard/pulse picks one of these combinations so danger + boosts can
  // appear on a single wall, opposite walls, two adjacent walls, or the full
  // ring — every shape the 4-sided grid can make. Singles are weighted more
  // common by repetition.
  const WALL_PATTERNS = [
    [0], [1], [2], [3], [0], [1], [2], [3],
    [0, 2], [1, 3],
    [0, 1], [1, 2], [2, 3], [3, 0],
    [0, 1, 2, 3],
  ];
  function randomWallPattern() { return WALL_PATTERNS[Math.floor(Math.random() * WALL_PATTERNS.length)]; }

  function wallSegmentEnds(wall, z, rot) {
    const isFloorLike = wall === 'floor' || wall === 'ceiling';
    const p1 = wallPoint(wall, isFloorLike ? -1 : 0, isFloorLike ? 0 : -1);
    const p2 = wallPoint(wall, isFloorLike ? 1 : 0, isFloorLike ? 0 : 1);
    return [project(p1.x, p1.y, z, rot), project(p2.x, p2.y, z, rot)];
  }

  // RGB pulse rings: spawn near the vanishing point and sweep outward toward
  // the viewer — same direction and speed as the rest of the grid, riding
  // along the same z as the rings so it reads as part of the background.
  // Catching one (on a wall it shares with the player) grants a speed boost
  // tinted with that pulse's own color.
  let pulseTimer = 0;
  function spawnPulse() {
    pulses.push({ z: Z_FAR - 20, hue: Math.random() * 360, walls: randomWallPattern(), passed: false });
  }
  function updatePulses(dt, rot, globalFade, gridSpeed, heroZ) {
    pulseTimer -= dt;
    if (pulseTimer <= 0) { spawnPulse(); pulseTimer = 2.6 + Math.random() * 2.2; }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.z -= gridSpeed * dt;
      p.hue = (p.hue + dt * 40) % 360;
      if (visible && !p.passed && p.z <= heroZ) {
        p.passed = true;
        if (p.walls.includes(currentWall)) { boost = 1; boostHue = p.hue; }
      }
      if (p.z <= Z_NEAR) { pulses.splice(i, 1); continue; }
      const f = fadeFor(p.z) * globalFade;
      if (f <= 0.01) continue;
      const isFull = p.walls.length === 4;
      if (isFull) {
        const pts = ringPts(p.z, rot);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `hsla(${p.hue}, 90%, 65%, ${0.5 * f})`;
        ctx.shadowColor = `hsla(${p.hue}, 90%, 60%, .9)`;
        ctx.shadowBlur = 14;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let k = 1; k < 4; k++) ctx.lineTo(pts[k].x, pts[k].y);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      } else {
        for (const w of p.walls) {
          const [a, b] = wallSegmentEnds(WALL_NAMES[w], p.z, rot);
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = `hsla(${p.hue}, 90%, 65%, ${0.5 * f})`;
          ctx.shadowColor = `hsla(${p.hue}, 90%, 60%, .9)`;
          ctx.shadowBlur = 14;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  // ---------------- interactive egg-bot ----------------
  let currentWall = 0; // 0 floor, 1 right, 2 ceiling, 3 left — which side is "selected"
  let heroLocal = { x: 0, y: 0 }; // smoothed world-space position, eases toward the selected wall's center — real value set on first size()
  let heroAngleVec = { x: 1, y: 0 }; // smoothed facing direction (as a vector, to avoid angle-wrap jumps)
  let heroY = 0, heroVy = 0, jumping = false;
  let distance = 0, hitFlash = 0, boost = 0, boostHue = 190;
  let highScore = 0;
  try { highScore = parseFloat(localStorage.getItem('gz-hero-highscore') || '0') || 0; } catch {}
  let visible = true;      // is the hero section still roughly on screen?
  let charAlpha = 1;       // smoothed toward `visible`
  let spawnTimer = 1.4;

  const hud = buildHud();
  function buildHud() {
    if (!document.body.classList.contains('home-page')) return null;
    const wrap = document.createElement('div');
    wrap.id = 'gz-hero-hud';
    wrap.innerHTML = '<span class="gz-hero-high">High Score <b id="gz-hero-high-val">0</b>m</span>' +
      '<span class="gz-hero-score">Score <b id="gz-hero-score-val">0</b>m</span>';
    document.body.appendChild(wrap);
    const style = document.createElement('style');
    style.textContent = `
      #gz-hero-hud{position:fixed;top:96px;left:clamp(1rem,4vw,2.2rem);z-index:40;
        display:flex;flex-direction:column;gap:.2rem;
        font-family:'Montserrat','Segoe UI',sans-serif;font-weight:800;letter-spacing:.04em;
        text-transform:uppercase;pointer-events:none;transition:opacity .5s ease;opacity:1}
      #gz-hero-hud .gz-hero-high{font-size:.68rem;color:#9db3d6;text-shadow:0 0 8px rgba(61,139,255,.4)}
      #gz-hero-hud .gz-hero-high b{color:#cfe0ff}
      #gz-hero-hud .gz-hero-score{font-size:.92rem;color:#cfe0ff;text-shadow:0 0 10px rgba(61,139,255,.55)}
      #gz-hero-hud .gz-hero-score b{color:#FA9D28;text-shadow:0 0 10px rgba(250,157,40,.6)}
      #gz-hero-hud.hidden{opacity:0}
      @media(max-width:640px){#gz-hero-hud{top:80px}#gz-hero-hud .gz-hero-high{font-size:.6rem}#gz-hero-hud .gz-hero-score{font-size:.8rem}}
    `;
    document.head.appendChild(style);
    return wrap;
  }

  function selectWall(delta) {
    currentWall = (currentWall + delta + 4) % 4;
  }
  function jump() {
    if (!jumping) { jumping = true; heroVy = -420; }
  }
  window.addEventListener('keydown', e => {
    if (!visible || e.repeat) return;
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    // Only Left/Right move the character between sides, and Space jumps.
    // Up/Down are intentionally left alone — they shouldn't touch gameplay.
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); selectWall(-1); }
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); selectWall(1); }
    else if (e.code === 'Space') { e.preventDefault(); jump(); }
  });

  // The hero sits at a screen-anchored depth so it always stays in frame no
  // matter the window size — same trick regardless of which wall it's on,
  // since all 4 wall-center points are equidistant (A === B) from center.
  function heroDepth() {
    const desiredOffset = H * 0.42;
    return Math.max(Z_NEAR + 30, (F * A) / desiredOffset);
  }

  function spawnHazard() {
    hazards.push({ walls: randomWallPattern(), z: Z_FAR, passed: false });
  }

  function updateHazards(dt, heroZ, gridSpeed) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = Math.max(1.1, 2.6 - distance * 0.002) + Math.random() * 0.8;
      spawnHazard();
    }
    for (let i = hazards.length - 1; i >= 0; i--) {
      const hz = hazards[i];
      hz.z -= gridSpeed * dt;
      if (visible && !hz.passed && hz.z <= heroZ) {
        hz.passed = true;
        if (hz.walls.includes(currentWall) && !jumping) {
          if (distance > highScore) {
            highScore = distance;
            try { localStorage.setItem('gz-hero-highscore', String(Math.floor(highScore))); } catch {}
          }
          distance = 0;
          hitFlash = 1;
        }
      }
      if (hz.z < Z_NEAR - 40) hazards.splice(i, 1);
    }
  }

  // A single dangerous segment, with small perpendicular spikes along its
  // length so it reads as a hazard rather than just a bright line.
  function drawHazardSegment(a, b, isActive, f) {
    ctx.save();
    ctx.globalAlpha = f;
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = 'rgba(255,46,120,.9)';
    ctx.shadowBlur = isActive ? 16 : 6;
    ctx.strokeStyle = isActive ? 'rgba(255,70,140,1)' : 'rgba(255,46,120,.4)';
    ctx.lineWidth = isActive ? 2.6 : 1.4;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();

    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const spikeCount = Math.max(4, Math.floor(len / 30));
    const spikeLen = isActive ? 10 : 6;
    ctx.lineWidth = isActive ? 2 : 1.1;
    ctx.strokeStyle = isActive ? 'rgba(255,120,170,.95)' : 'rgba(255,46,120,.35)';
    for (let i = 1; i < spikeCount; i++) {
      const t = i / spikeCount;
      const x = a.x + dx * t, y = a.y + dy * t;
      const dir = i % 2 === 0 ? 1 : -1; // alternate in/out for a jagged silhouette
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + nx * spikeLen * dir, y + ny * spikeLen * dir);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHazard(hz, rot, globalFade) {
    const f = fadeFor(hz.z) * globalFade;
    if (f <= 0.02) return;
    const isActive = hz.walls.includes(currentWall);
    for (const w of hz.walls) {
      const [a, b] = wallSegmentEnds(WALL_NAMES[w], hz.z, rot);
      drawHazardSegment(a, b, isActive, f);
    }
  }

  // Egg-bot: a small, single-color, perfectly symmetrical pixel egg — rounder
  // silhouette via a finer pixel grid, with two longer running legs. Rotates
  // so its head always faces the center of the screen on every wall.
  const EGG_ROWS = 11; // rows 9-10 are the legs
  const EGG_COLS = 11; // 0..10, centered on column 5
  const EGG_SHAPE = [
    [4, 6], // 0 — crown
    [3, 7], // 1
    [2, 8], // 2
    [1, 9], // 3
    [0, 10], // 4 — widest
    [0, 10], // 5
    [0, 10], // 6
    [1, 9], // 7
    [2, 8], // 8 — tapers into the legs
  ];
  function drawHero(anchorP, z, angle, elapsed, globalFade) {
    const f = fadeFor(z) * globalFade * charAlpha;
    if (f <= 0.02) return;
    const p = project(anchorP.x, anchorP.y, z, anchorP.rot);
    const px = Math.max(1, p.s * 22); // smaller, denser unit for a rounder look
    if (px < 1) return;

    ctx.save();
    ctx.translate(p.x, p.y + heroY);
    ctx.rotate(angle);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = f;
    ctx.fillStyle = 'rgba(215,235,255,.96)'; // one solid color
    ctx.shadowColor = 'rgba(125,180,255,.85)';
    ctx.shadowBlur = px * 0.6;

    const block = (c0, c1, row) => {
      const w = c1 - c0 + 1;
      ctx.fillRect((c0 - EGG_COLS / 2 + 0.5) * px, (row - EGG_ROWS) * px, w * px * 0.92, px * 0.92);
    };
    EGG_SHAPE.forEach((range, r) => block(range[0], range[1], r));
    // two longer legs, symmetric about the center column, alternating in a
    // running cycle — one leg extends the full two rows while the other
    // tucks up short.
    const legPhase = jumping ? null : Math.floor(elapsed * 8) % 2 === 0;
    if (legPhase === true) {
      block(4, 4, 9); block(4, 4, 10);
      block(6, 6, 9);
    } else if (legPhase === false) {
      block(4, 4, 9);
      block(6, 6, 9); block(6, 6, 10);
    } else {
      block(4, 4, 9); block(6, 6, 9);
    }

    ctx.restore();
  }

  let raf, last = 0, elapsed = 0;

  // Scroll pause: fade the character out and stop scoring once the hero
  // section is mostly scrolled past — the grid itself never stops moving.
  function updateVisibility() {
    visible = window.scrollY < window.innerHeight * 0.55;
    if (hud) hud.classList.toggle('hidden', !visible);
  }
  window.addEventListener('scroll', updateVisibility, { passive: true });

  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts; elapsed += dt;
    // Only the grid's own slow ambient roll drives its rotation — Left/Right
    // never spins the tunnel, they only move where the character sits on it.
    const rot = elapsed * ROT_SPEED;
    const globalFade = Math.min(1, elapsed / 3.2); // slow overall fade-in on load
    const hue = (200 + elapsed * 6) % 360;
    charAlpha += ((visible ? 1 : 0) - charAlpha) * Math.min(1, dt * 4);

    updateRunSpeed(distance);
    boost = Math.max(0, boost - dt / 2.5);
    const speedMult = 1 + boost * 0.7;
    const gridSpeed = BASE_GRID_SPEED * (runSpeed / SPEED_START) * speedMult;

    ctx.clearRect(0, 0, W, H);

    const stops = [-1, -0.5, 0, 0.5, 1];
    for (const u of stops) { strokeRail('floor', u, 0, rot, globalFade, hue); strokeRail('ceiling', u, 0, rot, globalFade, hue); }
    for (const v of stops) { strokeRail('left', 0, v, rot, globalFade, hue); strokeRail('right', 0, v, rot, globalFade, hue); }

    for (const r of rings) {
      r.z -= gridSpeed * dt;
      if (r.z < Z_NEAR) r.z += (Z_FAR - Z_NEAR);
      drawRing(r.z, rot, globalFade);
    }

    const heroZ = heroDepth();
    updatePulses(dt, rot, globalFade, gridSpeed, heroZ);

    // Ease the character's world position toward whichever wall is selected —
    // it glides across the tunnel's cross-section rather than the grid spinning.
    const target = wallPoint(WALL_NAMES[currentWall], 0, 0);
    heroLocal.x += (target.x - heroLocal.x) * Math.min(1, dt * 7);
    heroLocal.y += (target.y - heroLocal.y) * Math.min(1, dt * 7);

    // Ease the facing angle too (via vector components, so it always turns
    // the short way around rather than snapping through a wrap-around).
    const targetAngle = WALL_ANGLE[currentWall];
    const tv = { x: Math.cos(targetAngle), y: Math.sin(targetAngle) };
    heroAngleVec.x += (tv.x - heroAngleVec.x) * Math.min(1, dt * 7);
    heroAngleVec.y += (tv.y - heroAngleVec.y) * Math.min(1, dt * 7);
    const heroAngle = Math.atan2(heroAngleVec.y, heroAngleVec.x);

    if (visible) {
      distance += runSpeed * 1.5 * speedMult * dt; // score rate: 9/sec at start -> 19.5/sec at cap
      hitFlash = Math.max(0, hitFlash - dt * 2.2);
      if (jumping) {
        heroVy += 1400 * dt;
        heroY += heroVy * dt;
        if (heroY >= 0) { heroY = 0; heroVy = 0; jumping = false; }
      }
      if (hud) {
        hud.querySelector('#gz-hero-high-val').textContent = Math.floor(highScore);
        hud.querySelector('#gz-hero-score-val').textContent = Math.floor(distance);
      }
    }
    updateHazards(dt, heroZ, gridSpeed);

    const sortedHz = hazards.slice().sort((a, b) => b.z - a.z);
    for (const hz of sortedHz) drawHazard(hz, rot, globalFade);

    drawHero({ x: heroLocal.x, y: heroLocal.y, rot }, heroZ, heroAngle, elapsed, globalFade);

    if (hitFlash > 0.01) {
      ctx.save();
      ctx.globalAlpha = hitFlash * 0.22;
      ctx.fillStyle = '#ff2e78';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    if (boost > 0.01) {
      ctx.save();
      ctx.globalAlpha = boost * 0.14;
      ctx.fillStyle = `hsl(${boostHue}, 90%, 60%)`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    raf = requestAnimationFrame(frame);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    const stops = [-1, -0.5, 0, 0.5, 1];
    for (const u of stops) { strokeRail('floor', u, 0, 0, 1, 200); strokeRail('ceiling', u, 0, 0, 1, 200); }
    for (const v of stops) { strokeRail('left', 0, v, 0, 1, 200); strokeRail('right', 0, v, 0, 1, 200); }
    for (const r of rings) drawRing(r.z, 0, 1);
    drawHero({ x: heroLocal.x, y: heroLocal.y, rot: 0 }, heroDepth(), WALL_ANGLE[currentWall], 0, 1);
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
