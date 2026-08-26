/* SENET Live Play Chart — radial pie chart of all-time hours-played
   distribution across the top games at the Zone, with a hover/touch
   breakdown per slice.

   IMPORTANT — there is no working public API this static site can call.
   The URL the team pointed at (an authenticated admin-panel single-page
   app) is not a public JSON endpoint — fetching it from a visitor's
   browser would return the app's empty HTML shell, not data, and there
   is no login flow a static GitHub Pages site can safely perform (and no
   credential belongs in public client-side code regardless). Eric
   confirmed (2026-08-25) he'll keep refreshing ALLTIME_REAL by hand from
   a Senet export rather than standing up a live pipeline for this right
   now — see docs/08-USABILITY-AUDIT-AND-ROADMAP.md, "On the SENET data
   pipeline," for the full reasoning. If that ever changes, a small
   read-only proxy/endpoint returning JSON like
   [{ "name": "Fortnite", "hours": 12.4 }, ...] is the only piece needed —
   swap fetchPlayData() in for the hardcoded array below and everything
   else (rendering, hover) keeps working unchanged.

   UPDATE 2026-08-26 — removed the "Updated [today's date]" label per
   Eric's call: it always rendered the CURRENT date regardless of when
   ALLTIME_REAL was actually last refreshed, which read as a live-data
   claim this static snapshot can't back up. Don't reintroduce a date
   label here unless it's driven by the real last-refresh date, not
   today's date.

   UPDATE 2026-08-25 — this chart is now All-Time only, permanently (the
   This Week / This Month range chips were removed at Eric's request:
   those two ranges were simulated placeholder data reseeded daily, which
   risked reading as fake to a regular comparing it against their own
   actual session -- All-Time is the one range that's ever been real, so
   it's now the only option, full stop). Do not reintroduce a range
   switcher without real data behind every option it offers. */
(function () {
  const rowsEl = document.getElementById('senet-chart-rows');
  const pieSvg = document.getElementById('senet-pie-svg');
  const heroValueEl = document.getElementById('senet-hero-value');
  const pieTip = document.getElementById('senet-pie-tip');
  const pieTipVal = document.getElementById('senet-pie-tip-val');
  const pieTipLabel = document.getElementById('senet-pie-tip-label');
  if (!rowsEl || !pieSvg) return;

  // Real "Total duration" (all-time hours played) snapshot from the Senet
  // dashboard, captured 2026-08-25 (replaces the 2026-08-22 export -- every
  // title logged more hours in between, confirming this is a fresh pull,
  // not a stale repeat). Hardcoded because there's still no live feed (see
  // file header) -- replace wholesale the next time a fresh export comes
  // in, rather than trying to merge/interpolate old and new.
  const ALLTIME_REAL = [
    { name: 'VALORANT', hours: 484 + 50 / 60 },
    { name: 'League of Legends', hours: 432 + 50 / 60 },
    { name: 'Fortnite', hours: 194 + 31 / 60 },
    { name: 'Overwatch', hours: 175 + 40 / 60 },
    { name: 'Marvel Rivals', hours: 143 + 4 / 60 },
    { name: 'Fall Guys', hours: 131 + 14 / 60 },
    { name: 'Counter-Strike 2', hours: 75 + 34 / 60 },
    { name: 'Mecha Chameleon', hours: 55 + 8 / 60 },
  ];

  const TOP_N = 6; // slices shown in the pie / rows below it
  const SLICE_COLORS = ['#FA9D28', '#3D8BFF', '#5FD3E8', '#3FBF6B', '#E85DA0', '#B98CE8'];

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

  function showTip(evt, d) {
    if (!pieTip || !pieTipVal || !pieTipLabel) return;
    pieTipVal.textContent = `${fmtHours(d.hours)}h`;
    pieTipLabel.textContent = `${d.name} · ${d.pct.toFixed(1)}%`;
    pieTip.style.setProperty('--tip-c', d.color);
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
    document.querySelectorAll('.senetdb-row').forEach(r => r.classList.remove('is-hover'));
  }

  // Slices "pop" outward from the donut center on hover (see .senetdb-pie
  // path.is-hover in style.css) -- --mx/--my are the unit vector toward
  // each slice's own middle angle, so the CSS transform can push it
  // straight outward along that exact direction rather than a generic
  // scale-in-place. --slice-c backs the hover glow with the slice's own
  // color instead of a flat white highlight.
  function renderPie(data) {
    const cx = 100, cy = 100, r = 92;
    let angle = 0;
    const paths = data.map((d, i) => {
      const sweep = d.pct * 3.6;
      const path = slicePath(cx, cy, r, angle, angle + sweep);
      const midAngle = angle + sweep / 2;
      angle += sweep;
      const rad = (midAngle - 90) * Math.PI / 180;
      const mx = Math.cos(rad).toFixed(3);
      const my = Math.sin(rad).toFixed(3);
      const color = SLICE_COLORS[i % SLICE_COLORS.length];
      d.color = color;
      return `<path d="${path}" fill="${color}" data-i="${i}" style="--mx:${mx};--my:${my};--slice-c:${color}"></path>`;
    }).join('');
    pieSvg.innerHTML = paths;

    pieSvg.querySelectorAll('path').forEach(el => {
      const i = Number(el.dataset.i);
      el.addEventListener('mouseenter', e => {
        document.querySelectorAll('#senet-pie-svg path').forEach(p => p.classList.remove('is-hover'));
        el.classList.add('is-hover');
        const row = rowsEl.querySelector(`.senetdb-row[data-i="${i}"]`);
        document.querySelectorAll('.senetdb-row').forEach(r => r.classList.remove('is-hover'));
        if (row) row.classList.add('is-hover');
        showTip(e, data[i]);
        moveTip(e);
      });
      el.addEventListener('mousemove', moveTip);
      el.addEventListener('mouseleave', hideTip);
      el.addEventListener('touchstart', e => {
        el.classList.add('is-hover');
        showTip(e, data[i]);
        moveTip(e);
      }, { passive: true });
    });
  }

  function render() {
    const data = ALLTIME_REAL.slice()
      .sort((a, b) => b.hours - a.hours)
      .slice(0, TOP_N);
    const total = data.reduce((a, g) => a + g.hours, 0);
    data.forEach(g => { g.pct = total ? (g.hours / total) * 100 : 0; });
    sliceData = data;

    hideTip();
    renderPie(data);
    if (heroValueEl) heroValueEl.textContent = fmtHours(total);

    rowsEl.innerHTML = data.map((g, i) => `
      <div class="senetdb-row" data-i="${i}" style="--row-c:${SLICE_COLORS[i % SLICE_COLORS.length]}">
        <span class="senetdb-swatch" style="background:${SLICE_COLORS[i % SLICE_COLORS.length]}"></span>
        <span class="senetdb-name">${GZ.esc(g.name)}</span>
        <span class="senetdb-pct">${g.pct.toFixed(1)}%</span>
        <span class="senetdb-hours">${fmtHours(g.hours)}<small>h</small></span>
      </div>`).join('');

    rowsEl.querySelectorAll('.senetdb-row').forEach(row => {
      const i = Number(row.dataset.i);
      row.addEventListener('mouseenter', () => {
        document.querySelectorAll('#senet-pie-svg path').forEach(p => p.classList.remove('is-hover'));
        document.querySelectorAll('.senetdb-row').forEach(r => r.classList.remove('is-hover'));
        row.classList.add('is-hover');
        const path = pieSvg.querySelector(`path[data-i="${i}"]`);
        if (path) path.classList.add('is-hover');
      });
      row.addEventListener('mouseleave', hideTip);
    });
  }

  render();
})();
