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
    const url = `../calendar/BGAssets/event-update-bg-week${weekOfMonth}.jpg`;
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
  // highlighted in orange right in the masthead, with the week's date
  // range immediately following it on that same title line (e.g. "MARVEL
  // WEEK AUG 4 – 8") rather than off on the far right of the subtitle.
  const eyebrowTitleEl = document.getElementById('eu-eyebrow-title');
  const eyebrowDescEl = document.getElementById('eu-eyebrow-desc');
  if (eyebrowTitleEl) {
    const s = monthDate(weekStart), e = monthDate(weekEnd);
    const dateRange = s.mon === e.mon ? `${s.mon} ${s.day} – ${e.day}` : `${s.mon} ${s.day} – ${e.mon} ${e.day}`;
    eyebrowTitleEl.innerHTML = `GAMER ZONE: <span class="eu-theme-highlight">${GZ.esc(themeName.toUpperCase())}</span><span class="eu-theme-dates">${GZ.esc(dateRange.toUpperCase())}</span>`;
  }
  if (eyebrowDescEl) eyebrowDescEl.textContent = themeDesc;

  function row(ev, { closure = false } = {}) {
    const { mon, day } = monthDate(ev.date);
    const isMajor = !closure && (ev.type === 'major' || ev.featured);
    return `<div class="eu-row${isMajor ? ' eu-major' : ''}${closure ? ' eu-closure' : ''}">
      <div class="eu-date-wrap">
        <span class="eu-date">${mon.toUpperCase()} ${day}</span>
        ${isMajor ? '<span class="eu-major-mark" aria-hidden="true">&#9733;</span>' : ''}
      </div>
      <div class="eu-info">
        <div class="eu-name">${closure ? 'Closed — ' : ''}${GZ.esc(ev.title.replace(/^Closed\s*[—-]\s*/, ''))}</div>
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
    : '<div class="calendar-empty">Just the weekly theme this week — no closures or special events on the books.</div>';
})();
