/* Homepage-only fixed background: a purely decorative, non-interactive
   perspective tunnel — the camera flies forever toward a vanishing point
   while a series of ring outlines travel from far away toward the viewer,
   same as the site's original grid-tunnel look. The difference: each ring
   isn't always a square. Every ring works through the same fixed shape
   sequence (square -> triangle -> star -> pentagon -> hexagon -> circle)
   one step at a time, advancing a shape each time it laps back out to the
   far distance — so the tunnel itself is constantly changing shape as you
   travel through it, not just receding squares. No score, no input, no
   game logic here — purely decorative. Pure canvas math, no images. */
(function () {
  const canvas = document.getElementById('techno-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W, H, DPR, cx, cy;
  const F = 300;
  const Z_NEAR = 60, Z_FAR = 1500;
  const SPEED = 92; // same travel pace the site's tunnel/cube previously settled on
  const ROT_SPEED = 0.045;

  // Fixed progression every ring works through, one step at a time.
  const SHAPES = ['square', 'triangle', 'star', 'pentagon', 'hexagon', 'circle'];

  let A; // ring radius, sized to the viewport
  let rings = [];
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
  }

  function buildRings() {
    rings = [];
    const count = 9;
    for (let i = 0; i < count; i++) {
      rings.push({ z: Z_NEAR + (i / count) * (Z_FAR - Z_NEAR), shapeIdx: i % SHAPES.length });
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

  // Local (unrotated, unprojected) outline points for a shape, radius r.
  function shapePoints(type, r) {
    if (type === 'circle') {
      const n = 44, pts = [];
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 / n) * i;
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      return pts;
    }
    if (type === 'star') {
      const spikes = 5, outer = r, inner = r * 0.45, pts = [];
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
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  }

  // Radiating spokes from the vanishing point out to the frame edge —
  // same gradient treatment as the site's original rail lines, but at
  // fixed angles around a circle instead of the 4 walls of a square, so
  // they still read as "flying through a tunnel" no matter which shape
  // the rings themselves currently are.
  function strokeSpoke(angle, rot, globalFade, hue) {
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const a = project(dx * A, dy * A, Z_FAR, rot);
    const b = project(dx * A, dy * A, Z_NEAR, rot);
    const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    grad.addColorStop(0, `hsla(${hue}, 70%, 55%, 0)`);
    grad.addColorStop(0.35, `hsla(${hue}, 70%, 55%, ${0.26 * globalFade})`);
    grad.addColorStop(1, `hsla(${hue + 30}, 85%, 65%, ${0.5 * globalFade})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  function drawRing(ring, rot, globalFade, hue) {
    const f = fadeFor(ring.z) * globalFade;
    if (f <= 0.01) return;
    const pts = shapePoints(SHAPES[ring.shapeIdx], A);
    const proj = pts.map(([x, y]) => project(x, y, ring.z, rot));
    ctx.strokeStyle = `hsla(${hue}, 72%, 62%, ${0.36 * f})`;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(proj[0].x, proj[0].y);
    for (let i = 1; i < proj.length; i++) ctx.lineTo(proj[i].x, proj[i].y);
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
    for (const a of SPOKES) strokeSpoke(a, rot, globalFade, hue);
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      r.z -= SPEED * dt;
      if (r.z < Z_NEAR) { r.z += (Z_FAR - Z_NEAR); r.shapeIdx = (r.shapeIdx + 1) % SHAPES.length; }
      drawRing(r, rot, globalFade, (hue + i * 12) % 360);
    }
    raf = requestAnimationFrame(frame);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    for (const a of SPOKES) strokeSpoke(a, 0, 0.6, 200);
    rings.forEach((r, i) => drawRing(r, 0, 0.6, (200 + i * 12) % 360));
  }

  window.addEventListener('resize', size);
  size();

  if (reduceMotion) {
    drawStatic();
  } else {
    raf = requestAnimationFrame(frame);
  }
})();
