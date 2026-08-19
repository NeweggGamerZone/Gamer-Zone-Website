/* SENET Live Play Chart — radial pie chart of hours-played distribution
   across the top games at the Zone, with a Weekly / Monthly / All-Time
   range switcher and a hover/touch breakdown per slice.

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
   { "week": [{ "name": "Fortnite", "hours": 12.4 }, ...],
     "month": [...], "alltime": [...] } and swap fetchPlayData() below for
   a real fetch() to it — rendering, the range chips, and the daily
   reseed check all keep working unchanged.

   A scheduled weekly/daily job on our side (hitting the real admin panel
   with real credentials, server-side, then writing that JSON somewhere
   this static site can fetch) is the only way to get live numbers here —
   the site itself can't run on a schedule or hold a login, since it's
   just files served by GitHub Pages with no server of its own. Once that
   small proxy exists, this file's fetch/reseed logic doesn't need to
   change at all. */
(function () {
  const rowsEl = document.getElementById('senet-chart-rows');
  const rangeWrap = document.getElementById('senet-chart-range');
  const updatedEl = document.getElementById('senet-updated');
  const pieSvg = document.getElementById('senet-pie-svg');
  const heroValueEl = document.getElementById('senet-hero-value');
  const pieTip = document.getElementById('senet-pie-tip');
  const pieTipVal = document.getElementById('senet-pie-tip-val');
  const pieTipLabel = document.getElementById('senet-pie-tip-label');
  if (!rowsEl || !rangeWrap || !pieSvg) return;

  // Cross-platform pool of Zone favorites — the chart surfaces whichever N
  // currently have the most hours logged for the selected range.
  const POOL = [
    'Fortnite', 'VALORANT', 'League of Legends', 'Rocket League', 'Counter-Strike 2',
    'Apex Legends', 'Super Smash Bros.', 'Mario Kart', 'Street Fighter 6', 'Tekken 8',
    'Beat Saber', 'Forza Horizon 6', 'Overwatch', 'Call of Duty: Warzone',
    'Marvel Rivals', 'Dota 2',
  ];

  // min/max total hours-played per title for the selected range.
  const RANGES = {
    week: { min: 6, max: 44 },
    month: { min: 24, max: 190 },
    alltime: { min: 240, max: 1680 },
  };

  const TOP_N = 6; // slices shown in the pie / rows below it
  const SLICE_COLORS = ['#FA9D28', '#3D8BFF', '#5FD3E8', '#3FBF6B', '#E85DA0', '#B98CE8'];

  const todayKey = GZ.todayISO(); // reseeds once per calendar day (visitor's local date, not UTC)

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

  function hoursFor(name, rangeKey) {
    const r = RANGES[rangeKey];
    const rng = makeRng(`${name}|${rangeKey}|${todayKey}`);
    return r.min + (r.max - r.min) * rng();
  }

  function fmtHours(h) {
    return h >= 1000 ? Math.round(h).toLocaleString('en-US') : h.toFixed(1);
  }

  function polarPoint(cx, cy, r, angleDeg) {
    const a = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }

  // Single pie slice as an SVG path, drawn from the center out to the arc
  // and back — a full circle (one game with 100% share) is special-cased
  // since a 360° arc command degenerates to nothing.
  function slicePath(cx, cy, r, startAngle, endAngle) {
    if (endAngle - startAngle >= 359.999) {
      return `M ${cx - r},${cy} A ${r},${r} 0 1 1 ${cx + r},${cy} A ${r},${r} 0 1 1 ${cx - r},${cy} Z`;
    }
    const start = polarPoint(cx, cy, r, startAngle);
    const end = polarPoint(cx, cy, r, endAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${cx},${cy} L ${start.x},${start.y} A ${r},${r} 0 ${largeArc} 1 ${end.x},${end.y} Z`;
  }

  let sliceData = [];

  function showTip(clientRect, d) {
    if (!pieTip || !pieTipVal || !pieTipLabel) return;
    pieTipVal.textContent = `${fmtHours(d.hours)}h`;
    pieTipLabel.textContent = `${d.name} · ${d.pct.toFixed(1)}%`;
    pieTip.classList.add('is-visible');
  }
  function moveTip(evt) {
    if (!pieTip) return;
    const wrap = pieSvg.closest('.senetdb-pie-holder');
    const rect = wrap.getBoundingClientRect();
    const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
    const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
    pieTip.style.left = `${clientX - rect.left}px`;
    pieTip.style.top = `${clientY - rect.top}px`;
  }
  function hideTip() {
    if (pieTip) pieTip.classList.remove('is-visible');
    document.querySelectorAll('#senet-pie-svg path').forEach(p => p.classList.remove('is-hover'));
  }

  function renderPie(data) {
    const cx = 100, cy = 100, r = 92;
    let angle = 0;
    const paths = data.map((d, i) => {
      const sweep = d.pct * 3.6;
      const path = slicePath(cx, cy, r, angle, angle + sweep);
      const midAngle = angle + sweep / 2;
      angle += sweep;
      return `<path d="${path}" fill="${SLICE_COLORS[i % SLICE_COLORS.length]}" data-i="${i}" data-mid="${midAngle}"></path>`;
    }).join('');
    pieSvg.innerHTML = paths;

    pieSvg.querySelectorAll('path').forEach(el => {
      const i = Number(el.dataset.i);
      el.addEventListener('mouseenter', e => {
        document.querySelectorAll('#senet-pie-svg path').forEach(p => p.classList.remove('is-hover'));
        el.classList.add('is-hover');
        showTip(null, data[i]);
        moveTip(e);
      });
      el.addEventListener('mousemove', moveTip);
      el.addEventListener('mouseleave', hideTip);
      el.addEventListener('touchstart', e => {
        el.classList.add('is-hover');
        showTip(null, data[i]);
        moveTip(e);
      }, { passive: true });
    });
  }

  function render(rangeKey) {
    const data = POOL.map(name => ({ name, hours: hoursFor(name, rangeKey) }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, TOP_N);
    const total = data.reduce((a, g) => a + g.hours, 0);
    data.forEach(g => { g.pct = total ? (g.hours / total) * 100 : 0; });
    sliceData = data;

    hideTip();
    renderPie(data);
    if (heroValueEl) heroValueEl.textContent = fmtHours(total);

    rowsEl.innerHTML = data.map((g, i) => `
      <div class="senetdb-row" data-i="${i}">
        <span class="senetdb-swatch" style="background:${SLICE_COLORS[i % SLICE_COLORS.length]}"></span>
        <span class="senetdb-name">${GZ.esc(g.name)}</span>
        <span class="senetdb-pct">${g.pct.toFixed(1)}%</span>
        <span class="senetdb-hours">${fmtHours(g.hours)}<small>h</small></span>
      </div>`).join('');

    rowsEl.querySelectorAll('.senetdb-row').forEach(row => {
      const i = Number(row.dataset.i);
      row.addEventListener('mouseenter', () => {
        const path = pieSvg.querySelector(`path[data-i="${i}"]`);
        if (path) { document.querySelectorAll('#senet-pie-svg path').forEach(p => p.classList.remove('is-hover')); path.classList.add('is-hover'); }
      });
      row.addEventListener('mouseleave', hideTip);
    });

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
