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
  // Show only the current week's remaining lineup (Mon–Sun containing today),
  // capped at 5 days — not the entire running schedule.
  const mondayOf = dateISO => {
    const d = new Date(dateISO + 'T12:00:00');
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return d.toISOString().slice(0, 10);
  };
  const weekStart = mondayOf(today);
  const weekEndD = new Date(weekStart + 'T12:00:00'); weekEndD.setDate(weekEndD.getDate() + 6);
  const weekEnd = weekEndD.toISOString().slice(0, 10);

  const events = (data.events || [])
    .filter(e => e.date >= today && e.date <= weekEnd && e.type !== 'closed')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const monthDate = iso => {
    const d = new Date(iso + 'T12:00:00');
    return { mon: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(), day: d.getDate() };
  };

  function row(ev) {
    const { mon, day } = monthDate(ev.date);
    const isMajor = ev.type === 'major' || ev.featured;
    return `<div class="eu-row${isMajor ? ' eu-major' : ''}">
      <div class="eu-date-wrap">
        <span class="eu-date">${mon} ${day}</span>
        ${isMajor ? '<span class="eu-major-mark" aria-hidden="true">&#9733;</span>' : ''}
      </div>
      <div class="eu-info">
        <div class="eu-name">${GZ.esc(ev.title)}</div>
        <div class="eu-meta">${ev.time ? GZ.esc(ev.time) : ''}</div>
      </div>
    </div>`;
  }

  list.innerHTML = events.length
    ? events.map(row).join('')
    : '<div class="calendar-empty">New dates dropping soon &mdash; check back shortly.</div>';
})();
