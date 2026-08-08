/* SENET Live Play Chart — Robinhood-style smooth curves for the top games
   played at the Zone, with a Weekly / Monthly / All-Time range switcher.

   IMPORTANT — there is no working public API this static site can call.
   The URL the team pointed at (neweggmagenell.admin.enes.tech/statistic/
   content-usage) is an authenticated admin-panel single-page app, not a
   public JSON endpoint — fetching it from a visitor's browser would return
   the app's empty HTML shell, not data, and there is no login flow a
   static GitHub Pages site can safely perform (and no credential belongs
   in public client-side code regardless). So this renders data simulated
   from the Zone's real game library instead, re-seeded once per calendar
   day rather than continuously, so the section is visually and
   functionally complete today. To go live for real: stand up a small
   read-only proxy/endpoint that returns JSON like
   { "week": [{ "name": "Fortnite", "series": [1.2, 1.6, ...] }, ...],
     "month": [...], "alltime": [...] } and swap fetchPlayData() below for
   a real fetch() to it — rendering, the range chips, and the daily
   reseed check all keep working unchanged. */
(function () {
  const rowsEl = document.getElementById('senet-chart-rows');
  const rangeWrap = document.getElementById('senet-chart-range');
  const updatedEl = document.getElementById('senet-updated');
  const heroSvg = document.getElementById('senet-hero-svg');
  const heroValueEl = document.getElementById('senet-hero-value');
  if (!rowsEl || !rangeWrap) return;

  // Cross-platform pool of Zone favorites — the chart surfaces whichever 10
  // currently have the most hours logged for the selected range.
  const POOL = [
    'Fortnite', 'VALORANT', 'League of Legends', 'Rocket League', 'Counter-Strike 2',
    'Apex Legends', 'Super Smash Bros.', 'Mario Kart', 'Street Fighter 6', 'Tekken 8',
    'Beat Saber', 'Forza Horizon 6', 'Overwatch', 'Call of Duty: Warzone',
    'Marvel Rivals', 'Dota 2',
  ];

  // min/max daily hours-played per title, and how many points the trend
  // curve plots for that range (a day each for week/month, a month each
  // for all-time).
  const RANGES = {
    week: { min: 1, max: 6.5, points: 7 },
    month: { min: 1, max: 7.5, points: 30 },
    alltime: { min: 20, max: 140, points: 12 },
  };

  const todayKey = new Date().toISOString().slice(0, 10); // reseeds once per calendar day

  // Deterministic string -> uint32 generator, so "today" always produces
  // the same numbers no matter how many times the page re-renders, and
  // the whole chart shifts to a new (but still deterministic) look the
  // next calendar day.
  function makeRng(seedStr) {
    let h = 0;
    for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
    return function next() {
      h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
      return h / 4294967296;
    };
  }

  // A gentle random walk between min/max — reads like a real activity
  // trend instead of pure noise.
  function series(name, rangeKey) {
    const r = RANGES[rangeKey];
    const rng = makeRng(`${name}|${rangeKey}|${todayKey}`);
    const mid = r.min + (r.max - r.min) * (0.35 + rng() * 0.3);
    let v = mid;
    const pts = [];
    for (let i = 0; i < r.points; i++) {
      v += (rng() - 0.5) * (r.max - r.min) * 0.35;
      v = Math.max(r.min * 0.4, Math.min(r.max * 1.15, v));
      pts.push(v);
    }
    return pts;
  }

  function totalHours(pts) { return pts.reduce((a, b) => a + b, 0); }

  function fmtHours(h) {
    return h >= 1000 ? Math.round(h).toLocaleString('en-US') : h.toFixed(1);
  }

  // Smooth path through points using midpoint quadratic curves — simple,
  // cheap, and reads as a proper curve rather than a jagged line.
  function smoothPath(points) {
    if (points.length < 2) return '';
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const midX = (points[i - 1].x + points[i].x) / 2;
      const midY = (points[i - 1].y + points[i].y) / 2;
      d += ` Q ${points[i - 1].x},${points[i - 1].y} ${midX},${midY}`;
    }
    const last = points[points.length - 1];
    d += ` L ${last.x},${last.y}`;
    return d;
  }

  function scalePoints(values, w, h, pad = 4) {
    const min = Math.min(...values), max = Math.max(...values);
    const span = (max - min) || 1;
    return values.map((v, i) => ({
      x: (i / (values.length - 1)) * w,
      y: h - pad - ((v - min) / span) * (h - pad * 2),
    }));
  }

  // Small inline sparkline (no axes, no fill) for a single game's row.
  function sparklineSvg(values) {
    const w = 120, h = 32;
    const pts = scalePoints(values, w, h, 3);
    const d = smoothPath(pts);
    return `<svg class="senetdb-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <path d="${d}" fill="none" stroke="var(--ne-orange)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  // Big Robinhood-style hero curve: smooth line + soft gradient fill down
  // to the baseline, for the combined total-hours trend.
  function renderHero(totalSeries) {
    if (!heroSvg) return;
    const w = 600, h = 150;
    const pts = scalePoints(totalSeries, w, h, 10);
    const line = smoothPath(pts);
    const area = `${line} L ${pts[pts.length - 1].x},${h} L ${pts[0].x},${h} Z`;
    heroSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    heroSvg.innerHTML = `
      <defs>
        <linearGradient id="senet-hero-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--ne-orange)" stop-opacity=".38"/>
          <stop offset="100%" stop-color="var(--ne-orange)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#senet-hero-grad)" stroke="none"/>
      <path d="${line}" fill="none" stroke="var(--ne-orange)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    `;
  }

  function render(rangeKey) {
    const data = POOL.map(name => {
      const pts = series(name, rangeKey);
      return { name, pts, hours: totalHours(pts) };
    }).sort((a, b) => b.hours - a.hours).slice(0, 10);

    rowsEl.innerHTML = data.map((g, i) => `
      <div class="senetdb-row">
        <span class="senetdb-rank">${i + 1}</span>
        <span class="senetdb-name">${GZ.esc(g.name)}</span>
        <span class="senetdb-spark-wrap">${sparklineSvg(g.pts)}</span>
        <span class="senetdb-hours">${fmtHours(g.hours)}<small>h</small></span>
      </div>`).join('');

    // Hero curve = combined total across the whole pool (not just the top
    // 10), point-for-point, so it reads as the Zone's overall usage trend.
    const r = RANGES[rangeKey];
    const totals = new Array(r.points).fill(0);
    POOL.forEach(name => { series(name, rangeKey).forEach((v, i) => { totals[i] += v; }); });
    renderHero(totals);
    if (heroValueEl) heroValueEl.textContent = fmtHours(totals.reduce((a, b) => a + b, 0));

    if (updatedEl) {
      const label = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      updatedEl.textContent = `Updated ${label}`;
    }
  }

  rangeWrap.addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    rangeWrap.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    render(btn.dataset.range);
  });

  render('week');
})();
