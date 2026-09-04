/* Interactive Plan-Your-Visit calendar. Data-driven from data/events.json.
   Click a date: shows event details (title, time, blurb, flyer + pre-register),
   or Free Play (open Tue–Sat) with pre-register, or Closed (Sun/Mon). */
(async function () {
  const grid = document.getElementById('cal-grid');
  if (!grid) return;
  const monthEl = document.getElementById('cal-month');
  const detail = document.getElementById('cal-detail');

  const cfg = await GZ.config();
  const today = GZ.todayISO();
  // Verkada guest check-in link — the newegg.com/promotions reservation
  // page is retired and no longer used (see main.js).
  const verkada = cfg.verkadaUrl || cfg.reservationUrl;

  let data = { events: [] };
  try { data = await (await fetch('data/events.json')).json(); } catch {}
  const byDate = {};
  (data.events || []).forEach(e => { byDate[e.date] = e; });

  const TYPE = { 'theme-night': 'Theme Day', tournament: 'Tournament', vendor: 'Vendor', edu: 'Training', community: 'Community', major: 'Major' };
  // Color-code buckets: Closed=red, Free Play=blue, Theme Day=light blue,
  // EDU/Esports=green, Ambassador (vendor/community-hosted)=pink, Major/Tournament=orange.
  const TYPE_COLOR = { 'theme-night': 'cal-theme', tournament: 'cal-major', vendor: 'cal-amb', edu: 'cal-edu', community: 'cal-amb', major: 'cal-major' };
  // Full-bleed card backgrounds, sourced from assets/calendar/BGAssets — chosen
  // per event type so the popup reads as "photo of that kind of event" rather
  // than a generic flyer image.
  // Path is resolved relative to style.css (assets/css/), not this page,
  // since the value is substituted into a CSS custom property.
  const BG_DIR = '../calendar/BGAssets/';
  // The -blurred variants are pre-rendered offline (blur/darken/desaturate
  // baked into the JPG itself) rather than relying on a live CSS blur
  // filter, which renders blocky/pixelated in some browsers — see the
  // .cal-board::before comment in style.css.
  const TYPE_BG = {
    edu: BG_DIR + 'training-bg-blurred.jpg',
    tournament: BG_DIR + 'tournament-major-bg-blurred.jpg',
    major: BG_DIR + 'majorevent2-bg-blurred.jpg',
    'theme-night': BG_DIR + 'freeplay-bg2-blurred.jpg',
    vendor: BG_DIR + 'freeplay-bg3-blurred.jpg',
    community: BG_DIR + 'freeplay-bg3-blurred.jpg',
  };
  const FREE_PLAY_BG = BG_DIR + 'dailyplay-bg-blurred.jpg';
  function setCardBg(url) {
    if (url) detail.style.setProperty('--cd-bg', `url('${url}')`);
    else detail.style.removeProperty('--cd-bg');
  }
  const t0 = new Date(today + 'T12:00:00');
  let view = new Date(t0.getFullYear(), t0.getMonth(), 1);

  const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const pretty = dt => new Date(dt + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // 2026-09-04, F-07 fix (scenes-not-specs audit: "'Plan your visit' lands
  // on a CLOSED sign" -- a weekend planner had to manually click forward
  // to find out when the Zone reopens, or whether anything's on that day).
  // Eric's call after discussion: keep TODAY as the default view even when
  // it's closed (Sun/Mon closures are the fixed weekly schedule, not an
  // edge case, and the Preregister CTA is same-day-only anyway -- showing
  // a future day as the "default" would misleadingly imply you could act
  // on it now). The actual fix is narrower: replace the old generic
  // "The Gamer Zone is open Tuesday through Saturday" sentence with the
  // real next open date, computed from the same events.json data the rest
  // of the calendar already uses -- no fabricated "what's next," just the
  // true next day the venue is actually open, walked forward day-by-day
  // from whichever date is being viewed (capped at 21 days out so a data
  // gap can't spin forever).
  function nextOpenInfo(dt) {
    const d = new Date(dt + 'T12:00:00');
    for (let i = 0; i < 21; i++) {
      d.setDate(d.getDate() + 1);
      const dISO = iso(d.getFullYear(), d.getMonth(), d.getDate());
      const wd = d.getDay();
      const ev = byDate[dISO];
      if (wd === 0 || wd === 1 || (ev && ev.type === 'closed')) continue;
      return { date: dISO, event: ev || null };
    }
    return null;
  }

  function render() {
    const y = view.getFullYear(), m = view.getMonth();
    monthEl.textContent = view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    let html = '';
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(d => html += `<div class="cal-dow">${d}</div>`);
    for (let i = 0; i < first; i++) html += '<div class="cal-cell empty"></div>';
    for (let d = 1; d <= days; d++) {
      const dt = iso(y, m, d), wd = new Date(y, m, d).getDay();
      const e = byDate[dt];
      const closed = (wd === 0 || wd === 1) || (e && e.type === 'closed');
      const cls = ['cal-cell'];
      if (closed) cls.push('closed', 'cal-closed');
      else if (e) cls.push(TYPE_COLOR[e.type] || 'cal-edu');
      else cls.push('cal-free');
      if (dt === today) cls.push('today');
      const title = closed ? ' title="Closed"' : '';
      // tabindex + role=button + aria-label make each day keyboard-
      // reachable and screen-reader-legible (previously click/hover only,
      // with no way to even focus a cell via Tab) -- see the grid keydown
      // handler below for Arrow-key navigation between cells and
      // Enter/Space activation, matching standard date-grid conventions.
      const label = closed ? `${pretty(dt)}, Closed` : `${pretty(dt)}${e ? ', ' + (TYPE[e.type] || e.type) : ', Free Play'}`;
      html += `<div class="${cls.join(' ')}" data-d="${dt}" tabindex="-1" role="button" aria-label="${label}"${title}><span class="dn">${d}</span></div>`;
    }
    grid.innerHTML = html;
    // Exactly one cell in the grid is a Tab stop at a time (today's, or
    // whichever was last focused) -- the roving-tabindex pattern, same as
    // a native date picker -- so Tabbing into the calendar doesn't require
    // stepping through every single day cell first.
    const rovingTarget = grid.querySelector(`[data-d="${today}"]`) || grid.querySelector('[data-d]');
    if (rovingTarget) rovingTarget.tabIndex = 0;
  }

  function show(dt) {
    const e = byDate[dt], wd = new Date(dt + 'T12:00:00').getDay();
    const closedByType = !!(e && e.type === 'closed');
    const closed = (wd === 0 || wd === 1) || closedByType;
    const isToday = dt === today;
    const preregBlock = isToday
      ? `<p style="margin-top:.8rem"><a class="btn" href="${GZ.esc(verkada)}" target="_blank" rel="noopener">Preregister your visit</a></p><p class="dim" style="font-size:.78rem;margin-top:.4rem">Visiting today? Skip the line: reservations are one per visitor.</p>`
      : '';
    // Reorganized card layout, same order/spacing for every day type:
    // tag -> title -> subtitle -> date/time meta row (with icons) ->
    // description -> CTA.
    if (e && !closedByType) {
      const typeCls = TYPE_COLOR[e.type] || 'cal-edu';
      setCardBg(TYPE_BG[e.type] || FREE_PLAY_BG);
      detail.innerHTML = `<span class="tag ${typeCls}">${GZ.esc(TYPE[e.type] || e.type || 'Event')}</span>
        <h3>${GZ.esc(e.title)}</h3>
        ${e.subtitle ? `<p class="cd-sub">${GZ.esc(e.subtitle)}</p>` : ''}
        <div class="cd-meta">
          <span class="cd-meta-item"><i data-ic="cal"></i>${pretty(dt)}</span>
          ${e.time ? `<span class="cd-meta-item"><i data-ic="clock"></i>${GZ.esc(e.time)}</span>` : ''}
        </div>
        ${e.blurb ? `<p class="cd-blurb">${GZ.esc(e.blurb)}</p>` : ''}
        <div class="cd-body">${preregBlock}</div>`;
    } else if (closed) {
      setCardBg(null);
      const reasonLine = (closedByType && e.blurb) ? `<p class="cd-blurb">${GZ.esc(e.blurb)}</p>` : '';
      const next = nextOpenInfo(dt);
      const nextLine = next
        ? `Reopens ${pretty(next.date)}${next.event && next.event.title ? ` for ${GZ.esc(next.event.title)}` : ' for Free Play'}.`
        : 'The Gamer Zone is open Tuesday through Saturday, 10am to 7pm.';
      detail.innerHTML = `<span class="tag cal-closed">Closed</span>
        <h3>${pretty(dt)}</h3>
        ${reasonLine}
        <p class="cd-blurb">${nextLine}</p>`;
    } else {
      setCardBg(FREE_PLAY_BG);
      detail.innerHTML = `<span class="tag cal-free">Free Play</span>
        <h3>FREE PLAY: ${pretty(dt)}</h3>
        <div class="cd-meta"><span class="cd-meta-item"><i data-ic="clock"></i>10am to 7pm</span></div>
        <p class="cd-blurb">Open 10am to 7pm. Try the latest tech for free: walk in, or pre-register to skip the line at check-in.</p>
        ${preregBlock}`;
    }
    injectIcons(detail);
    grid.querySelectorAll('.cal-cell.sel').forEach(c => c.classList.remove('sel'));
    const cell = grid.querySelector(`[data-d="${dt}"]`);
    if (cell) cell.classList.add('sel');
  }

  // 2026-09-04, per Eric: "Do not let users click on the closed dates."
  // Consistent with the hover exclusion already below (closed days aren't
  // a real destination -- nothing to preregister, nothing to browse), a
  // closed cell no longer responds to a click at all -- it stays focusable
  // and its aria-label still announces "..., Closed" for screen reader
  // users, it just doesn't update the detail card or steal the selection
  // highlight. Today's own default view (show(today) at the bottom of
  // this file) is unaffected either way, since that's not a click.
  grid.addEventListener('click', e => {
    const c = e.target.closest('.cal-cell[data-d]');
    if (!c || c.classList.contains('cal-closed')) return;
    show(c.dataset.d);
    grid.querySelectorAll('[data-d]').forEach(cell => { cell.tabIndex = -1; });
    c.tabIndex = 0;
  });
  // Keyboard operation: Enter/Space activates the focused day (same as a
  // click); Arrow keys move focus cell-to-cell (Left/Right = adjacent day,
  // Up/Down = same weekday, previous/next week) rather than only being
  // reachable by Tabbing past every single day. Moving past the start/end
  // of the currently-rendered month advances the calendar itself (via the
  // existing prev/next buttons' own click handlers) and lands focus on the
  // matching day in the newly-rendered month, so Arrow navigation never
  // just dead-ends at a month boundary.
  grid.addEventListener('keydown', e => {
    const c = e.target.closest('.cal-cell[data-d]');
    if (!c) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      if (c.classList.contains('cal-closed')) return; // closed days aren't activatable, see click handler above
      show(c.dataset.d);
      return;
    }
    const deltas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const delta = deltas[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    const d = new Date(c.dataset.d + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    const sameMonth = d.getMonth() === view.getMonth() && d.getFullYear() === view.getFullYear();
    if (!sameMonth) {
      view = new Date(d.getFullYear(), d.getMonth(), 1);
      render();
    }
    const next = grid.querySelector(`[data-d="${iso(d.getFullYear(), d.getMonth(), d.getDate())}"]`);
    if (next) {
      grid.querySelectorAll('[data-d]').forEach(cell => { cell.tabIndex = -1; });
      next.tabIndex = 0;
      next.focus();
      show(next.dataset.d);
    }
  });
  // Preview a day's event just by hovering — no click needed on desktop.
  // 2026-08-26, per Eric: closed (greyed-out, X'd) days no longer preview
  // on hover -- they're not a real destination (nothing to preregister,
  // nothing to browse), so treating a hover the same as an open day
  // implied more interactivity than a closed day actually has. A closed
  // day's "Closed" detail still shows on a deliberate click (see the
  // click handler below), just not from an incidental mouse-over.
  grid.addEventListener('mouseover', e => {
    const c = e.target.closest('.cal-cell[data-d]');
    if (!c || c.classList.contains('cal-closed')) return;
    show(c.dataset.d);
  });
  // Once the cursor leaves the grid entirely, fall back to today rather than
  // leaving whatever day was last hovered on screen.
  grid.addEventListener('mouseleave', () => show(today));
  document.getElementById('cal-prev').addEventListener('click', () => { view.setMonth(view.getMonth() - 1); render(); });
  document.getElementById('cal-next').addEventListener('click', () => { view.setMonth(view.getMonth() + 1); render(); });

  render();
  // Default to today — the same thing shown whenever nothing is hovered.
  show(today);
})();
