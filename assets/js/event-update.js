/* Event Update board — MAAP-poster-style schedule.
   Big Montserrat date on the left, Montserrat event title on the right (time-only
   subtagline in Open Sans below it), a pulsing star mark flags type:"major" events.
   Data-driven from data/events.json, so it stays in sync with the rest of the site. */
(async function () {
  const list = document.getElementById('eu-list');
  if (!list) return;

  // Weekly lineup board background: rotate through the week1-4 BG assets
  // based on which week of the current month it is (Mon-Sun buckets, 1-indexed
  // from the 1st of the month). A 5th week falls back to the week-1 graphic.
  (function setWeeklyBoardBg() {
    const boards = document.querySelectorAll('.eu-board');
    if (!boards.length) return;
    const today = new Date();
    let weekOfMonth = Math.ceil(today.getDate() / 7) || 1;
    if (weekOfMonth > 4) weekOfMonth = 1; // 5th week: loop back to the week-1 graphic
    // Path is resolved relative to style.css (assets/css/), not this page,
    // since the value is substituted into a CSS custom property.
    const url = `../calendar/BGAssets/event-update-bg-week${weekOfMonth}-blurred.jpg`;
    boards.forEach(b => b.style.setProperty('--eu-bg', `url('${url}')`));
  })();

  function embedded() {
    const el = document.getElementById('eu-embedded-events');
    try { return el ? JSON.parse(el.textContent) : { events: [] }; } catch { return { events: [] }; }
  }

  // Try the live JSON first (keeps this in sync with the rest of the site).
  // Falls back to the dataset embedded in the page itself — so the board
  // still renders correctly when opened directly (file://) or previewed
  // somewhere that can't fetch() a relative path.
  let data = null;
  try {
    const r = await fetch('data/events.json');
    if (r.ok) data = await r.json();
  } catch {}
  if (!data || !Array.isArray(data.events) || !data.events.length) data = embedded();

  const today = GZ.todayISO();

  // Weekly themes are explicit, named ranges (data.weeklyThemes, e.g. "Marvel
  // Week" Aug 4–8) rather than derived from a one-off theme-night event —
  // themes now stand on their own, with any specific special events for that
  // week called out separately below.
  const themeWeeks = (data.weeklyThemes || []).slice().sort((a, b) => a.start.localeCompare(b.start));
  const currentTheme = themeWeeks.find(w => today >= w.start && today <= w.end);

  let weekStart, weekEnd, themeName, themeDesc;
  if (currentTheme) {
    weekStart = currentTheme.start; weekEnd = currentTheme.end; themeName = currentTheme.theme;
    themeDesc = currentTheme.desc || '';
  } else {
    // No theme defined for this stretch yet — show a plain 5-day window
    // starting today rather than guessing at a name.
    const endD = new Date(today + 'T12:00:00'); endD.setDate(endD.getDate() + 4);
    weekStart = today; weekEnd = endD.toISOString().slice(0, 10);
    themeName = 'Free Play Week';
    themeDesc = 'Free-to-play PCs, consoles, and VR — all week.';
  }

  // This theme week's full slate — used to list closures and any special
  // events (tournaments, majors, community, EDU, vendor) still on the books.
  const weekAll = (data.events || []).filter(e => e.date >= weekStart && e.date <= weekEnd);
  const remaining = weekAll.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const closures = remaining.filter(e => e.type === 'closed');
  const specials = remaining.filter(e => e.type !== 'closed');

  const monthDate = iso => {
    const d = new Date(iso + 'T12:00:00');
    return { mon: d.toLocaleDateString('en-US', { month: 'short' }), day: d.getDate() };
  };

  // Eyebrow title now leads with the theme itself (was static "Gamer Zone
  // Weekly Lineup" text, never actually tied to the week) and the subtitle
  // underneath becomes a short line on what's being played, replacing the
  // static "Diamond Bar, CA · Free to play". The theme name itself is
  // highlighted in blue right in the masthead, and the week's date range
  // sits on the right side of that same masthead row, at the same
  // weight/size as the title (not a smaller caption).
  const eyebrowTitleEl = document.getElementById('eu-eyebrow-title');
  const eyebrowDescEl = document.getElementById('eu-eyebrow-desc');
  const eyebrowDatesEl = document.getElementById('eu-eyebrow-dates');
  if (eyebrowTitleEl) eyebrowTitleEl.innerHTML = `GAMER ZONE: <span class="eu-theme-highlight">${GZ.esc(themeName.toUpperCase())}</span>`;
  if (eyebrowDescEl) eyebrowDescEl.textContent = themeDesc;
  if (eyebrowDatesEl) {
    const s = monthDate(weekStart), e = monthDate(weekEnd);
    const dateRange = s.mon === e.mon ? `${s.mon} ${s.day} – ${e.day}` : `${s.mon} ${s.day} – ${e.mon} ${e.day}`;
    eyebrowDatesEl.textContent = dateRange.toUpperCase();
  }

  // Optional per-week badge art (data.weeklyThemes[].icon) shown bottom-
  // center of the board, above the address — e.g. a crown for a tournament
  // week. Weeks without an icon field just show the address alone.
  const boardIconEl = document.getElementById('eu-board-icon');
  const boardIconImg = document.getElementById('eu-board-icon-img');
  if (boardIconEl && boardIconImg) {
    if (currentTheme && currentTheme.icon) {
      boardIconImg.src = currentTheme.icon;
      boardIconEl.hidden = false;
    } else {
      boardIconEl.hidden = true;
      boardIconImg.removeAttribute('src');
    }
  }

  function row(ev, { closure = false } = {}) {
    const { mon, day } = monthDate(ev.date);
    const isMajor = !closure && (ev.type === 'major' || ev.featured);
    // boardTitle is an optional shorter stand-in for this one spot only —
    // the calendar, event detail card, etc. all keep reading ev.title as
    // usual. Normally unused now that fitBoardTitles() below auto-shrinks
    // long titles to fit on one line at render time; kept as a manual
    // escape hatch for the rare title too long to shrink into readability.
    const name = closure ? ev.title : (ev.boardTitle || ev.title);
    return `<div class="eu-row${isMajor ? ' eu-major' : ''}${closure ? ' eu-closure' : ''}">
      <div class="eu-date-wrap">
        <span class="eu-date">${mon.toUpperCase()} ${day}</span>
        ${isMajor ? '<span class="eu-major-mark" aria-hidden="true">&#9733;</span>' : ''}
      </div>
      <div class="eu-info">
        <div class="eu-name">${closure ? 'Closed — ' : ''}${GZ.esc(name.replace(/^Closed\s*[—-]\s*/, ''))}</div>
        <div class="eu-meta">${ev.time ? GZ.esc(ev.time) : ''}</div>
      </div>
    </div>`;
  }

  const rows = [
    ...closures.map(e => row(e, { closure: true })),
    ...specials.map(e => row(e)),
  ];

  list.innerHTML = rows.length
    ? rows.join('')
    : '<div class="calendar-empty">Just the weekly theme this week, no closures or special events on the books.</div>';

  // The title column matches the date's oversized font, so a long title
  // (e.g. "Gamer Zone Anniversary") would otherwise wrap to a second line.
  // Shrink each title just enough to read on one line instead, stopping at
  // a floor size rather than shrinking into illegibility — if it truly
  // can't fit even there, it wraps normally rather than clipping.
  function fitBoardTitles() {
    document.querySelectorAll('.eu-board .eu-name').forEach(el => {
      el.style.fontSize = '';
      const baseSize = parseFloat(getComputedStyle(el).fontSize);
      if (!baseSize) return;
      const minSize = baseSize * 0.55;
      let size = baseSize;
      // Shrink and check the ELEMENT'S OWN RENDERED HEIGHT against what a
      // true single line should measure (line-height:1, so one line is
      // exactly `size` tall) — this is the ground truth for whether text
      // actually wrapped. An earlier version forced white-space:nowrap to
      // read scrollWidth as a proxy for "would this fit on one line", but
      // that measurement doesn't reliably predict how the browser wraps
      // once white-space reverts to normal (this flex layout's available
      // width isn't stable across the two states), so it kept reporting a
      // false "fits" while the title still visibly wrapped to two lines.
      while (el.getBoundingClientRect().height > size * 1.3 && size > minSize) {
        size -= 1;
        el.style.fontSize = size + 'px';
      }
      if (el.getBoundingClientRect().height > size * 1.3) el.style.fontSize = '';
    });
  }
  fitBoardTitles();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitBoardTitles);
  // No debounce here on purpose: the social-capture script resizes the
  // viewport and screenshots again after its own short fixed wait, so a
  // debounced recalc here could easily lose that race and get captured
  // mid-flight. fitBoardTitles() itself is cheap (a handful of elements),
  // so recalculating on every resize event is fine.
  window.addEventListener('resize', fitBoardTitles);
})();
