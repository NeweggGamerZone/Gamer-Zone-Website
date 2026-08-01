/* Homepage-only fixed background: a purely decorative rotating perspective
   grid tunnel — the "spiraling squares" the site is themed around. No
   gameplay lives here anymore; the interactive mini-games moved into a
   bounded arcade panel (see gz-arcade.js) so they no longer swing across
   or overlap the headline/CTA text. This file just keeps the ambient tunnel
   spinning gently behind everything. Pure canvas math, no images. */
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

  let raf, last = 0, elapsed = 0;

  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts; elapsed += dt;
    const rot = elapsed * ROT_SPEED;
    const globalFade = Math.min(1, elapsed / 3.2) * 0.85;
    const hue = (200 + elapsed * 6) % 360;

    ctx.clearRect(0, 0, W, H);
    const stops = [-1, -0.5, 0, 0.5, 1];
    for (const u of stops) { strokeRail('floor', u, 0, rot, globalFade, hue); strokeRail('ceiling', u, 0, rot, globalFade * 0.6, hue); }
    for (const v of stops) { strokeRail('left', 0, v, rot, globalFade * 0.6, hue); strokeRail('right', 0, v, rot, globalFade * 0.6, hue); }
    for (const r of rings) {
      r.z -= 92 * dt;
      if (r.z < Z_NEAR) r.z += (Z_FAR - Z_NEAR);
      drawRing(r.z, rot, globalFade);
    }
    raf = requestAnimationFrame(frame);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    const stops = [-1, -0.5, 0, 0.5, 1];
    for (const u of stops) { strokeRail('floor', u, 0, 0, 0.6, 200); strokeRail('ceiling', u, 0, 0, 0.4, 200); }
    for (const v of stops) { strokeRail('left', 0, v, 0, 0.4, 200); strokeRail('right', 0, v, 0, 0.4, 200); }
    for (const r of rings) drawRing(r.z, 0, 0.5);
  }

  window.addEventListener('resize', size);
  size();

  if (reduceMotion) {
    drawStatic();
  } else {
    raf = requestAnimationFrame(frame);
  }
})();
