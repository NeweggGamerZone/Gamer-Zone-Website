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
  // Path is resolved relative to THIS PAGE (events.html, at the repo root),
  // not style.css — see the 2026-09-22 comment block below on why these are
  // now baked directly into each render() as a real <div>'s inline style
  // rather than routed through a CSS custom property.
  const BG_DIR = 'assets/calendar/BGAssets/';
  // The -blurred variants are pre-rendered offline (blur/darken/desaturate
  // baked into the JPG itself) rather than relying on a live CSS blur
  // filter, which renders blocky/pixelated in some browsers — see the
  // .cal-board::before comment in style.css.
  const TYPE_BG = {
    edu: BG_DIR + 'training-bg-blurred.jpg',
    tournament: BG_DIR + 'tournament-major-bg-blurred.jpg',
    'theme-night': BG_DIR + 'freeplay-bg2-blurred.jpg',
    vendor: BG_DIR + 'freeplay-bg3-blurred.jpg',
    community: BG_DIR + 'freeplay-bg3-blurred.jpg',
  };
  const FREE_PLAY_BG = BG_DIR + 'dailyplay-bg-blurred.jpg';
  // 2026-09-19, per Eric ("cycling special images for major events"): a
  // single day's card used to always show the exact same majorevent2-bg
  // photo for every 'major'-type event, no matter which one -- every
  // major day on the calendar looked identical. Cycles between the two
  // real, purpose-shot "big event" background photos already in this
  // folder (both already used elsewhere on this page for tournament/major
  // energy, so this is reusing real, likeminded assets, not inventing new
  // ones) rather than a single fixed image. Picked deterministically from
  // the event's own date string (not Math.random()) so the same event
  // always renders the same photo on every visit/reload -- only different
  // events land on different photos, nothing flickers.
  const MAJOR_BG_POOL = [BG_DIR + 'majorevent2-bg-blurred.jpg', BG_DIR + 'tournament-major-bg-blurred.jpg'];
  function majorBgFor(e) {
    const key = (e && (e.date || e.title)) || '';
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return MAJOR_BG_POOL[h % MAJOR_BG_POOL.length];
  }
  // 2026-09-22, per Eric ("special graphics on days with specific events,
  // daily normal free play uses a base image"): real per-event/per-day
  // photo backgrounds are back, after being removed site-wide on 2026-09-08
  // for an intermittent "renders once then disappears" flash/pop bug that
  // was never actually root-caused -- the old fix just deleted the photo
  // layer rather than diagnosing the race (see the .cal-detail comment in
  // style.css). Two deliberate differences from that old, buggy
  // implementation, aimed squarely at the two most likely real causes of a
  // "loads once, then vanishes" symptom:
  //   1. No more CSS custom property indirection (--cd-bg set via
  //      el.style.setProperty(), read back by a ::before{background-image:
  //      var(--cd-bg)} rule days apart in the codebase). The URL is now
  //      baked directly into a real <div>'s inline style string as part of
  //      the SAME innerHTML assignment that renders the day's text -- one
  //      atomic DOM write, nothing set-then-read-later to race against.
  //   2. Every distinct background URL is preloaded with a plain `new
  //      Image()` once, up front (see preloadBgs() below, called once at
  //      init) -- if the old bug really was a load-order/caching race (a
  //      background-image the browser hadn't finished fetching yet on a
  //      rapid hover-sweep), every image this page can possibly show is
  //      already decoded and cache-warm before a visitor can hover fast
  //      enough to trigger it.
  // bgFor(e) resolves a per-event override first (data/events.json's own
  // `image` field, for a specific real photo like the SF6 Saturday Slam
  // crowd shot) before falling back to the existing per-type/major-pool
  // logic -- so most days still get their generic type photo, and only
  // days with a real, specific photo on file get something more special.
  function bgFor(e) {
    if (e && e.image) return e.image;
    if (e && e.type === 'major') return majorBgFor(e);
    return (e && TYPE_BG[e.type]) || FREE_PLAY_BG;
  }
  function preloadBgs() {
    const urls = new Set([FREE_PLAY_BG, ...Object.values(TYPE_BG), ...MAJOR_BG_POOL]);
    (data.events || []).forEach(e => { if (e.image) urls.add(e.image); });
    urls.forEach(u => { const img = new Image(); img.src = u; });
  }
  function bgLayer(url) {
    // Real DOM nodes (not pseudo-elements), rendered fresh as part of the
    // same innerHTML string as the card's text -- see the block comment
    // above for why this differs from the pre-2026-09-08 implementation.
    return `<div class="cd-bg-photo" style="background-image:url('${url}')" aria-hidden="true"></div><div class="cd-bg-scrim" aria-hidden="true"></div>`;
  }
  // Real, structured prize/perk details (data/events.json's own `prizes`/
  // `perks` fields, e.g. the SF6 Saturday Slam bracket payouts + its free
  // pizza lunch) -- generic and reusable by any future event that defines
  // the same fields, not a one-off hand-coded block just for this event.
  function prizeBlock(e) {
    if (!e || !e.prizes || !e.prizes.length) return '';
    const ord = n => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);
    const rows = e.prizes.map(p => `<div class="prize-row"><span class="place">${p.place}</span><span><span class="amt">$${p.amount}</span><span class="place-label">${ord(p.place)} Place</span></span></div>`).join('');
    const perks = (e.perks && e.perks.length) ? e.perks.map(p => `<div class="perk-chip">${GZ.esc(p)}</div>`).join('') : '';
    return `<div class="prize-heading">Bracket Prizing</div><div class="prize-table">${rows}</div>${perks}`;
  }
  const t0 = new Date(today + 'T12:00:00');
  let view = new Date(t0.getFullYear(), t0.getMonth(), 1);

  // 2026-09-18, per Eric ("let me click around the dates on the calendar,
  // and only return it back to the original date after 5 minutes of
  // inactivity"): a real 5-minute idle timer, replacing the old
  // mouseleave-instant-revert below. A click used to persist visually
  // (the .sel highlight stays put) but the very next time the cursor left
  // the grid, the hover-preview's own mouseleave handler snapped the
  // detail card straight back to today anyway -- so a click's effect
  // barely outlived the click itself for a desktop mouse user, and never
  // reverted at all for a touch user (no mouseleave event exists on
  // touch, so a tapped-open future date used to just stay open forever).
  // markActivity() is called from every real interaction (click, keyboard
  // nav, hover, month prev/next) and resets a single pending timeout;
  // resetToToday() fires only once nothing has touched the calendar for
  // a full 5 minutes, and it also snaps `view` back to today's own month
  // if the visitor had paged away, not just the detail card, so the
  // calendar really does return to "the original date" whole.
  const IDLE_RESET_MS = 5 * 60 * 1000;
  let idleTimer = null;
  function markActivity() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(resetToToday, IDLE_RESET_MS);
  }
  function resetToToday() {
    if (view.getFullYear() !== t0.getFullYear() || view.getMonth() !== t0.getMonth()) {
      view = new Date(t0.getFullYear(), t0.getMonth(), 1);
      render();
    }
    show(today);
  }

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
      // 2026-09-10, per Eric ("make the changes to event calendar as you
      // see fit," after Watermelon UI's Subscription Calendar research):
      // a quick-peek tooltip right at the cursor/focus point, wired below
      // via the shared GZ.initFullTextTooltips() component (the exact same
      // one the Games list and reviews already use -- see main.js), plus a
      // small pulsing dot (a real, non-color-dependent signal, not just
      // decoration -- see the .cal-dot comment in style.css) on any day
      // that has a specific named event. Both are additive to the
      // existing full .cal-detail panel below, which still updates on
      // hover/click/keyboard exactly as before.
      const preview = closed
        ? 'Closed'
        : (e ? `${TYPE[e.type] || e.type}: ${e.title}${e.time ? ' — ' + e.time : ''}` : 'Free Play — 10am to 7pm');
      const hasEventDot = !closed && e && TYPE_COLOR[e.type];
      const dot = hasEventDot ? '<span class="cal-dot" aria-hidden="true"></span>' : '';
      html += `<div class="${cls.join(' ')}" data-d="${dt}" data-full="${GZ.esc(preview)}" tabindex="-1" role="button" aria-label="${label}"${title}><span class="dn">${d}</span>${dot}</div>`;
    }
    grid.innerHTML = html;
    // Exactly one cell in the grid is a Tab stop at a time (today's, or
    // whichever was last focused) -- the roving-tabindex pattern, same as
    // a native date picker -- so Tabbing into the calendar doesn't require
    // stepping through every single day cell first.
    const rovingTarget = grid.querySelector(`[data-d="${today}"]`) || grid.querySelector('[data-d]');
    if (rovingTarget) rovingTarget.tabIndex = 0;
    GZ.initFullTextTooltips(grid);
  }

  function show(dt) {
    const e = byDate[dt], wd = new Date(dt + 'T12:00:00').getDay();
    const closedByType = !!(e && e.type === 'closed');
    const closed = (wd === 0 || wd === 1) || closedByType;
    const isToday = dt === today;
    const preregBlock = isToday
      ? `<p style="margin-top:.8rem"><a class="btn prereg-btn" href="${GZ.esc(verkada)}" target="_blank" rel="noopener">Preregister your visit</a></p><p class="dim" style="font-size:.78rem;margin-top:.4rem">Visiting today? Skip the line: preregistrations are one per visitor.</p>`
      : '';
    // 2026-09-18, per Eric ("add Start.GG links and buttons for the dates
    // ahead... Preregister should appear under those buttons when it's the
    // day of. Call it Tournament Sign Up"): a real per-event `startgg` URL
    // (data/events.json, tournament-type entries only, hand-verified
    // against the tournament's own real start.gg page -- see the daily-
    // updates scheduled task for how these stay current) renders as its
    // own button, reusing the same `.btn.prereg-btn` unified button
    // treatment every other primary CTA on this card already uses rather
    // than inventing a second button look. Only shown for today or a real
    // future date (`dt >= today`, safe as a plain ISO string compare) --
    // a past tournament's registration has already closed, so the button
    // isn't shown there. `preregBlock` above is unchanged and still only
    // ever renders on the day-of, so stacking it directly under this one
    // in cd-body is exactly "Preregister appears under Tournament Sign Up
    // when it's the day of," with zero extra conditional needed here.
    const startggBlock = (e && e.startgg && dt >= today)
      ? `<p style="margin-top:.8rem"><a class="btn prereg-btn" href="${GZ.esc(e.startgg)}" target="_blank" rel="noopener">Tournament Sign Up</a></p>`
      : '';
    // Reorganized card layout, same order/spacing for every day type:
    // tag -> title -> subtitle -> date/time meta row (with icons) ->
    // description -> CTA.
    if (e && !closedByType) {
      const typeCls = TYPE_COLOR[e.type] || 'cal-edu';
      detail.innerHTML = `${bgLayer(bgFor(e))}<span class="tag ${typeCls}">${GZ.esc(TYPE[e.type] || e.type || 'Event')}</span>
        <h3>${GZ.esc(e.title)}</h3>
        ${e.subtitle ? `<p class="cd-sub">${GZ.esc(e.subtitle)}</p>` : ''}
        <div class="cd-meta">
          <span class="cd-meta-item"><i data-ic="cal"></i>${pretty(dt)}</span>
          ${e.time ? `<span class="cd-meta-item"><i data-ic="clock"></i>${GZ.esc(e.time)}</span>` : ''}
        </div>
        ${e.blurb ? `<p class="cd-blurb">${GZ.esc(e.blurb)}</p>` : ''}
        <div class="cd-body">${prizeBlock(e)}${startggBlock}${preregBlock}</div>`;
    } else if (closed) {
      // Closed days stay a flat panel, no photo -- there's no "day of"
      // photo to show for a closure, and this matches Eric's actual ask
      // (special-event graphics + a base Free Play image), not a request
      // to photo-back every single day type.
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
      detail.innerHTML = `${bgLayer(FREE_PLAY_BG)}<span class="tag cal-free">Free Play</span>
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
    markActivity();
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
      markActivity();
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
      markActivity();
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
    markActivity();
  });
  // 2026-09-18: no more instant mouseleave-revert here -- see the
  // resetToToday()/markActivity() idle-timer block near the top of this
  // file for the real 5-minute-inactivity behavior that replaces it.
  document.getElementById('cal-prev').addEventListener('click', () => { view.setMonth(view.getMonth() - 1); render(); markActivity(); });
  document.getElementById('cal-next').addEventListener('click', () => { view.setMonth(view.getMonth() + 1); render(); markActivity(); });

  preloadBgs();
  render();
  // Default to today — the same thing shown whenever nothing is hovered.
  show(today);
})();
