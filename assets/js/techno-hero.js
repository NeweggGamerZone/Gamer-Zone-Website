/* Homepage-only fixed background: a purely decorative, non-interactive
   field of soft glowing shapes. No game, no character, no obstacles, no
   input — each slot slowly fades a shape in, holds, fades it out, then
   moves to the next shape in the sequence (square -> triangle -> star ->
   pentagon -> hexagon -> circle -> back to square) at a new spot, so the
   whole canvas is constantly, gently rearranging itself. Pure canvas
   drawing, no images. */
(function () {
  const canvas = document.getElementById('techno-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W, H, DPR;

  // Fixed progression every slot cycles through, one step at a time —
  // "so it can go from squares to triangles to stars etc."
  const SHAPES = ['square', 'triangle', 'star', 'pentagon', 'hexagon', 'circle'];
  const FADE_IN = 1.6, HOLD = 1.4, FADE_OUT = 1.4;
  const SLOT_COUNT = 12;
  let slots = [];

  function rand(a, b) { return a + Math.random() * (b - a); }

  function resetSlot(s, firstRun) {
    s.x = rand(0.06, 0.94) * W;
    s.y = rand(0.08, 0.92) * H;
    s.size = rand(26, 76);
    s.rot = rand(0, Math.PI * 2);
    s.rotSpeed = rand(-0.12, 0.12);
    s.hue = Math.random() < 0.5 ? rand(205, 222) : rand(26, 42); // brand blue or orange
    if (!firstRun) s.shapeIdx = (s.shapeIdx + 1) % SHAPES.length;
  }

  function makeSlot(i) {
    const s = { shapeIdx: i % SHAPES.length, opacity: 0, phase: 'wait', t: rand(0, 3.2) };
    resetSlot(s, true);
    return s;
  }

  function buildSlots() {
    slots = [];
    for (let i = 0; i < SLOT_COUNT; i++) slots.push(makeSlot(i));
  }

  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildSlots();
  }

  function drawShape(type, r, hue, alpha) {
    ctx.beginPath();
    if (type === 'circle') {
      ctx.arc(0, 0, r, 0, Math.PI * 2);
    } else if (type === 'star') {
      const spikes = 5, outer = r, inner = r * 0.45;
      for (let i = 0; i < spikes * 2; i++) {
        const rad = i % 2 === 0 ? outer : inner;
        const a = (Math.PI / spikes) * i - Math.PI / 2;
        const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else {
      const sides = { square: 4, triangle: 3, pentagon: 5, hexagon: 6 }[type] || 4;
      for (let i = 0; i < sides; i++) {
        const a = (Math.PI * 2 / sides) * i - Math.PI / 2;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    grad.addColorStop(0, `hsla(${hue}, 80%, 65%, ${0.32 * alpha})`);
    grad.addColorStop(1, `hsla(${hue + 20}, 85%, 55%, ${0.05 * alpha})`);
    ctx.fillStyle = grad;
    ctx.strokeStyle = `hsla(${hue}, 85%, 72%, ${0.5 * alpha})`;
    ctx.lineWidth = 1.3;
    ctx.fill();
    ctx.stroke();
  }

  function updateSlot(s, dt) {
    s.rot += s.rotSpeed * dt;
    s.t -= dt;
    if (s.t > 0) return; // still waiting/holding
    if (s.phase === 'wait') {
      s.phase = 'in'; s.t = FADE_IN;
    } else if (s.phase === 'in') {
      s.opacity = 1; s.phase = 'hold'; s.t = HOLD;
    } else if (s.phase === 'hold') {
      s.phase = 'out'; s.t = FADE_OUT;
    } else if (s.phase === 'out') {
      s.opacity = 0; resetSlot(s, false); s.phase = 'wait'; s.t = rand(0.2, 1.4);
    }
  }

  function slotOpacity(s) {
    if (s.phase === 'in') return 1 - Math.max(0, s.t) / FADE_IN;
    if (s.phase === 'out') return Math.max(0, s.t) / FADE_OUT;
    if (s.phase === 'hold') return 1;
    return 0;
  }

  function drawSlot(s) {
    const a = slotOpacity(s);
    if (a <= 0.01) return;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    drawShape(SHAPES[s.shapeIdx], s.size, s.hue, a);
    ctx.restore();
  }

  let raf, last = 0;

  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    ctx.clearRect(0, 0, W, H);
    for (const s of slots) { updateSlot(s, dt); drawSlot(s); }
    raf = requestAnimationFrame(frame);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    // A calm, fully-visible snapshot for reduced-motion — no animation loop.
    for (const s of slots) { s.opacity = 1; s.phase = 'hold'; drawSlot(s); }
  }

  window.addEventListener('resize', size);
  size();

  if (reduceMotion) {
    drawStatic();
  } else {
    raf = requestAnimationFrame(frame);
  }
})();
