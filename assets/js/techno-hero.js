/* Homepage-only fixed background: a full-page grid tunnel through the inside
   of a PC — and a small interactive bit riding along it. An egg-bot character
   sits on whichever of the tunnel's 4 sides (floor/right/ceiling/left) is
   currently "down," rotating smoothly between them on Left/Right (or A/D),
   and jumping (Space/Up) over the red hazard lines that travel out of the
   vanishing point toward the viewer. Scrolling away from the hero fades the
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
  const ROT_SPEED = 0.045; // slow ambient roll, radians/sec — the grid always drifts

  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx = W / 2; cy = H / 2;
    A = Math.max(W, H) * 0.72; B = A;
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
  // wall index (0=floor,1=right,2=ceiling,3=left) <-> the named walls above.
  const WALL_NAMES = ['floor', 'right', 'ceiling', 'left'];

  function fadeFor(z) {
    const nearFade = Math.min(1, (z - Z_NEAR) / 320); // fade out slowly as it nears the outer edge
    const farFade = Math.min(1, (Z_FAR - z) / 820); // fade in very slowly as it spawns near the vanishing point
    // No opacity floor here — a freshly spawned ring must ease up from 0,
    // not pop straight to a minimum brightness the instant it respawns.
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

  function drawRing(z, rot, globalFade) {
    const f = fadeFor(z) * globalFade;
    if (f <= 0.01) return;
    const pts = [[-A, -B], [A, -B], [A, B], [-A, B]].map(([x, y]) => project(x, y, z, rot));
    ctx.strokeStyle = `rgba(138,180,237,${0.32 * f})`;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.stroke();
  }

  // RGB pulse rings: spawn near the vanishing point and sweep OUWARD toward
  // the viewer (same direction as everything else in the tunnel), hue-cycling,
  // using the same symmetric fadeFor() as the structural rings.
  let pulseTimer = 0;
  function spawnPulse() {
    pulses.push({ z: Z_FAR - 20, hue: Math.random() * 360 });
  }
  function updatePulses(dt, rot, globalFade) {
    pulseTimer -= dt;
    if (pulseTimer <= 0) { spawnPulse(); pulseTimer = 2.6 + Math.random() * 2.2; }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.z -= (Z_FAR - Z_NEAR) * 0.16 * dt * 3.2;
      p.hue = (p.hue + dt * 40) % 360;
      if (p.z <= Z_NEAR) { pulses.splice(i, 1); continue; }
      const f = fadeFor(p.z) * globalFade;
      if (f <= 0.01) continue;
      const pts = [[-A, -B], [A, -B], [A, B], [-A, B]].map(([x, y]) => project(x, y, p.z, rot));
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
    }
  }

  // ---------------- interactive egg-bot ----------------
  let currentWall = 0; // 0 floor, 1 right, 2 ceiling, 3 left
  let wallRot = 0, wallRotTarget = 0;
  let heroY = 0, heroVy = 0, jumping = false;
  let distance = 0, speed = 60, hitFlash = 0;
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
    wrap.innerHTML = '<span class="gz-hero-score">High Score <b>0</b>m</span>';
    document.body.appendChild(wrap);
    const style = document.createElement('style');
    style.textContent = `
      #gz-hero-hud{position:fixed;top:76px;left:clamp(1rem,4vw,2.2rem);z-index:40;
        font-family:'Montserrat','Segoe UI',sans-serif;font-weight:800;letter-spacing:.04em;
        font-size:.78rem;text-transform:uppercase;color:#cfe0ff;text-shadow:0 0 10px rgba(61,139,255,.55);
        pointer-events:none;transition:opacity .5s ease;opacity:1}
      #gz-hero-hud b{color:#FA9D28;text-shadow:0 0 10px rgba(250,157,40,.6)}
      #gz-hero-hud.hidden{opacity:0}
      @media(max-width:640px){#gz-hero-hud{top:64px;font-size:.68rem}}
    `;
    document.head.appendChild(style);
    return wrap;
  }

  function rotateToWall(delta) {
    currentWall = (currentWall + delta + 4) % 4;
    wallRotTarget = -currentWall * (Math.PI / 2);
    while (wallRotTarget - wallRot > Math.PI) wallRotTarget -= Math.PI * 2;
    while (wallRotTarget - wallRot < -Math.PI) wallRotTarget += Math.PI * 2;
  }
  function jump() {
    if (!jumping) { jumping = true; heroVy = -420; }
  }
  window.addEventListener('keydown', e => {
    if (!visible || e.repeat) return;
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); rotateToWall(-1); }
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); rotateToWall(1); }
    else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); jump(); }
  });

  // The hero "stands" on the current wall at a screen-anchored depth so it
  // always sits in frame no matter the window size (see desiredOffset trick).
  function heroScreenAnchor(rot) {
    const desiredOffset = H * 0.42;
    const z = Math.max(Z_NEAR + 30, (F * B) / desiredOffset);
    const wp = wallPoint(WALL_NAMES[0], 0, 0); // local floor-center point; wall identity is baked into rot
    return { z, p: project(wp.x, wp.y, z, rot) };
  }

  function spawnHazard() {
    hazards.push({ wall: Math.floor(Math.random() * 4), z: Z_FAR, passed: false });
  }

  function updateHazards(dt, rot, heroZ) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = Math.max(1.1, 2.6 - distance * 0.002) + Math.random() * 0.8;
      spawnHazard();
    }
    const depthSpeed = 230 * 2.1;
    for (let i = hazards.length - 1; i >= 0; i--) {
      const hz = hazards[i];
      hz.z -= depthSpeed * dt;
      if (visible && !hz.passed && hz.z <= heroZ) {
        hz.passed = true;
        if (hz.wall === currentWall && !jumping) {
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

  function drawHazard(hz, rot, globalFade) {
    const f = fadeFor(hz.z) * globalFade;
    if (f <= 0.02) return;
    const wall = WALL_NAMES[hz.wall];
    const isFloorLike = wall === 'floor' || wall === 'ceiling';
    const p1 = wallPoint(wall, isFloorLike ? -1 : 0, isFloorLike ? 0 : -1);
    const p2 = wallPoint(wall, isFloorLike ? 1 : 0, isFloorLike ? 0 : 1);
    const a = project(p1.x, p1.y, hz.z, rot), b = project(p2.x, p2.y, hz.z, rot);
    const isActive = hz.wall === currentWall;
    ctx.save();
    ctx.globalAlpha = f;
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = 'rgba(255,46,120,.9)';
    ctx.shadowBlur = isActive ? 16 : 6;
    ctx.strokeStyle = isActive ? 'rgba(255,70,140,1)' : 'rgba(255,46,120,.4)';
    ctx.lineWidth = isActive ? 2.6 : 1.4;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.restore();
  }

  // Egg-bot: cream body, orange trim, dark visor — same blocky pixel
  // fidelity as the rest of the tunnel's glowing linework, echoing Newegg's
  // own egg-shaped mascot.
  function drawHero(anchor, elapsed, globalFade) {
    const f = fadeFor(anchor.z) * globalFade * charAlpha;
    if (f <= 0.02) return;
    const px = Math.max(1, anchor.p.s * 60);
    if (px < 1) return;
    const bob = jumping ? 0 : Math.sin(elapsed * 2.4) * 0.3;

    ctx.save();
    ctx.translate(anchor.p.x, anchor.p.y + heroY);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = f;

    const ROWS = 8; // row 7 = feet/anchor row
    const cream = 'rgba(240,244,255,.95)';
    const orange = 'rgba(250,157,40,.95)';
    const visor = 'rgba(8,20,46,.96)';
    const eye = 'rgba(210,235,255,.95)';

    function block(c, r, w, h, color, glow) {
      ctx.fillStyle = color;
      ctx.shadowColor = glow || color;
      ctx.shadowBlur = px * 0.35;
      ctx.fillRect((c - 3.5) * px, (r - (ROWS - 1) + bob) * px, w * px * 0.94, h * px * 0.94);
    }

    // egg body (narrow top, wide middle, tapered bottom)
    block(2.5, 0, 2, 1, cream, 'rgba(180,200,255,.5)');
    block(1.5, 1, 4, 1, cream);
    block(1, 2, 5, 2, cream);
    block(1.5, 4, 4, 1, cream);
    block(2, 5, 3, 1, orange); // orange belly trim
    // visor / face
    block(1.6, 2.2, 3.8, 1.4, visor, 'rgba(61,139,255,.6)');
    block(2, 2.6, 0.6, 0.6, eye);
    block(3.4, 2.6, 0.6, 0.6, eye);
    // feet
    const stride = jumping ? 0 : Math.floor(elapsed * 3) % 2;
    block(1.4 + stride * 0.3, 6, 1, 1, orange);
    block(3.6 - stride * 0.3, 6, 1, 1, orange);

    ctx.restore();
  }

  let raf, last = 0, elapsed = 0;
  const SPEED = 230;

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
    const ambientRot = elapsed * ROT_SPEED;
    const globalFade = Math.min(1, elapsed / 3.2); // slow overall fade-in on load
    const hue = (200 + elapsed * 6) % 360;

    wallRot += (wallRotTarget - wallRot) * Math.min(1, dt * 9);
    const rot = ambientRot + wallRot;
    charAlpha += ((visible ? 1 : 0) - charAlpha) * Math.min(1, dt * 4);

    ctx.clearRect(0, 0, W, H);

    const stops = [-1, -0.5, 0, 0.5, 1];
    for (const u of stops) { strokeRail('floor', u, 0, rot, globalFade, hue); strokeRail('ceiling', u, 0, rot, globalFade, hue); }
    for (const v of stops) { strokeRail('left', 0, v, rot, globalFade, hue); strokeRail('right', 0, v, rot, globalFade, hue); }

    for (const r of rings) {
      r.z -= SPEED * dt;
      if (r.z < Z_NEAR) r.z += (Z_FAR - Z_NEAR);
      drawRing(r.z, rot, globalFade);
    }

    updatePulses(dt, rot, globalFade);

    const anchor = heroScreenAnchor(rot);

    if (visible) {
      distance += speed * dt * 0.01 * (1 + Math.min(2, distance * 0.002));
      hitFlash = Math.max(0, hitFlash - dt * 2.2);
      if (jumping) {
        heroVy += 1400 * dt;
        heroY += heroVy * dt;
        if (heroY >= 0) { heroY = 0; heroVy = 0; jumping = false; }
      }
      if (hud) {
        const shown = Math.max(highScore, distance);
        hud.querySelector('b').textContent = Math.floor(shown);
      }
    }
    updateHazards(dt, rot, anchor.z);

    const sortedHz = hazards.slice().sort((a, b) => b.z - a.z);
    for (const hz of sortedHz) drawHazard(hz, rot, globalFade);

    drawHero(anchor, elapsed, globalFade);

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
    for (const u of stops) { strokeRail('floor', u, 0, 0, 1, 200); strokeRail('ceiling', u, 0, 0, 1, 200); }
    for (const v of stops) { strokeRail('left', 0, v, 0, 1, 200); strokeRail('right', 0, v, 0, 1, 200); }
    for (const r of rings) drawRing(r.z, 0, 1);
    const anchor = heroScreenAnchor(0);
    drawHero(anchor, 0, 1);
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
