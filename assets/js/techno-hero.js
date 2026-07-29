/* Homepage-only hero: flying endlessly through a 4-sided grid tunnel inside
   the PC — floor, ceiling, and both walls converge to a shared vanishing
   point, with glowing rings sliding toward the viewer and stylized PC
   component silhouettes (chip, RAM, capacitors, fan, heatsink fins) receding
   past on the walls. Pure canvas perspective-projection math (screenX = cx +
   worldX*f/z), no external images, no image-gen API, no literal rain. */
(function () {
  const canvas = document.getElementById('techno-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W, H, DPR, cx, cy;
  const F = 300;        // focal length
  const Z_NEAR = 60, Z_FAR = 1500;
  let A, B;              // tunnel half-width / half-height in world units
  let rings = [];
  let comps = [];

  function project(x, y, z) {
    const s = F / z;
    return { x: cx + x * s, y: cy + y * s, s };
  }

  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx = W / 2; cy = H * 0.46;
    A = W * 0.95; B = H * 0.95;
    buildRings();
    buildComponents();
  }

  function buildRings() {
    rings = [];
    const count = 9;
    for (let i = 0; i < count; i++) {
      rings.push({ z: Z_NEAR + (i / count) * (Z_FAR - Z_NEAR) });
    }
  }

  // Components live on one of the 4 walls at a fixed local (u,v) in [-1,1],
  // and are assigned a ring index so they travel in lockstep with a ring.
  function buildComponents() {
    const defs = [
      { wall: 'floor', u: -0.5, kind: 'ram' },
      { wall: 'floor', u: 0.35, kind: 'heatsink' },
      { wall: 'ceiling', u: -0.3, kind: 'capacitor' },
      { wall: 'ceiling', u: 0.5, kind: 'capacitor' },
      { wall: 'left', v: 0.1, kind: 'chip' },
      { wall: 'right', v: -0.15, kind: 'fan' },
      { wall: 'right', v: 0.45, kind: 'heatsink' },
      { wall: 'left', v: -0.4, kind: 'ram' },
    ];
    comps = defs.map((d, i) => ({ ...d, ringIndex: i % rings.length, spin: Math.random() * Math.PI * 2 }));
  }

  function wallPoint(wall, u, v, z) {
    // u,v in [-1,1] local coords on that wall's plane
    if (wall === 'floor') return { x: u * A, y: B, z };
    if (wall === 'ceiling') return { x: u * A, y: -B, z };
    if (wall === 'left') return { x: -A, y: v * B, z };
    return { x: A, y: v * B, z }; // right
  }

  function fadeFor(z) {
    // fog: dim when far away, fade out again just before it flies past the camera
    const nearFade = Math.min(1, (z - Z_NEAR) / 90);
    const farFade = Math.min(1, (Z_FAR - z) / 260);
    return Math.max(0, Math.min(1, nearFade * (0.35 + 0.65 * farFade)));
  }

  function strokeRail(wall, u, v) {
    const p1 = wallPoint(wall, u, v, Z_FAR);
    const p2 = wallPoint(wall, u, v, Z_NEAR);
    const a = project(p1.x, p1.y, p1.z);
    const b = project(p2.x, p2.y, p2.z);
    const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    grad.addColorStop(0, 'rgba(61,139,255,0)');
    grad.addColorStop(0.35, 'rgba(61,139,255,.35)');
    grad.addColorStop(1, 'rgba(120,180,255,.7)');
    ctx.strokeStyle = grad;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  function drawRing(z) {
    const f = fadeFor(z);
    if (f <= 0.01) return;
    const corners = [
      project(-A, -B, z), project(A, -B, z), project(A, B, z), project(-A, B, z),
    ];
    ctx.strokeStyle = `rgba(138,180,237,${0.55 * f})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(corners[i].x, corners[i].y);
    ctx.closePath();
    ctx.stroke();
  }

  function drawComponent(c, t) {
    const ring = rings[c.ringIndex];
    const z = ring.z;
    const f = fadeFor(z);
    if (f <= 0.02) return;
    const u = c.u ?? 0, v = c.v ?? 0;
    const wp = wallPoint(c.wall, u, v, z);
    const p = project(wp.x, wp.y, wp.z);
    const scale = p.s * 26; // icon size scales with perspective depth
    if (scale < 1.2) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = f;
    const glow = 'rgba(250,157,40,.9)';
    const line = 'rgba(138,180,237,.85)';
    ctx.lineWidth = Math.max(1, scale * 0.06);

    if (c.kind === 'chip') {
      ctx.strokeStyle = line;
      ctx.strokeRect(-scale, -scale, scale * 2, scale * 2);
      ctx.fillStyle = 'rgba(20,106,219,.35)';
      ctx.fillRect(-scale, -scale, scale * 2, scale * 2);
      ctx.strokeStyle = glow;
      const pins = 4;
      for (let i = 0; i < pins; i++) {
        const off = -scale + (i + 0.5) * (scale * 2 / pins);
        ctx.beginPath(); ctx.moveTo(off, -scale); ctx.lineTo(off, -scale * 1.4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(off, scale); ctx.lineTo(off, scale * 1.4); ctx.stroke();
      }
    } else if (c.kind === 'ram') {
      ctx.strokeStyle = line;
      ctx.strokeRect(-scale * 1.6, -scale * 0.5, scale * 3.2, scale);
      ctx.fillStyle = 'rgba(20,106,219,.3)';
      ctx.fillRect(-scale * 1.6, -scale * 0.5, scale * 3.2, scale);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i % 2 === 0 ? glow : 'rgba(250,157,40,.35)';
        ctx.fillRect(-scale * 1.4 + i * scale * 0.62, -scale * 0.3, scale * 0.3, scale * 0.6);
      }
    } else if (c.kind === 'capacitor') {
      ctx.strokeStyle = line;
      ctx.beginPath(); ctx.arc(0, 0, scale * 0.9, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-scale * 0.9, 0); ctx.lineTo(scale * 0.9, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -scale * 0.9); ctx.lineTo(0, scale * 0.9); ctx.stroke();
    } else if (c.kind === 'fan') {
      const spin = c.spin + t * 1.6;
      ctx.strokeStyle = line;
      ctx.beginPath(); ctx.arc(0, 0, scale * 1.1, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = glow;
      const blades = 5;
      for (let i = 0; i < blades; i++) {
        const ang = spin + (i / blades) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * scale * 1.05, Math.sin(ang) * scale * 1.05);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(0, 0, scale * 0.18, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill();
    } else if (c.kind === 'heatsink') {
      ctx.strokeStyle = line;
      const fins = 6;
      for (let i = 0; i < fins; i++) {
        const off = -scale * 1.3 + i * (scale * 2.6 / fins);
        ctx.beginPath(); ctx.moveTo(off, -scale); ctx.lineTo(off, scale); ctx.stroke();
      }
    }
    ctx.restore();
  }

  let raf, last = 0, elapsed = 0;
  const SPEED = 230; // world units per second, tunnel travel speed

  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts; elapsed += dt;
    ctx.clearRect(0, 0, W, H);

    // persistent rail skeleton — 5 rails per wall, converging to the vanishing point
    const stops = [-1, -0.5, 0, 0.5, 1];
    for (const u of stops) { strokeRail('floor', u, 0); strokeRail('ceiling', u, 0); }
    for (const v of stops) { strokeRail('left', 0, v); strokeRail('right', 0, v); }

    // rings + components travel toward the viewer, looping infinitely
    for (const r of rings) {
      r.z -= SPEED * dt;
      if (r.z < Z_NEAR) r.z += (Z_FAR - Z_NEAR);
      drawRing(r.z);
    }
    for (const c of comps) drawComponent(c, elapsed);

    raf = requestAnimationFrame(frame);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    const stops = [-1, -0.5, 0, 0.5, 1];
    for (const u of stops) { strokeRail('floor', u, 0); strokeRail('ceiling', u, 0); }
    for (const v of stops) { strokeRail('left', 0, v); strokeRail('right', 0, v); }
    for (const r of rings) drawRing(r.z);
    for (const c of comps) drawComponent(c, 0);
  }

  window.addEventListener('resize', size);
  size();

  if (reduceMotion) {
    drawStatic();
  } else {
    raf = requestAnimationFrame(frame);
  }
})();
