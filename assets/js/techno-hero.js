/* Homepage-only fixed background: a full-page grid tunnel through the inside
   of a PC. Floor/ceiling/walls converge to a shared vanishing point and
   slowly roll; structural rings fly toward the viewer; RGB pulse rings sweep
   the opposite way toward the vanishing point and fade there; PC-component
   silhouettes (chip, RAM, capacitors, fan, heatsink) spawn at random walls
   and times with a glow/bloom look. Pure canvas perspective-projection math
   (screenX = cx + rotated(worldX)*f/z) — no external images, no image-gen
   API, no literal rain/skyline. Fixed position, so it stays put behind the
   whole page while you scroll. */
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
  let comps = [];
  let pulses = [];
  const ROT_SPEED = 0.045; // slow roll, radians/sec

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
    grad.addColorStop(0.35, `hsla(${hue}, 70%, 55%, ${0.16 * globalFade})`);
    grad.addColorStop(1, `hsla(${hue + 30}, 80%, 62%, ${0.34 * globalFade})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
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

  // RGB pulse rings: spawn at the near edge, sweep inward toward the
  // vanishing point (opposite of the main rings), hue-cycling, fading in as
  // they spawn and fading out as they approach the center.
  let pulseTimer = 0;
  function spawnPulse() {
    pulses.push({ z: Z_NEAR + 20, hue: Math.random() * 360 });
  }
  function updatePulses(dt, rot, globalFade) {
    pulseTimer -= dt;
    if (pulseTimer <= 0) { spawnPulse(); pulseTimer = 2.6 + Math.random() * 2.2; }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.z += (Z_FAR - Z_NEAR) * 0.16 * dt * 3.2;
      p.hue = (p.hue + dt * 40) % 360;
      if (p.z >= Z_FAR - 40) { pulses.splice(i, 1); continue; }
      const nearIn = Math.min(1, (p.z - Z_NEAR) / 300);
      const farOut = Math.min(1, (Z_FAR - 40 - p.z) / 180);
      const f = nearIn * farOut * globalFade;
      if (f <= 0.01) continue;
      const pts = [[-A, -B], [A, -B], [A, B], [-A, B]].map(([x, y]) => project(x, y, p.z, rot));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `hsla(${p.hue}, 90%, 65%, ${0.45 * f})`;
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

  // PC components: randomized spawn (wall, position, kind, timing) rather
  // than a fixed set, so they feel organic instead of static set-dressing.
  const KINDS = ['chip', 'ram', 'capacitor', 'fan', 'heatsink'];
  const WALLS = ['floor', 'ceiling', 'left', 'right'];
  let spawnTimer = 0;
  const MAX_COMPONENTS = 5;
  function maybeSpawn(dt) {
    spawnTimer -= dt;
    if (spawnTimer > 0 || comps.length >= MAX_COMPONENTS) return;
    spawnTimer = 1.1 + Math.random() * 1.6;
    comps.push({
      wall: WALLS[(Math.random() * WALLS.length) | 0],
      u: Math.random() * 1.5 - 0.75,
      v: Math.random() * 1.5 - 0.75,
      kind: KINDS[(Math.random() * KINDS.length) | 0],
      z: Z_FAR - Math.random() * 200,
      spin: Math.random() * Math.PI * 2,
      spawnT: 0,
    });
  }
  function updateComponents(dt) {
    for (let i = comps.length - 1; i >= 0; i--) {
      const c = comps[i];
      c.z -= SPEED * dt;
      c.spawnT += dt;
      if (c.z < Z_NEAR - 40) comps.splice(i, 1);
    }
  }

  function drawComponent(c, rot, elapsed, globalFade) {
    const f = fadeFor(c.z) * globalFade * Math.min(1, c.spawnT / 1.4);
    if (f <= 0.02) return;
    const wp = wallPoint(c.wall, c.u, c.v);
    const p = project(wp.x, wp.y, c.z, rot);
    const scale = p.s * 42;
    if (scale < 1.4) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = f * 0.62;
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = 'rgba(120,180,255,.75)';
    ctx.shadowBlur = Math.max(4, scale * 0.35);
    const line = 'rgba(160,200,255,.62)';
    const fillCool = 'rgba(20,106,219,.16)';
    const glow = 'rgba(250,157,40,.65)';
    ctx.lineWidth = Math.max(1, scale * 0.05);

    if (c.kind === 'chip') {
      ctx.strokeStyle = line; ctx.fillStyle = fillCool;
      ctx.fillRect(-scale, -scale, scale * 2, scale * 2);
      ctx.strokeRect(-scale, -scale, scale * 2, scale * 2);
      ctx.strokeStyle = glow; ctx.shadowColor = glow;
      const pins = 5;
      for (let i = 0; i < pins; i++) {
        const off = -scale + (i + 0.5) * (scale * 2 / pins);
        ctx.beginPath(); ctx.moveTo(off, -scale); ctx.lineTo(off, -scale * 1.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(off, scale); ctx.lineTo(off, scale * 1.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-scale, off - scale); ctx.lineTo(-scale * 1.5, off - scale); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(scale, off - scale); ctx.lineTo(scale * 1.5, off - scale); ctx.stroke();
      }
      ctx.strokeStyle = line; ctx.shadowBlur = scale * 0.2;
      ctx.strokeRect(-scale * 0.45, -scale * 0.45, scale * 0.9, scale * 0.9);
    } else if (c.kind === 'ram') {
      ctx.strokeStyle = line; ctx.fillStyle = fillCool;
      ctx.fillRect(-scale * 1.7, -scale * 0.55, scale * 3.4, scale * 1.1);
      ctx.strokeRect(-scale * 1.7, -scale * 0.55, scale * 3.4, scale * 1.1);
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 === 0 ? glow : 'rgba(250,157,40,.4)';
        ctx.fillRect(-scale * 1.5 + i * scale * 0.56, -scale * 0.3, scale * 0.26, scale * 0.6);
      }
    } else if (c.kind === 'capacitor') {
      ctx.strokeStyle = line; ctx.fillStyle = fillCool;
      ctx.beginPath(); ctx.arc(0, 0, scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = glow; ctx.shadowColor = glow;
      ctx.beginPath(); ctx.moveTo(-scale * 0.75, 0); ctx.lineTo(scale * 0.75, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -scale * 0.75); ctx.lineTo(0, scale * 0.75); ctx.stroke();
      ctx.strokeStyle = line;
      ctx.beginPath(); ctx.arc(0, 0, scale * 1.25, 0, Math.PI * 2); ctx.stroke();
    } else if (c.kind === 'fan') {
      const spin = c.spin + elapsed * 2.1;
      ctx.strokeStyle = line;
      ctx.beginPath(); ctx.arc(0, 0, scale * 1.15, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = fillCool;
      ctx.beginPath(); ctx.arc(0, 0, scale * 1.15, 0, Math.PI * 2); ctx.fill();
      const blades = 6;
      for (let i = 0; i < blades; i++) {
        const ang = spin + (i / blades) * Math.PI * 2;
        const midAng = ang + 0.35;
        ctx.strokeStyle = i % 2 === 0 ? glow : line;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(Math.cos(midAng) * scale * 0.7, Math.sin(midAng) * scale * 0.7,
          Math.cos(ang) * scale * 1.05, Math.sin(ang) * scale * 1.05);
        ctx.stroke();
      }
      ctx.fillStyle = glow; ctx.shadowColor = glow;
      ctx.beginPath(); ctx.arc(0, 0, scale * 0.2, 0, Math.PI * 2); ctx.fill();
    } else if (c.kind === 'heatsink') {
      ctx.strokeStyle = line;
      const fins = 7;
      for (let i = 0; i < fins; i++) {
        const off = -scale * 1.4 + i * (scale * 2.8 / fins);
        ctx.beginPath(); ctx.moveTo(off, -scale * 1.1); ctx.lineTo(off, scale * 1.1); ctx.stroke();
      }
      ctx.strokeStyle = glow; ctx.shadowColor = glow;
      ctx.beginPath(); ctx.moveTo(-scale * 1.4, -scale * 1.1); ctx.lineTo(scale * 1.4, -scale * 1.1); ctx.stroke();
    }
    ctx.restore();
  }

  // Pixel "hero" sprite: a small blocky 8-bit-style character that idles and
  // paces back and forth along the floor grid line, in the same projected
  // world space as everything else (no images — plain fillRect blocks,
  // projected + scaled like the PC components).
  const HERO_RANGE = 0.5; // how far it walks along the floor's u-axis
  function drawHero(rot, elapsed, globalFade) {
    const walkPhase = elapsed * 0.32;
    const u = Math.sin(walkPhase) * HERO_RANGE;
    const movingRight = Math.cos(walkPhase) >= 0;
    // Solve for the depth (z) that puts the floor point at a fixed, comfortable
    // spot on screen (rather than a fixed world z, which — at these near
    // depths — projects the floor's outer edge far below the viewport on
    // shorter windows). This keeps the sprite inside frame at any size.
    const desiredOffset = H * 0.42;
    const heroZ = Math.max(Z_NEAR + 30, (F * B) / desiredOffset);
    const wp = wallPoint('floor', u, 0);
    const p = project(wp.x, wp.y, heroZ, rot);
    const f = fadeFor(heroZ) * globalFade;
    if (f <= 0.03) return;
    const px = Math.max(1, p.s * 70); // one "pixel" block, in screen px
    if (px < 1.2) return;

    const walking = Math.abs(Math.cos(walkPhase)) > 0.03; // pauses briefly at each turn = idle
    const stride = walking ? Math.floor(elapsed * 6.5) % 2 : 0;
    const bob = walking ? 0 : Math.sin(elapsed * 2.2) * 0.4; // idle breathing bob

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(movingRight ? 1 : -1, 1);
    ctx.globalAlpha = f;
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = 'rgba(255,170,60,.9)';
    ctx.shadowBlur = Math.max(2, px * 0.3);
    ctx.fillStyle = 'rgba(255,200,110,1)';

    const ROWS = 9; // 0=head top ... 8=feet (anchor row, sits at the floor point)
    const blocks = [];
    for (let r = 0; r <= 1; r++) for (let c = 2; c <= 4; c++) blocks.push([c, r]);        // head
    for (let r = 2; r <= 4; r++) for (let c = 1; c <= 5; c++) blocks.push([c, r]);        // torso
    const armSwing = stride === 0 ? 0 : 1;
    blocks.push([0, 2 + armSwing]);                                                       // back arm
    blocks.push([6, 3 - armSwing]);                                                       // front arm
    if (stride === 0) {
      for (let r = 5; r <= 6; r++) blocks.push([2, r]);
      for (let r = 5; r <= 8; r++) blocks.push([4, r]);
    } else {
      for (let r = 5; r <= 8; r++) blocks.push([2, r]);
      for (let r = 5; r <= 6; r++) blocks.push([4, r]);
    }
    blocks.forEach(([c, r]) => {
      ctx.fillRect((c - 3) * px, (r - (ROWS - 1) + bob) * px, px * 0.92, px * 0.92);
    });
    ctx.restore();
  }

  let raf, last = 0, elapsed = 0;
  const SPEED = 230;

  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts; elapsed += dt;
    const rot = elapsed * ROT_SPEED;
    const globalFade = Math.min(1, elapsed / 3.2); // slow overall fade-in on load
    const hue = (200 + elapsed * 6) % 360; // slow RGB drift across the grid lines

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

    maybeSpawn(dt);
    updateComponents(dt);
    for (const c of comps) drawComponent(c, rot, elapsed, globalFade);

    drawHero(rot, elapsed, globalFade);

    raf = requestAnimationFrame(frame);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    const stops = [-1, -0.5, 0, 0.5, 1];
    for (const u of stops) { strokeRail('floor', u, 0, 0, 1, 200); strokeRail('ceiling', u, 0, 0, 1, 200); }
    for (const v of stops) { strokeRail('left', 0, v, 0, 1, 200); strokeRail('right', 0, v, 0, 1, 200); }
    for (const r of rings) drawRing(r.z, 0, 1);
    drawHero(0, 0, 1);
  }

  window.addEventListener('resize', size);
  size();

  if (reduceMotion) {
    drawStatic();
  } else {
    raf = requestAnimationFrame(frame);
  }
})();
