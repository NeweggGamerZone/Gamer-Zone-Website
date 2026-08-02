/* Homepage arcade — rendered straight into the hero background (fills
   .hero-stage, sitting behind the headline/CTA which stay on top via
   z-index) with a top-right tab switcher between two mini-games:
   - Zone Dash: one square of the background grid is "live" at a time — the
     same receding-toward-camera square the ambient tunnel already draws.
     The egg walks that square's own edges (corner to corner, all the way
     around) while the whole square approaches, and the obstacles for that
     lap are fixed points riding along those same edges — everything
     (egg + hazards) is attached to that one layer, growing together as it
     nears the camera. Jump (Up/W or tap) each hazard right as the egg's
     lap reaches it. The moment that layer reaches the camera, it's swapped
     for a fresh one starting back at the far edge — lap complete, next
     layer, forever — and a miss only zeroes the combo, it never stops the
     loop (no game over, ever).
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

  // The ambient background tunnel (techno-hero.js) spins its own squares
  // slowly at this same rate. Zone Dash's "live" square rotates in step
  // with it so the game reads as attached to that same background layer,
  // not a separate overlay — this is what turns the plain square into the
  // tilted/diamond look at any given moment.
  const BG_ROT_SPEED = 0.045;
  let bgRot = 0;
  function rotXY(x, y, rot) {
    const c = Math.cos(rot), s = Math.sin(rot);
    return { x: x * c - y * s, y: x * s + y * c };
  }
  function projectRot(x, y, z) {
    const p = rotXY(x, y, bgRot);
    return project(p.x, p.y, z);
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
  // `bob` is a small vertical offset used for the jump hop; `rot` is a
  // continuous self-spin so the egg reads as rolling even though its
  // screen position never moves.
  function drawEgg(x, y, size, bob, rot) {
    ctx.save();
    ctx.translate(x, y - (bob || 0));
    ctx.rotate(rot || 0);
    // A real egg silhouette: narrow rounded top tapering down into a wide,
    // fully-rounded bottom (not a point) — matches a classic egg photo,
    // not a symmetric teardrop.
    const w = size * 0.82, hTop = size * 0.5, hBot = size * 0.48;
    ctx.beginPath();
    ctx.moveTo(0, -hTop);
    ctx.bezierCurveTo(w * 0.56, -hTop * 0.86, w * 0.62, hBot * 0.28, w * 0.52, hBot * 0.78);
    ctx.bezierCurveTo(w * 0.42, hBot, -w * 0.42, hBot, -w * 0.52, hBot * 0.78);
    ctx.bezierCurveTo(-w * 0.62, hBot * 0.28, -w * 0.56, -hTop * 0.86, 0, -hTop);
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

  // A point along the perimeter of a square centered on the vanishing-point
  // axis, walked clockwise starting at the top-left corner. `t` is 0..4 —
  // each whole number is one full edge (top, right, bottom, left) — and
  // `half` is the square's local half-width, the same at every depth (so it
  // only grows on screen from perspective, never changes in world space).
  function squareEdgePoint(t, half) {
    const s = ((t % 4) + 4) % 4;
    if (s < 1) return { x: -half + s * 2 * half, y: -half };
    if (s < 2) return { x: half, y: -half + (s - 1) * 2 * half };
    if (s < 3) return { x: half - (s - 2) * 2 * half, y: half };
    return { x: -half, y: half - (s - 3) * 2 * half };
  }

  // ============================================================
  //  ZONE DASH
  // ============================================================
  const Dash = {
    name: 'dash',
    help: '▲ / tap to jump — clear each hazard as the egg’s lap reaches it.',
    score: 0, highScore: 0, layer: 1, combo: 0,
    z: 1500, edgeT: 0, obstacles: [],
    heroY: 0, heroVy: 0, jumping: false, jumpAngle: 0, rollAngle: 0,
    hitFlash: 0, runSpeed: 6,
    GRAVITY: 2300, JUMP_V: 950,

    init() {
      try { this.highScore = parseFloat(localStorage.getItem('gz-arcade-dash-high') || '0') || 0; } catch {}
    },
    // One square of the grid is "live" at a time. Its local half-width is
    // fixed — the same at every depth — so the only thing that changes as
    // it travels from Z_FAR to Z_NEAR is its on-screen size, exactly like
    // the ambient tunnel's own receding rings.
    onResize() {
      this.UNIT = Math.max(22, Math.min(H * 0.09, 56));
      this.Z_REF = 150;
      this.ULOCAL = this.UNIT * this.Z_REF / F;
      this.HALF = this.ULOCAL * 3.2;
    },
    reset() {
      this.score = 0; this.layer = 1; this.combo = 0;
      this.z = Z_FAR; this.edgeT = 0;
      this.heroY = 0; this.heroVy = 0; this.jumping = false; this.jumpAngle = 0; this.rollAngle = 0;
      this.hitFlash = 0; this.runSpeed = 6;
      this.spawnLayerObstacles();
    },
    // Hazards for the current layer only, fixed to specific points along
    // that same square's edges (never near a corner) so they read as
    // riding the line right alongside the egg as it all approaches.
    spawnLayerObstacles() {
      this.obstacles = [];
      const count = 2 + Math.floor(Math.random() * 3);
      const used = [];
      let tries = 0;
      while (this.obstacles.length < count && tries < 40) {
        tries++;
        const t = 0.35 + Math.random() * 3.3;
        if (used.some(u => Math.abs(u - t) < 0.55)) continue;
        used.push(t);
        this.obstacles.push({ edgeT: t, judged: false });
      }
      this.obstacles.sort((a, b) => a.edgeT - b.edgeT);
    },
    jump() { if (!this.jumping) { this.jumping = true; this.heroVy = this.JUMP_V; } },
    onJumpKey() { this.jump(); },
    onPointer() { this.jump(); },

    updateRunSpeed() {
      const START = 6, CAP = 13, FROM = 100, EASE = 500;
      this.runSpeed = this.score <= FROM ? START : CAP - (CAP - START) * Math.exp(-(this.score - FROM) / EASE);
    },
    saveHigh() {
      if (this.score > this.highScore) {
        this.highScore = this.score;
        try { localStorage.setItem('gz-arcade-dash-high', String(Math.floor(this.highScore))); } catch {}
      }
    },

    update(dt) {
      this.updateRunSpeed();
      this.z -= 230 * (this.runSpeed / 6) * dt;
      if (this.z <= Z_NEAR) {
        // Lap complete: this layer has reached the camera. Swap it for a
        // fresh one starting back at the far edge and keep going, forever
        // — consecutive layers push the score up further.
        this.layer++;
        this.score += 25 * this.layer;
        this.saveHigh();
        this.z = Z_FAR;
        this.spawnLayerObstacles();
      }
      this.edgeT = 4 * (Z_FAR - this.z) / (Z_FAR - Z_NEAR);

      for (const o of this.obstacles) {
        if (o.judged || this.edgeT < o.edgeT) continue;
        o.judged = true;
        if (this.heroY > this.UNIT * 0.3) {
          this.combo++;
          this.score += 10 + this.combo * 2;
          this.saveHigh();
        } else {
          // A miss only zeroes the combo — it never stops the loop.
          this.combo = 0;
          this.hitFlash = 1;
        }
      }

      this.heroVy -= this.GRAVITY * dt;
      this.heroY += this.heroVy * dt;
      if (this.heroY <= 0 && this.heroVy <= 0) { this.heroY = 0; this.heroVy = 0; this.jumping = false; }

      this.jumpAngle = this.jumping ? this.jumpAngle + dt * 9 : 0;
      // Rolling in step with the lap itself, so the egg reads as under its
      // own power even though its screen path is dictated by the square.
      this.rollAngle += dt * (this.runSpeed / this.UNIT) * 26;
      this.hitFlash = Math.max(0, this.hitFlash - dt * 2.2);
    },

    drawSquare() {
      const half = this.HALF, z = this.z;
      const f = objFade(z);
      if (f <= 0.02) return;
      const tl = projectRot(-half, -half, z), tr = projectRot(half, -half, z);
      const br = projectRot(half, half, z), bl = projectRot(-half, half, z);
      ctx.save();
      ctx.globalAlpha = 0.55 * f;
      ctx.strokeStyle = 'rgba(140,185,255,.9)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y); ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y);
      ctx.closePath(); ctx.stroke();
      ctx.restore();
    },
    drawObstacle(o) {
      const near = !o.judged && Math.abs(this.edgeT - o.edgeT) < 0.35;
      const pt = squareEdgePoint(o.edgeT, this.HALF);
      // Push the marker slightly outward from whichever edge it's on, so
      // it reads as a spike riding the line rather than sitting flush on
      // it — all computed in local space, then rotated + projected as one
      // piece so it turns with the square instead of staying screen-locked.
      const outX = pt.x >= this.HALF - 0.01 ? 1 : pt.x <= -this.HALF + 0.01 ? -1 : 0;
      const outY = outX !== 0 ? 0 : (pt.y >= this.HALF - 0.01 ? 1 : -1);
      const push = this.HALF * 0.16;
      const wLocal = this.ULOCAL * 0.28;
      const aLocal = outX !== 0 ? { x: pt.x, y: pt.y - wLocal } : { x: pt.x - wLocal, y: pt.y };
      const bLocal = outX !== 0 ? { x: pt.x, y: pt.y + wLocal } : { x: pt.x + wLocal, y: pt.y };
      const tipLocal = { x: pt.x + outX * push, y: pt.y + outY * push };
      const a = projectRot(aLocal.x, aLocal.y, this.z);
      const b = projectRot(bLocal.x, bLocal.y, this.z);
      const tip = projectRot(tipLocal.x, tipLocal.y, this.z);
      const f = objFade(this.z);
      ctx.save();
      ctx.globalAlpha = Math.max(0.35, f) * (near ? 1 : 0.85);
      ctx.fillStyle = near ? 'rgba(255,150,40,.98)' : 'rgba(255,150,40,.8)';
      ctx.shadowColor = 'rgba(255,140,40,.95)';
      ctx.shadowBlur = near ? 16 : 6;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y); ctx.lineTo(tip.x, tip.y); ctx.lineTo(b.x, b.y);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    },
    draw() {
      this.drawSquare();
      for (const o of this.obstacles) this.drawObstacle(o);
      const pt = squareEdgePoint(this.edgeT, this.HALF);
      const liftLocal = this.heroY * (this.z / F);
      const p = projectRot(pt.x, pt.y - liftLocal, this.z);
      const size = this.UNIT * (this.Z_REF / this.z);
      drawEgg(p.x, p.y, size, 0, this.rollAngle + this.jumpAngle);
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
    // Parts fly across the WHOLE background now, not just a central patch.
    // You only actually lose one you let sail past the headline — anything
    // that drifts up, sideways, or off past the edges without crossing
    // that line just despawns, no penalty.
    onResize() {
      this.Z_REF = 150;
      this.BASE = Math.max(24, Math.min(H * 0.09, 60)) * this.Z_REF / F;
      this.SPREAD_X = (W * 0.92) * this.Z_REF / F;
      this.SPREAD_Y = (H * 0.85) * this.Z_REF / F;
      this.MISS_Z = 150;
      this.missLineY = H * 0.72;
      const stack = document.querySelector('.hero-stack');
      if (stack) {
        const sRect = stack.getBoundingClientRect();
        const cRect = canvas.getBoundingClientRect();
        if (cRect.height) this.missLineY = sRect.bottom - cRect.top;
      }
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
        const pr = project(p.x, p.y, p.z);
        if (pr.y >= this.missLineY) {
          // Only crossing down past the headline counts as a miss — a part
          // that happened to drift up or sideways just despawns quietly.
          this.parts.splice(i, 1);
          this.triggerMiss();
        } else if (p.z <= Z_NEAR - 30) {
          this.parts.splice(i, 1);
        }
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
    bgRot += dt * BG_ROT_SPEED;
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
