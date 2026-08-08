/* Hero Runner — the always-on background game living under the hero's
   "Plan your visit" button. Single-button jump timing (Chrome Dino /
   Flappy Bird style): red shapes drift toward a fixed character and the
   only input is "jump" (Space, tap, or click on the game strip). Clearing
   a shape scores a point; missing one just resets the current score back
   to zero and play continues — no hard game-over, no restart gesture.

   Lifecycle: the game is running the moment the page loads (no click to
   start). It's only visually/interactively "live" while the hero section
   is on screen — an IntersectionObserver fades the strip in/out and the
   loop itself pauses/resumes (not reset) so scrolling away and back finds
   the run exactly where it left off. Respects prefers-reduced-motion by
   not rendering at all. */
(function () {
  const wrap = document.getElementById('hero-runner');
  const canvas = document.getElementById('hero-runner-canvas');
  if (!wrap || !canvas || !canvas.getContext) return;

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('hr-score-val');
  const bestEl = document.getElementById('hr-best-val');

  // ---- persisted high score -------------------------------------------------
  const HS_KEY = 'gzHeroRunnerBest';
  function loadBest() {
    try { return parseInt(localStorage.getItem(HS_KEY), 10) || 0; } catch { return 0; }
  }
  function saveBest(v) {
    try { localStorage.setItem(HS_KEY, String(v)); } catch { /* private mode etc — fine to skip */ }
  }

  let score = 0;
  let best = loadBest();
  if (bestEl) bestEl.textContent = best;

  // ---- canvas sizing (device-pixel-ratio aware, responsive width) -----------
  let W = 0, H = 0, DPR = 1;
  function size() {
    const rect = canvas.getBoundingClientRect();
    DPR = window.devicePixelRatio || 1;
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', size);

  // ---- game constants ---------------------------------------------------
  const GROUND_Y = () => H - 18;
  const CHAR_X = 34;
  const CHAR_R = 9;
  const GRAVITY = 1500;
  const JUMP_V = -430;
  const BASE_SPEED = 150;
  const SHAPES = ['square', 'triangle', 'hex'];

  let charY = 0, vy = 0, jumping = false;
  let obstacles = [];
  let spawnTimer = 0;
  let speed = BASE_SPEED;
  let flashT = 0; // brief red flash feedback on a miss

  function reset() {
    charY = 0; vy = 0; jumping = false;
    obstacles = [];
    spawnTimer = 1;
    speed = BASE_SPEED;
    score = 0;
    if (scoreEl) scoreEl.textContent = '0';
  }

  function jump() {
    if (!active) return;
    if (!jumping) { jumping = true; vy = JUMP_V; }
  }

  function nextGap() {
    // Enough time between spawns that a fair jump always clears the gap,
    // with a little randomness so it doesn't feel metronomic.
    return 1.05 + Math.random() * 0.7;
  }

  function spawnObstacle() {
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const size = 15 + Math.random() * 6;
    obstacles.push({ x: W + size, w: size, h: size, shape, resolved: false });
  }

  function onMiss() {
    score = 0;
    speed = BASE_SPEED;
    flashT = 0.25;
    if (scoreEl) scoreEl.textContent = '0';
  }

  function onClear() {
    score += 1;
    best = Math.max(best, score);
    speed = BASE_SPEED + Math.min(score, 25) * 4;
    if (scoreEl) scoreEl.textContent = String(score);
    if (bestEl) bestEl.textContent = String(best);
    saveBest(best);
  }

  function update(dt) {
    const groundY = GROUND_Y();

    if (jumping) {
      vy += GRAVITY * dt;
      charY += vy * dt;
      if (charY >= 0) { charY = 0; vy = 0; jumping = false; }
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawnObstacle(); spawnTimer = nextGap(); }

    for (const o of obstacles) {
      o.x -= speed * dt;
      if (!o.resolved && o.x + o.w / 2 <= CHAR_X) {
        o.resolved = true;
        const airborneEnough = -charY > o.h * 0.6;
        if (airborneEnough) onClear(); else onMiss();
      }
    }
    obstacles = obstacles.filter(o => o.x + o.w > -30);

    if (flashT > 0) flashT = Math.max(0, flashT - dt);
  }

  // ---- drawing ------------------------------------------------------------
  function drawShape(cx, cy, r, shape, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    if (shape === 'square') {
      ctx.rect(cx - r, cy - r, r * 2, r * 2);
    } else if (shape === 'triangle') {
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy + r);
      ctx.lineTo(cx - r, cy + r);
      ctx.closePath();
    } else {
      // simple hexagon
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const groundY = GROUND_Y();

    // ground line
    ctx.strokeStyle = 'rgba(166,174,188,.25)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, groundY + CHAR_R); ctx.lineTo(W, groundY + CHAR_R); ctx.stroke();

    // obstacles (always the hazard color — every shape must be jumped)
    for (const o of obstacles) {
      drawShape(o.x, groundY - o.h / 2 + CHAR_R - 3, o.h / 2, o.shape, '#FF3B3B');
    }

    // character (orange, hops via charY offset)
    const cy = groundY + charY;
    if (flashT > 0) {
      ctx.fillStyle = `rgba(255,59,59,${(flashT / 0.25) * 0.35})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = '#FA9D28';
    ctx.beginPath();
    ctx.arc(CHAR_X, cy, CHAR_R, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- lifecycle: always ticking in the background, only visible/live
  // while the hero is on screen. Pausing (not resetting) on scroll-away and
  // on tab-hide keeps a run intact when the user comes back. -------------
  let active = false;
  let raf = null, last = 0;

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    if (!active || document.hidden) { last = ts; return; }
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    update(dt);
    draw();
  }

  function setActive(v) {
    if (v === active) return;
    active = v;
    wrap.classList.toggle('is-active', active);
    if (active) last = performance.now();
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      setActive(entries[0].isIntersecting);
    }, { threshold: 0.4 });
    io.observe(wrap);
  } else {
    setActive(true); // no IO support — just run
  }

  document.addEventListener('keydown', e => {
    if (!active) return;
    if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
  });
  canvas.addEventListener('pointerdown', jump);

  size();
  reset();
  raf = requestAnimationFrame(frame);
})();
