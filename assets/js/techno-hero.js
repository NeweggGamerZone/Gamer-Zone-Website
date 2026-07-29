/* Homepage-only hero background: a skyline silhouette that rises into place
   like it's being "caught" by falling digital rain — the same idea as the
   classic rain-drawn-knight effect, aimed at a techno-city skyline instead of
   a figure — sitting above the perspective circuit-board floor. Pure
   canvas/JS, no external images or image-gen APIs needed. */
(function () {
  const canvas = document.getElementById('techno-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W, H, DPR, startTime = null;
  let buildings = [], rain = [];

  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildSkyline();
    buildRain();
    startTime = null; // replay the rise-in after a resize
  }

  // Skyline confined to the lower ~40% of the hero, leaving open "sky" above
  // for the headline, and a gap at the very bottom for the circuit floor.
  function buildSkyline() {
    const skylineTop = H * 0.58;
    const floorLine = H * 0.98;
    const maxH = floorLine - skylineTop;
    const n = 34;
    buildings = [];
    const mid = n / 2;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(i - mid) / mid;
      const spike = d < 0.06 ? 1 : 0; // one taller "GZ tower" near center
      const h = maxH * (0.28 + 0.5 * Math.abs(Math.sin(i * 1.7 + 2)) * (1 - d * 0.6) + spike * 0.5);
      const w = W / n;
      buildings.push({
        x: i * w, w: Math.max(6, w - 3), h: Math.min(maxH, h),
        delay: 0.25 + (i / n) * 1.1, lit: null,
      });
    }
  }

  function buildRain() {
    rain = [];
    const count = Math.round(W / 26);
    for (let i = 0; i < count; i++) {
      rain.push({ x: Math.random() * W, y: Math.random() * H, len: 8 + Math.random() * 14, speed: 60 + Math.random() * 90 });
    }
  }

  function lights(b) {
    if (b.lit) return b.lit;
    b.lit = [];
    const rows = Math.max(1, Math.floor(b.h / 16));
    for (let r = 0; r < rows; r++) b.lit.push({ y: r * 16 + 8, on: Math.random() > 0.45 });
    return b.lit;
  }

  let raf, last = 0;
  function draw(ts) {
    if (startTime === null) startTime = ts;
    const t = (ts - startTime) / 1000; // seconds since (re)start
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;

    ctx.clearRect(0, 0, W, H);

    // ambient digital rain across the whole scene — always running
    ctx.strokeStyle = 'rgba(125,178,255,.28)';
    ctx.lineWidth = 1.4;
    for (const dImg of rain) {
      dImg.y += dImg.speed * dt;
      if (dImg.y - dImg.len > H) { dImg.y = -dImg.len; dImg.x = Math.random() * W; }
      ctx.beginPath();
      ctx.moveTo(dImg.x, dImg.y);
      ctx.lineTo(dImg.x, dImg.y + dImg.len);
      ctx.stroke();
    }

    // skyline rising into place, staggered left-to-right, then it just glows
    const floorLine = H * 0.98;
    for (const b of buildings) {
      const p = Math.max(0, Math.min(1, (t - b.delay) / 0.9));
      const eased = 1 - Math.pow(1 - p, 3);
      const curH = b.h * eased;
      if (curH <= 0) continue;
      const y = floorLine - curH;
      const grad = ctx.createLinearGradient(0, y, 0, floorLine);
      grad.addColorStop(0, 'rgba(138,180,237,.5)');
      grad.addColorStop(1, 'rgba(20,106,219,.18)');
      ctx.fillStyle = grad;
      ctx.fillRect(b.x, y, b.w, curH);
      if (p >= 1) {
        for (const w of lights(b)) {
          if (Math.random() < 0.0025) w.on = !w.on;
          ctx.fillStyle = w.on ? 'rgba(250,157,40,.85)' : 'rgba(250,157,40,.1)';
          ctx.fillRect(b.x + b.w / 2 - 1.5, floorLine - w.y, 3, 3);
        }
      }
    }

    raf = requestAnimationFrame(draw);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    const floorLine = H * 0.98;
    for (const b of buildings) {
      const y = floorLine - b.h;
      const grad = ctx.createLinearGradient(0, y, 0, floorLine);
      grad.addColorStop(0, 'rgba(138,180,237,.5)');
      grad.addColorStop(1, 'rgba(20,106,219,.18)');
      ctx.fillStyle = grad;
      ctx.fillRect(b.x, y, b.w, b.h);
      for (const w of lights(b)) {
        ctx.fillStyle = w.on ? 'rgba(250,157,40,.85)' : 'rgba(250,157,40,.1)';
        ctx.fillRect(b.x + b.w / 2 - 1.5, floorLine - w.y, 3, 3);
      }
    }
  }

  window.addEventListener('resize', size);
  size();

  if (reduceMotion) {
    drawStatic(); // paint the settled scene once, no loop
  } else {
    raf = requestAnimationFrame(draw);
  }
})();
