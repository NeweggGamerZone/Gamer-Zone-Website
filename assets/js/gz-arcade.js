/* Homepage arcade — rendered straight into the hero background (fills
   .hero-stage, sitting behind the headline/CTA which stay on top via
   z-index) with a top-right tab switcher between two mini-games:
   - Zone Dash: the glowing blue egg sits fixed in place — it never moves
     on screen. Instead, the grid square itself (the "layer") spins in
     place around it, sweeping left-to-right like a track reeling in, while
     it also shrinks toward the egg the way the ambient tunnel's rings
     recede. Hazard marks ride along that rotating square edge; as one
     nears the egg it flashes orange as a warning — jump (Up/W or tap) the
     instant it arrives or your combo resets, same idea as dodging a spike.
     Each full shrink cycle is one "layer" cleared — clearing layers keeps
     the score climbing even after a miss, since a miss only zeroes your
     combo, not the run itself (no game over, ever).
   - Zone Hunt: PC parts fly toward the camera out of the grid's vanishing
     point. Click/tap a part before it gets too close to pop it into
     confetti and score a point. Let any part reach the front unclicked
     and the score resets.
   Both games share one perspective projection scaled to the canvas' own
   size, anchored low in the frame so the running/flying action stays clear
   of the headline text above it. Pure canvas math, no images. */
(function () {
  const panel = document.getElementById('gz-arcade');
  const canvas = document.getElementById('gz-arcade-canvas');
  if (!panel || !canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hudHigh = document.getElementById('gz-arcade-high');
  const hudScore = document.getElementById('gz-arcade-score');
  const helpEl = document.getElementById('gz-arcade-help');
  const tabs = panel.querySelectorAll('.gz-arcade-tabs [data-game]');

  let W, H, DPR, cx, cy;
  const F = 300, Z_NEAR = 60, Z_FAR = 1500;

  function project(x, y, z) {
    const sc = F / z;
    return { x: cx + x * sc, y: cy + y * sc, s: sc };
  }

  // Fades an element in near spawn (far) and gives it a brief exit fade
  // right as it passes the camera — avoids anything popping harshly.
  function objFade(z) {
    const nearFade = Math.min(1, (z - (Z_NEAR - 40)) / 70);
    const farFade = Math.min(1, (Z_FAR - z) / 220);
    return Math.max(0, Math.min(1, nearFade * farFade));
  }

  // The player: a flat, glowing blue egg — same "flat fill + stroke + glow,
  // no shading" 2D look the old square player had, just egg-shaped and blue.
  // `bob` is a small vertical offset used for the jump hop.
  function drawEgg(x, y, size, bob) {
    ctx.save();
    ctx.translate(x, y - (bob || 0));
    const w = size * 0.68, h = size * 0.94;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.bezierCurveTo(w / 2, -h / 2, w / 2, h / 3, 0, h / 2);
    ctx.bezierCurveTo(-w / 2, h / 3, -w / 2, -h / 2, 0, -h / 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(70,150,255,.96)';
    ctx.strokeStyle = 'rgba(180,220,255,.95)';
    ctx.lineWidth = Math.max(1.4, size * 0.05);
    ctx.shadowColor = 'rgba(70,150,255,.9)';
    ctx.shadowBlur = size * 0.55;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // ============================================================
  //  ZONE DASH
  // ============================================================
  const Dash = {
    name: 'dash',
    help: "▲ / tap the instant it flashes orange — chain hits for a bigger score, a miss just resets your combo.",
    score: 0, highScore: 0, layer: 1,
    rings: [], hazards: [], spawnTimer: 0.9,
    angle: 0, rotSpeed: 0, layerTimer: 9,
    jumping: false, jumpT: 0,
    hitFlash: 0, invuln: 0,
    JUMP_DUR: 0.4,
    ROT_BASE: 0.55, ROT_STEP: 0.045,

    init() {
      try { this.highScore = parseFloat(localStorage.getItem('gz-arcade-dash-high') || '0') || 0; } catch {}
    },
    // The egg's anchor point never moves — centered horizontally, fixed low
    // in the frame (clear of the headline above it). Everything else — the
    // grid square and its hazards — rotates and shrinks toward that one
    // fixed point instead of the egg traveling through the scene.
    onResize() {
      this.px = cx; this.py = cy + H * 0.28;
      this.R_MAX = Math.min(W * 0.42, H * 0.48);
      this.JUDGE_R = Math.max(16, this.R_MAX * 0.06);
      this.UNIT = Math.max(20, Math.min(H * 0.08, 46));
      this.rings = [];
      const n = 5;
      for (let i = 0; i < n; i++) this.rings.push({ r: (i / n) * this.R_MAX });
    },
    reset() {
      this.score = 0; this.layer = 1; this.hazards = [];
      this.angle = 0; this.rotSpeed = this.ROT_BASE; this.layerTimer = 9;
      this.spawnTimer = 0.9;
      this.jumping = false; this.jumpT = 0;
      this.hitFlash = 0; this.invuln = 0;
    },
    jump() { if (!this.jumping) { this.jumping = true; this.jumpT = 0; } },
    onJumpKey() { this.jump(); },
    onPointer() { this.jump(); },

    triggerHit() {
      if (this.score > this.highScore) {
        this.highScore = this.score;
        try { localStorage.setItem('gz-arcade-dash-high', String(Math.floor(this.highScore))); } catch {}
      }
      this.score = 0; this.hitFlash = 1; this.invuln = 0.5;
    },
    spawnHazard() {
      this.hazards.push({ r: this.R_MAX, edge: Math.floor(Math.random() * 4), t: Math.random(), judged: false });
    },
    // A point at fraction t along one edge of a square of half-side r,
    // in the square's own (unrotated) local frame. Edges run
    // top(L->R), right(T->B), bottom(R->L), left(B->T) — a full lap is one
    // continuous clockwise trip around the square, matching the square's
    // own clockwise spin so hazards always ride the grid line itself.
    edgeLocal(edge, t, r) {
      const d = r * 2;
      switch (edge) {
        case 0: return { x: -r + d * t, y: -r };
        case 1: return { x: r, y: -r + d * t };
        case 2: return { x: r - d * t, y: r };
        default: return { x: -r, y: r - d * t };
      }
    },
    toScreen(local) {
      const c = Math.cos(this.angle), s = Math.sin(this.angle);
      return { x: this.px + local.x * c - local.y * s, y: this.py + local.x * s + local.y * c };
    },

    update(dt) {
      this.rotSpeed = this.ROT_BASE + (this.layer - 1) * this.ROT_STEP;
      this.angle += this.rotSpeed * dt; // clockwise spin — the grid sweeps left-to-right past the egg
      const shrinkSpeed = this.R_MAX * (0.5 + (this.layer - 1) * 0.05);
      for (const ring of this.rings) {
        ring.r -= shrinkSpeed * dt;
        if (ring.r < 0) ring.r += this.R_MAX;
      }

      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = Math.max(0.55, 1.25 - this.layer * 0.04) + Math.random() * 0.3;
        this.spawnHazard();
      }
      const hazSpeed = shrinkSpeed * 1.1;
      for (let i = this.hazards.length - 1; i >= 0; i--) {
        const hz = this.hazards[i];
        hz.r -= hazSpeed * dt;
        if (!hz.judged && hz.r <= this.JUDGE_R) {
          hz.judged = true;
          if (this.invuln <= 0) {
            if (this.jumping && this.jumpT < this.JUMP_DUR) this.score++;
            else this.triggerHit();
          }
        }
        if (hz.r < -this.R_MAX * 0.08) this.hazards.splice(i, 1);
      }

      if (this.jumping) {
        this.jumpT += dt;
        if (this.jumpT > this.JUMP_DUR) { this.jumping = false; this.jumpT = 0; }
      }
      this.invuln = Math.max(0, this.invuln - dt);
      this.hitFlash = Math.max(0, this.hitFlash - dt * 2.2);

      // A layer finishing its shrink-to-center cycle always advances the
      // run and pads the score, whether or not the last hazard landed —
      // a miss only zeroes the combo above, it never stops the run.
      this.layerTimer -= dt;
      if (this.layerTimer <= 0) {
        this.layer++;
        this.score += 10;
        this.layerTimer = Math.max(5, 9 - this.layer * 0.2);
      }
    },

    drawRingSquare(r, alpha) {
      if (r <= 1) return;
      ctx.save();
      ctx.translate(this.px, this.py);
      ctx.rotate(this.angle);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = 'rgba(140,185,255,.85)';
      ctx.lineWidth = 1.3;
      ctx.strokeRect(-r, -r, r * 2, r * 2);
      ctx.restore();
    },
    drawHazard(hz) {
      const p = this.toScreen(this.edgeLocal(hz.edge, hz.t, hz.r));
      const near = Math.max(0, 1 - hz.r / (this.R_MAX * 0.5));
      const pulse = 0.55 + 0.45 * Math.sin(performance.now() * 0.02 * (1 + near * 3));
      const size = Math.max(5, this.UNIT * 0.3 * (0.6 + 0.4 * (1 - hz.r / this.R_MAX)));
      ctx.save();
      ctx.globalAlpha = Math.min(1, Math.max(0.35, near) * pulse + 0.3);
      ctx.fillStyle = 'rgba(255,150,40,.95)';
      ctx.shadowColor = 'rgba(255,140,40,.95)';
      ctx.shadowBlur = size * 1.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
    draw() {
      for (const ring of this.rings) this.drawRingSquare(ring.r, 0.15 + 0.5 * (1 - ring.r / this.R_MAX));
      for (const hz of this.hazards) this.drawHazard(hz);
      const bob = this.jumping ? Math.sin((this.jumpT / this.JUMP_DUR) * Math.PI) * this.UNIT * 0.9 : 0;
      drawEgg(this.px, this.py, this.UNIT, bob);
      if (this.hitFlash > 0.01) {
        ctx.save();
        ctx.globalAlpha = this.hitFlash * 0.25;
        ctx.fillStyle = '#FA9D28';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    },
  };

  // ============================================================
  //  ZONE HUNT
  // ============================================================
  const PARTS = [
    { color: '#3fbf6b', draw(s) {
        ctx.fillStyle = this.color;
        ctx.fillRect(-s * 0.55, -s * 0.32, s * 1.1, s * 0.64);
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.beginPath(); ctx.arc(-s * 0.2, 0, s * 0.16, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(s * 0.2, 0, s * 0.16, 0, Math.PI * 2); ctx.fill();
      } },
    { color: '#3D8BFF', draw(s) {
        ctx.fillStyle = this.color;
        ctx.fillRect(-s * 0.16, -s * 0.55, s * 0.32, s * 1.1);
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        for (let i = -2; i <= 2; i++) ctx.fillRect(-s * 0.16, i * s * 0.18 - s * 0.025, s * 0.32, s * 0.05);
      } },
    { color: '#FA9D28', draw(s) {
        ctx.fillStyle = this.color;
        ctx.fillRect(-s * 0.4, -s * 0.4, s * 0.8, s * 0.8);
        ctx.fillStyle = 'rgba(0,0,0,.4)';
        for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) ctx.fillRect(x * s * 0.22 - s * 0.03, y * s * 0.22 - s * 0.03, s * 0.06, s * 0.06);
      } },
    { color: '#9B6BFF', draw(s) {
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        for (let a = 0; a < 4; a++) {
          ctx.save(); ctx.rotate(a * Math.PI / 2);
          ctx.beginPath(); ctx.ellipse(s * 0.2, 0, s * 0.22, s * 0.09, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      } },
  ];

  const Hunt = {
    name: 'hunt',
    help: 'Click / tap the parts before they get too close — miss one and your score resets.',
    score: 0, highScore: 0,
    parts: [], confetti: [], spawnTimer: 0.8, missFlash: 0,

    init() {
      try { this.highScore = parseFloat(localStorage.getItem('gz-arcade-hunt-high') || '0') || 0; } catch {}
    },
    onResize() {
      this.Z_REF = 150;
      this.BASE = Math.max(24, Math.min(H * 0.09, 60)) * this.Z_REF / F;
      this.SPREAD_X = (W * 0.42) * this.Z_REF / F;
      this.SPREAD_Y = (H * 0.36) * this.Z_REF / F;
      this.MISS_Z = 150;
    },
    reset() { this.parts = []; this.confetti = []; this.score = 0; this.spawnTimer = 0.7; this.missFlash = 0; },
    onJumpKey() {},
    onPointer(x, y) { this.popAt(x, y); },

    spawnPart() {
      const x = (Math.random() * 2 - 1) * this.SPREAD_X;
      const y = (Math.random() * 2 - 1) * this.SPREAD_Y;
      const part = PARTS[Math.floor(Math.random() * PARTS.length)];
      this.parts.push({ x, y, z: Z_FAR, part });
    },
    triggerMiss() {
      if (this.score > this.highScore) {
        this.highScore = this.score;
        try { localStorage.setItem('gz-arcade-hunt-high', String(Math.floor(this.highScore))); } catch {}
      }
      this.score = 0;
      this.missFlash = 1;
    },
    popAt(px, py) {
      let best = null, bestD = Infinity;
      for (const p of this.parts) {
        const pr = project(p.x, p.y, p.z);
        const r = Math.max(20, this.BASE * pr.s * 0.65);
        const d = Math.hypot(px - pr.x, py - pr.y);
        if (d <= r && d < bestD) { best = p; bestD = d; }
      }
      if (best) {
        this.parts.splice(this.parts.indexOf(best), 1);
        const pr = project(best.x, best.y, best.z);
        this.spawnConfetti(pr.x, pr.y, best.part.color);
        this.score++;
      }
    },
    spawnConfetti(x, y, color) {
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2, sp = 70 + Math.random() * 150;
        this.confetti.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50,
          life: 0.5 + Math.random() * 0.35, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 10,
          color, size: 4 + Math.random() * 4,
        });
      }
    },
    update(dt) {
      const speedMul = 1 + Math.min(2.2, this.score * 0.02);
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = Math.max(0.45, 1.3 - this.score * 0.01) + Math.random() * 0.4;
        this.spawnPart();
      }
      const zSpeed = 260 * speedMul;
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i];
        p.z -= zSpeed * dt;
        if (p.z <= this.MISS_Z) { this.parts.splice(i, 1); this.triggerMiss(); }
      }
      for (let i = this.confetti.length - 1; i >= 0; i--) {
        const c = this.confetti[i];
        c.vy += 900 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt; c.life -= dt;
        if (c.life <= 0) this.confetti.splice(i, 1);
      }
      this.missFlash = Math.max(0, this.missFlash - dt * 2.2);
    },
    draw() {
      for (const p of this.parts) {
        const pr = project(p.x, p.y, p.z);
        const f = Math.min(1, (Z_FAR - p.z) / 220);
        const s = this.BASE * pr.s;
        ctx.save();
        ctx.globalAlpha = Math.max(0.4, f);
        ctx.translate(pr.x, pr.y);
        p.part.draw(s);
        ctx.restore();
      }
      for (const c of this.confetti) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, c.life / 0.85);
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size);
        ctx.restore();
      }
      if (this.missFlash > 0.01) {
        ctx.save();
        ctx.globalAlpha = this.missFlash * 0.28;
        ctx.fillStyle = '#ff2e6e';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    },
  };

  // ============================================================
  //  shared loop / switching / input
  // ============================================================
  let current = Dash;

  function setGame(name) {
    current = name === 'hunt' ? Hunt : Dash;
    current.reset();
    tabs.forEach(t => {
      const on = t.dataset.game === current.name;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (helpEl) helpEl.textContent = current.help;
  }
  tabs.forEach(t => t.addEventListener('click', () => setGame(t.dataset.game)));

  function updateHud() {
    if (hudHigh) hudHigh.textContent = Math.floor(current.highScore);
    if (hudScore) hudScore.textContent = Math.floor(current.score);
  }

  function inViewport() {
    const r = panel.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }

  window.addEventListener('keydown', e => {
    if (!inViewport() || e.repeat) return;
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.code === 'KeyW' || e.code === 'ArrowUp') { e.preventDefault(); current.onJumpKey(); }
  });
  canvas.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect();
    current.onPointer(e.clientX - r.left, e.clientY - r.top);
  });

  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx = W / 2; cy = H / 2;
    Dash.onResize();
    Hunt.onResize();
  }

  let raf, last = 0;
  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    ctx.clearRect(0, 0, W, H);
    if (inViewport()) current.update(dt);
    current.draw();
    updateHud();
    raf = requestAnimationFrame(frame);
  }

  window.addEventListener('resize', size);
  Dash.init(); Hunt.init();
  size();
  Dash.reset(); Hunt.reset();
  updateHud();

  if (reduceMotion) {
    current.draw();
  } else {
    raf = requestAnimationFrame(frame);
  }
})();
