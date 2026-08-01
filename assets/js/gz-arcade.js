/* Homepage arcade — rendered straight into the hero background (fills
   .hero-stage, sitting behind the headline/CTA which stay on top via
   z-index) with a top-right tab switcher between two mini-games:
   - Zone Dash: a Geometry-Dash-style lane runner. The flat square player
     auto-weaves left/center/right across the lane in step with the grid
     tiles arriving. Jump (Up/W or tap) over spikes; runs of small
     platforms separated by gaps need one well-timed jump per gap — miss
     any single one in the sequence and the run resets, same as a spike.
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

  function drawSquare(x, y, size, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const h = size / 2;
    ctx.fillStyle = 'rgba(235,242,255,.97)';
    ctx.strokeStyle = 'rgba(90,150,255,.9)';
    ctx.lineWidth = Math.max(1.4, size * 0.05);
    ctx.shadowColor = 'rgba(120,170,255,.65)';
    ctx.shadowBlur = size * 0.35;
    ctx.beginPath();
    ctx.rect(-h, -h, size, size);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // ============================================================
  //  ZONE DASH
  // ============================================================
  const Dash = {
    name: 'dash',
    help: '▲ / tap to jump — clear the gaps, dodge the spikes.',
    score: 0, highScore: 0,
    rings: [], obstacles: [], spawnTimer: 1.2,
    heroY: 0, heroVy: 0, jumping: false, jumpAngle: 0,
    hitFlash: 0, invuln: 0, runSpeed: 6,
    weaveIndex: 1, weaveDir: 1, playerLocalX: 0,
    GRAVITY: 2300, JUMP_V: 950,
    AIR_TIME: (2 * 950) / 2300,

    init() {
      try { this.highScore = parseFloat(localStorage.getItem('gz-arcade-dash-high') || '0') || 0; } catch {}
    },
    onResize() {
      this.UNIT = Math.max(22, Math.min(H * 0.09, 56));
      this.Z_PLAYER = 150;
      this.ULOCAL = this.UNIT * this.Z_PLAYER / F;
      this.FLOOR_LOCAL_Y = (H * 0.82 - cy) * this.Z_PLAYER / F;
      this.LANE_HALF_W = this.ULOCAL * 1.9;
      this.COLS = [-this.LANE_HALF_W * 0.55, 0, this.LANE_HALF_W * 0.55];
      this.rings = [];
      const count = 7;
      for (let i = 0; i < count; i++) this.rings.push({ z: Z_NEAR + (i / count) * (Z_FAR - Z_NEAR) });
    },
    reset() {
      this.score = 0; this.obstacles = []; this.spawnTimer = 1.1;
      this.heroY = 0; this.heroVy = 0; this.jumping = false; this.jumpAngle = 0;
      this.hitFlash = 0; this.invuln = 0; this.runSpeed = 6;
      this.weaveIndex = 1; this.weaveDir = 1; this.playerLocalX = 0;
    },
    jump() { if (!this.jumping) { this.jumping = true; this.heroVy = this.JUMP_V; } },
    onJumpKey() { this.jump(); },
    onPointer() { this.jump(); },

    advanceWeave() {
      this.weaveIndex += this.weaveDir;
      if (this.weaveIndex >= this.COLS.length - 1) { this.weaveIndex = this.COLS.length - 1; this.weaveDir = -1; }
      else if (this.weaveIndex <= 0) { this.weaveIndex = 0; this.weaveDir = 1; }
    },
    updateRunSpeed() {
      const START = 6, CAP = 13, FROM = 100, EASE = 500;
      this.runSpeed = this.score <= FROM ? START : CAP - (CAP - START) * Math.exp(-(this.score - FROM) / EASE);
    },
    spawnSpike() { this.obstacles.push({ kind: 'spike', z: Z_FAR, zThickness: this.ULOCAL * 0.9 }); },
    spawnJumpRun(speed) {
      const jumpRange = this.AIR_TIME * speed;
      const gapW = jumpRange * 0.52, padW = jumpRange * 0.24;
      const count = 2 + Math.floor(Math.random() * 3);
      let z = Z_FAR;
      for (let i = 0; i < count; i++) {
        this.obstacles.push({ kind: 'platform', z, zThickness: padW, height: 0.5 });
        z -= padW;
        this.obstacles.push({ kind: 'gap', z, zThickness: gapW });
        z -= gapW;
      }
      this.obstacles.push({ kind: 'platform', z, zThickness: padW, height: 0.5 });
    },
    spawnObstacle(speed) { if (Math.random() < 0.4) this.spawnSpike(); else this.spawnJumpRun(speed); },
    atPlayer(kind) {
      for (const o of this.obstacles) {
        if (o.kind !== kind) continue;
        if (this.Z_PLAYER <= o.z && this.Z_PLAYER >= o.z - o.zThickness) return o;
      }
      return null;
    },
    triggerHit() {
      if (this.score > this.highScore) {
        this.highScore = this.score;
        try { localStorage.setItem('gz-arcade-dash-high', String(Math.floor(this.highScore))); } catch {}
      }
      this.score = 0; this.hitFlash = 1; this.invuln = 0.8;
      this.heroY = 0; this.heroVy = 0; this.jumping = false;
    },

    update(dt) {
      this.updateRunSpeed();
      const ringSpeed = 230 * (this.runSpeed / 6);
      for (const r of this.rings) {
        const prevZ = r.z;
        r.z -= ringSpeed * 0.4 * dt;
        if (prevZ > this.Z_PLAYER && r.z <= this.Z_PLAYER) this.advanceWeave();
        if (r.z < Z_NEAR) r.z += (Z_FAR - Z_NEAR);
      }
      this.playerLocalX += (this.COLS[this.weaveIndex] - this.playerLocalX) * Math.min(1, dt * 5);

      const obstacleSpeed = ringSpeed * 2.5;
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = Math.max(1.3, 2.4 - this.score * 0.0015) + Math.random() * 0.6;
        this.spawnObstacle(obstacleSpeed);
      }
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        this.obstacles[i].z -= obstacleSpeed * dt;
        if (this.obstacles[i].z + this.obstacles[i].zThickness < Z_NEAR - 40) this.obstacles.splice(i, 1);
      }

      this.heroVy -= this.GRAVITY * dt;
      this.heroY += this.heroVy * dt;
      const plat = this.atPlayer('platform'), gap = this.atPlayer('gap');
      const floor = plat ? plat.height * this.UNIT : (gap ? null : 0);
      if (floor !== null && this.heroY <= floor && this.heroVy <= 0) {
        this.heroY = floor; this.heroVy = 0; this.jumping = false;
      }
      this.invuln = Math.max(0, this.invuln - dt);
      const spike = this.atPlayer('spike');
      if (this.invuln <= 0 && spike && this.heroY < this.UNIT * 0.85 - 0.5) { this.triggerHit(); }
      else if (this.invuln <= 0 && floor === null && this.heroY < this.UNIT * 0.3) { this.triggerHit(); }

      this.jumpAngle = this.jumping ? this.jumpAngle + dt * 9 : 0;
      this.score += this.runSpeed * 1.5 * dt;
      this.hitFlash = Math.max(0, this.hitFlash - dt * 2.2);
    },

    laneRail(x, alpha, width) {
      const far = project(x, this.FLOOR_LOCAL_Y, Z_FAR);
      const near = project(x, this.FLOOR_LOCAL_Y, Z_NEAR);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = 'rgba(140,185,255,.8)';
      ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(far.x, far.y); ctx.lineTo(near.x, near.y); ctx.stroke();
      ctx.restore();
    },
    drawLane() {
      this.laneRail(-this.LANE_HALF_W, 0.5, 1.6);
      this.laneRail(this.LANE_HALF_W, 0.5, 1.6);
      this.laneRail((this.COLS[0] + this.COLS[1]) / 2, 0.22, 1);
      this.laneRail((this.COLS[1] + this.COLS[2]) / 2, 0.22, 1);
      for (const r of this.rings) {
        const f = objFade(r.z);
        if (f <= 0.02) continue;
        const a = project(-this.LANE_HALF_W, this.FLOOR_LOCAL_Y, r.z);
        const b = project(this.LANE_HALF_W, this.FLOOR_LOCAL_Y, r.z);
        ctx.save();
        ctx.globalAlpha = 0.45 * f;
        ctx.strokeStyle = 'rgba(140,185,255,.9)';
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.restore();
      }
    },
    drawSpike(o) {
      const halfW = this.LANE_HALF_W;
      const apexLocalY = this.FLOOR_LOCAL_Y - this.ULOCAL * 0.85;
      const z = Math.max(o.z - o.zThickness * 0.5, Z_NEAR - 40);
      const base1 = project(-halfW, this.FLOOR_LOCAL_Y, z);
      const base2 = project(halfW, this.FLOOR_LOCAL_Y, z);
      const apex = project(0, apexLocalY, z);
      const f = objFade(z);
      ctx.save();
      ctx.globalAlpha = Math.max(0.35, f);
      ctx.fillStyle = 'rgba(255,150,40,.95)';
      ctx.shadowColor = 'rgba(255,140,40,.9)'; ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(base1.x, base1.y); ctx.lineTo(apex.x, apex.y); ctx.lineTo(base2.x, base2.y);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,200,120,.9)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
    },
    drawPlatform(o) {
      const halfW = this.LANE_HALF_W;
      const topLocalY = this.FLOOR_LOCAL_Y - o.height * this.ULOCAL;
      const z = Math.max(o.z - o.zThickness * 0.5, Z_NEAR - 40);
      const p1 = project(-halfW, topLocalY, z), p2 = project(halfW, topLocalY, z);
      const p3 = project(halfW, this.FLOOR_LOCAL_Y, z), p4 = project(-halfW, this.FLOOR_LOCAL_Y, z);
      const f = objFade(z);
      ctx.save();
      ctx.globalAlpha = Math.max(0.35, f);
      ctx.fillStyle = 'rgba(70,100,160,.88)';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(150,190,255,.85)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
    },
    drawGap(o) {
      const halfW = this.LANE_HALF_W;
      const z = Math.max(o.z - o.zThickness * 0.5, Z_NEAR - 40);
      const pitY = this.FLOOR_LOCAL_Y + this.ULOCAL * 0.5;
      const p1 = project(-halfW, this.FLOOR_LOCAL_Y, z), p2 = project(halfW, this.FLOOR_LOCAL_Y, z);
      const p3 = project(halfW, pitY, z), p4 = project(-halfW, pitY, z);
      const f = objFade(z);
      ctx.save();
      ctx.globalAlpha = Math.max(0.35, f);
      ctx.fillStyle = 'rgba(5,7,12,.92)';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,150,40,.7)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    },
    draw() {
      this.drawLane();
      for (const o of this.obstacles) {
        if (o.kind === 'spike') this.drawSpike(o);
        else if (o.kind === 'platform') this.drawPlatform(o);
        else if (o.kind === 'gap') this.drawGap(o);
      }
      const liftLocal = this.heroY * (this.Z_PLAYER / F);
      const p = project(this.playerLocalX, this.FLOOR_LOCAL_Y - liftLocal, this.Z_PLAYER);
      drawSquare(p.x, p.y, this.UNIT, this.jumpAngle);
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
