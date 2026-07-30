/* Homepage-only fixed background: a full-page grid tunnel through the inside
   of a PC — and a small interactive bit riding along it. A single-color,
   smooth vector egg-bot (pre-rendered once to an offscreen canvas, then just
   stamped each frame — much cheaper than redrawing dozens of shadowed shapes,
   and far smoother than a blocky pixel sprite) rides the slow ambient spin of
   the grid, sized to match the grid square it's standing on, always centered
   on whichever of the tunnel's 4 sides (floor/right/ceiling/left) it
   currently occupies. It turns so its head always faces the center of the
   screen and its feet always point outward — including compensating for the
   grid's own continuous slow roll, so it always reads as "standing on" that
   square. Left/Right (or A/D) glide it over to a different side — the grid
   itself never rotates in response, only the character moves. Space jumps
   over the spiked orange hazard lines traveling out of the vanishing point
   toward the viewer, riding along an actual background ring line so they
   read as part of the grid (single-wall, opposite-wall, adjacent-wall, or
   full-ring patterns); cyan/rainbow RGB pulses (same ring-attached approach)
   instead grant a brief speed boost tinted the pulse's own color when
   caught. A soft ground shadow under the egg marks its hitbox. Score ticks
   up dino-runner style: slow at first, gradually accelerating after 100m.
   Scrolling away from the hero fades the character out and pauses scoring —
   the grid keeps drifting either way. Pure canvas perspective-projection
   math, no images, no PC-part clutter. */
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
  // Relative rotation so the egg's head always points toward the screen's
  // center on whichever wall it's on (the grid's own ambient spin is added
  // on top of this each frame so the character always stays "upright"
  // relative to the slowly-turning grid, feet pointing outward).
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

  // Width of one background grid cell (between the two rail lines straddling
  // the center of a wall) at a given depth — used both to size the egg so it
  // visually matches a grid square, and to draw its ground-shadow hitbox.
  function cellWidthAt(z, rot) {
    const a = project(-0.5 * A, B, z, rot);
    const b = project(0.5 * A, B, z, rot);
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  // ---------------- dino-runner-style speed curve ----------------
  // Flat & slow until 100m, then eases up toward a capped max — same shape as
  // the Chrome dino game's acceleration. speed 6 -> ~9 pts/sec, speed 13 (cap)
  // -> ~19.5 pts/sec (scoreRate = speed * 1.5 exactly reproduces both ends).
  const SPEED_START = 6, SPEED_CAP = 13, RAMP_FROM = 100, RAMP_EASE = 500;
  const BASE_GRID_SPEED = 230; // ring travel rate at SPEED_START
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

  // Hazards and pulses ride a specific background ring's z position every
  // frame (rather than tracking their own independent depth), so they are
  // always pixel-attached to an actual grid line. When that ring wraps back
  // around to the far end, the event retires.
  function backmostRingIndex() {
    let best = 0, bestZ = rings[0].z;
    for (let i = 1; i < rings.length; i++) { if (rings[i].z > bestZ) { bestZ = rings[i].z; best = i; } }
    return best;
  }

  let pulseTimer = 0;
  function spawnPulse() {
    pulses.push({ ringIdx: backmostRingIndex(), hue: Math.random() * 360, walls: randomWallPattern(), passed: false, lastZ: null });
  }
  function updatePulses(dt, rot, globalFade, heroZ) {
    pulseTimer -= dt;
    if (pulseTimer <= 0) { spawnPulse(); pulseTimer = 2.6 + Math.random() * 2.2; }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      const z = rings[p.ringIdx].z;
      if (p.lastZ !== null && z > p.lastZ + 50) { pulses.splice(i, 1); continue; } // ring wrapped — retire
      p.lastZ = z;
      p.hue = (p.hue + dt * 40) % 360;
      if (visible && !p.passed && z <= heroZ) {
        p.passed = true;
        if (p.walls.includes(currentWall)) { boost = 1; boostHue = p.hue; }
      }
      const f = fadeFor(z) * globalFade;
      if (f <= 0.01) continue;
      const isFull = p.walls.length === 4;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `hsla(${p.hue}, 90%, 65%, ${0.5 * f})`;
      ctx.shadowColor = `hsla(${p.hue}, 90%, 60%, .9)`;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;
      if (isFull) {
        const pts = ringPts(z, rot);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let k = 1; k < 4; k++) ctx.lineTo(pts[k].x, pts[k].y);
        ctx.closePath();
        ctx.stroke();
      } else {
        for (const w of p.walls) {
          const [a, b] = wallSegmentEnds(WALL_NAMES[w], z, rot);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  // ---------------- interactive egg-bot ----------------
  let currentWall = 0; // 0 floor, 1 right, 2 ceiling, 3 left — which side is "selected"
  let heroLocal = { x: 0, y: 0 }; // smoothed world-space position, eases toward the selected wall's center — real value set on first size()
  let heroAngleVec = { x: 1, y: 0 }; // smoothed *relative* facing direction (as a vector, to avoid angle-wrap jumps) — ambient spin is added on top each frame
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
      '<span class="gz-hero-score">Score <b id="gz-hero-score-val">0</b>m</span>' +
      '<span class="gz-hero-help">&#9664; &#9654; Move &nbsp;&middot;&nbsp; <span class="gz-key">SPACE</span> Jump</span>';
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
    const desiredOffset = H * 0.47;
    return Math.max(Z_NEAR + 30, (F * A) / desiredOffset);
  }

  function spawnHazard() {
    hazards.push({ ringIdx: backmostRingIndex(), walls: randomWallPattern(), passed: false, lastZ: null });
  }

  function updateHazards(dt, heroZ) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = Math.max(1.1, 2.6 - distance * 0.002) + Math.random() * 0.8;
      spawnHazard();
    }
    for (let i = hazards.length - 1; i >= 0; i--) {
      const hz = hazards[i];
      const z = rings[hz.ringIdx].z;
      if (hz.lastZ !== null && z > hz.lastZ + 50) { hazards.splice(i, 1); continue; } // ring wrapped — retire
      hz.lastZ = z;
      if (visible && !hz.passed && z <= heroZ) {
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
    }
  }

  // A single dangerous segment, with small perpendicular spikes along its
  // length so it reads as a hazard rather than just a bright line. Only the
  // main line carries a shadow — the spikes are plain strokes, which keeps
  // this cheap even with several hazards and full-ring patterns on screen.
  function drawHazardSegment(a, b, isActive, f) {
    ctx.save();
    ctx.globalAlpha = f;
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = 'rgba(255,140,40,.9)';
    ctx.shadowBlur = isActive ? 14 : 5;
    ctx.strokeStyle = isActive ? 'rgba(255,150,40,1)' : 'rgba(255,120,20,.4)';
    ctx.lineWidth = isActive ? 2.6 : 1.4;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.shadowBlur = 0;

    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const spikeCount = Math.max(4, Math.floor(len / 30));
    const spikeLen = isActive ? 10 : 6;
    ctx.lineWidth = isActive ? 2 : 1.1;
    ctx.strokeStyle = isActive ? 'rgba(255,180,90,.95)' : 'rgba(255,120,20,.35)';
    ctx.beginPath();
    for (let i = 1; i < spikeCount; i++) {
      const t = i / spikeCount;
      const x = a.x + dx * t, y = a.y + dy * t;
      const dir = i % 2 === 0 ? 1 : -1; // alternate in/out for a jagged silhouette
      ctx.moveTo(x, y);
      ctx.lineTo(x + nx * spikeLen * dir, y + ny * spikeLen * dir);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawHazard(hz, rot, globalFade) {
    const z = rings[hz.ringIdx].z;
    const f = fadeFor(z) * globalFade;
    if (f <= 0.02) return;
    const isActive = hz.walls.includes(currentWall);
    for (const w of hz.walls) {
      const [a, b] = wallSegmentEnds(WALL_NAMES[w], z, rot);
      drawHazardSegment(a, b, isActive, f);
    }
  }

  // ---------------- egg-bot sprite ----------------
  // A smooth vector egg (parametric egg curve, not a blocky pixel grid) is
  // pre-rendered once — including its soft glow — to an offscreen canvas.
  // Each frame we just stamp that image with a transform, which is far
  // cheaper than redrawing dozens of shadowed shapes every tick and gives a
  // properly smooth, rounded "egg" silhouette at any zoom level.
  function buildEggSprite() {
    const w = 220, h = 260;
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    const g = off.getContext('2d');
    const ex = w / 2, ey = h / 2 + 6;
    const R = 92, k = 0.42; // k>0 skews the egg narrower at the top, rounder at the bottom — higher k reads as more distinctly "egg" rather than a ball
    g.save();
    g.shadowColor = 'rgba(125,180,255,.95)';
    g.shadowBlur = 26;
    g.fillStyle = 'rgba(218,236,255,.98)';
    g.beginPath();
    const steps = 72;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const r = R * (1 - k * Math.cos(a));
      const x = ex + r * Math.sin(a);
      const y = ey - r * Math.cos(a);
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.fill();
    g.restore();
    return { img: off, w, h, cx: ex, cy: ey, R: R * (1 + k) };
  }
  const eggSprite = buildEggSprite();

  function drawHeroShadow(anchorP, z, angle, groundCellW, globalFade) {
    const f = fadeFor(z) * globalFade * charAlpha;
    if (f <= 0.02) return;
    const p = project(anchorP.x, anchorP.y, z, anchorP.rot);
    const w = groundCellW * 0.5, h = w * 0.32;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.globalAlpha = f * 0.55;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2);
    grad.addColorStop(0, 'rgba(255,140,40,.55)');
    grad.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHero(anchorP, z, angle, elapsed, globalFade, groundCellW) {
    const f = fadeFor(z) * globalFade * charAlpha;
    if (f <= 0.02) return;
    const p = project(anchorP.x, anchorP.y, z, anchorP.rot);
    // Size the egg to sit inside the same grid square it's standing on,
    // rather than an arbitrary fixed size — kept small and pushed toward the
    // edge (via heroDepth's offset) so it never crowds the center headline.
    const targetH = Math.max(6, groundCellW * 0.34);
    const scale = targetH / eggSprite.h;

    ctx.save();
    ctx.translate(p.x, p.y + heroY);
    ctx.rotate(angle);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = f;
    ctx.scale(scale, scale);
    ctx.drawImage(eggSprite.img, -eggSprite.cx, -eggSprite.cy);

    // Two short legs drawn live (cheap flat fills, no shadow) so they can
    // animate a run cycle — one extends while the other tucks up short.
    ctx.fillStyle = 'rgba(218,236,255,.98)';
    const legW = eggSprite.w * 0.1, legShort = eggSprite.w * 0.09, legLong = eggSprite.w * 0.2;
    // Sprite drawImage is offset by (-cx,-cy), so (0,0) here is the egg's own
    // center — legs need to start near the bottom of the body *relative to
    // that center*, not at an absolute sprite-space coordinate.
    const legY = eggSprite.R * 0.86;
    const legPhase = jumping ? null : Math.floor(elapsed * 8) % 2 === 0;
    const leftLen = legPhase === false ? legShort : legLong;
    const rightLen = legPhase === true ? legShort : legLong;
    if (jumping) {
      ctx.fillRect(-eggSprite.w * 0.16 - legW / 2, legY, legW, legShort);
      ctx.fillRect(eggSprite.w * 0.16 - legW / 2, legY, legW, legShort);
    } else {
      ctx.fillRect(-eggSprite.w * 0.16 - legW / 2, legY, legW, leftLen);
      ctx.fillRect(eggSprite.w * 0.16 - legW / 2, legY, legW, rightLen);
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
    updatePulses(dt, rot, globalFade, heroZ);

    // Ease the character's world position toward whichever wall is selected —
    // it glides across the tunnel's cross-section rather than the grid spinning.
    const target = wallPoint(WALL_NAMES[currentWall], 0, 0);
    heroLocal.x += (target.x - heroLocal.x) * Math.min(1, dt * 7);
    heroLocal.y += (target.y - heroLocal.y) * Math.min(1, dt * 7);

    // Ease the wall-relative facing angle (via vector components, so it
    // always turns the short way around), then add the grid's own ambient
    // spin on top — this keeps the egg's feet pointing outward and its head
    // toward center even as the whole square slowly rotates underneath it.
    const targetAngle = WALL_ANGLE[currentWall];
    const tv = { x: Math.cos(targetAngle), y: Math.sin(targetAngle) };
    heroAngleVec.x += (tv.x - heroAngleVec.x) * Math.min(1, dt * 7);
    heroAngleVec.y += (tv.y - heroAngleVec.y) * Math.min(1, dt * 7);
    const heroAngle = rot + Math.atan2(heroAngleVec.y, heroAngleVec.x);

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
    updateHazards(dt, heroZ);

    const sortedHz = hazards.slice().sort((a, b) => rings[b.ringIdx].z - rings[a.ringIdx].z);
    for (const hz of sortedHz) drawHazard(hz, rot, globalFade);

    const groundCellW = cellWidthAt(heroZ, rot);
    drawHeroShadow({ x: heroLocal.x, y: heroLocal.y, rot }, heroZ, heroAngle, groundCellW, globalFade);
    drawHero({ x: heroLocal.x, y: heroLocal.y, rot }, heroZ, heroAngle, elapsed, globalFade, groundCellW);

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
    const z = heroDepth();
    const groundCellW = cellWidthAt(z, 0);
    drawHero({ x: heroLocal.x, y: heroLocal.y, rot: 0 }, z, WALL_ANGLE[currentWall], 0, 1, groundCellW);
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
