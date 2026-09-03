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

  // Live square board: the real in-page Weekly Lineup board should read as
  // a filled square like the social-export screenshots, not a top-anchored
  // banner with dead space on a light week (see style.css's #week .eu-board
  // rule -- justify-content:center there does the actual centering, this
  // just supplies the min-height that makes it square in the first place).
  // Done here in JS, not with a CSS cqw value, because .eu-board is itself
  // the container-type:inline-size query container: a cqw length used on
  // that same element can't resolve against itself, so it silently fell
  // back to measuring against an ancestor (the viewport) instead of this
  // box's own rendered width -- confirmed via Playwright screenshots at
  // 400/640/900/1400px, which is exactly the kind of thing rule #6 says
  // not to skip. min-height only ever raises the floor, never clips: a
  // busy week's real content still pushes the box taller than square,
  // same as before this existed (rule #1 -- never truncate).
  (function squareBoardMinHeight() {
    const boards = document.querySelectorAll('#week .eu-board');
    if (!boards.length) return;
    const apply = () => boards.forEach(b => {
      b.style.minHeight = b.getBoundingClientRect().width + 'px';
    });
    apply();
    window.addEventListener('resize', apply);
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
    themeDesc = 'Free-to-play PCs, consoles, and VR, all week.';
  }

  // This theme week's full slate — used to list closures and any special
  // events (tournaments, majors, community, EDU, vendor) still on the books.
  const weekAll = (data.events || []).filter(e => e.date >= weekStart && e.date <= weekEnd);
  const remaining = weekAll.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));

  const monthDate = iso => {
    const d = new Date(iso + 'T12:00:00');
    return { mon: d.toLocaleDateString('en-US', { month: 'short' }), day: d.getDate() };
  };

  // Masthead layout: a single left-aligned line — date range, then the
  // theme name — matching how a Special Events row below it reads (date,
  // then title) and sized to match (var(--eu-date-size), the same token
  // the rows use) so the two never drift out of alignment at any
  // breakpoint. The separate right-aligned "WEEKLY THEME: <name>" element
  // this used to be split across is gone entirely; the label text itself
  // ("Weekly Theme:") is also dropped per request, since the date+name
  // format already reads unambiguously without it.
  const eyebrowTitleEl = document.getElementById('eu-eyebrow-title');
  if (eyebrowTitleEl) {
    const s = monthDate(weekStart), e = monthDate(weekEnd);
    const dateRange = s.mon === e.mon ? `${s.mon} ${s.day} - ${e.day}` : `${s.mon} ${s.day} - ${e.mon} ${e.day}`;
    eyebrowTitleEl.innerHTML = `${GZ.esc(dateRange.toUpperCase())}: <span class="eu-theme-highlight">${GZ.esc(themeName.toUpperCase())}</span>`;
  }
  // Weekly-theme subtitle line (the old #eu-eyebrow-desc paragraph, e.g.
  // "XP League Fortnite training and tournament play all week.") was
  // removed from the board entirely per request — themeDesc is still read
  // above (data/events.json still carries a desc field per theme, used
  // elsewhere), it's just never rendered on this board anymore.

  // Optional per-week badge art (data.weeklyThemes[].icon) shown bottom-
  // center of the board — e.g. a crown for a tournament week. Weeks
  // without an icon field just leave that slot empty.
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
    // Per-event boardDesc line (e.g. the Anniversary's extra paragraph) is
    // no longer rendered on this board at all, per request — data/events.json
    // may still carry a boardDesc field on some events, but it's simply
    // ignored here now rather than read into its own block.
    const descHtml = '';
    // Time subtagline moved out of .eu-info (the right-hand title column)
    // and into .eu-date-wrap, stacked under the date itself — per request,
    // it now left-aligns flush with the date's own left edge instead of
    // sitting under (and aligned to) the title on the right. Only rendered
    // when there's a time to show, so date-only rows don't pick up an
    // empty blank line underneath.
    return `<div class="eu-row${isMajor ? ' eu-major' : ''}${closure ? ' eu-closure' : ''}">
      <div class="eu-date-wrap">
        <div class="eu-date-top">
          <span class="eu-date">${mon.toUpperCase()} ${day}</span>
          ${isMajor ? '<span class="eu-major-mark" aria-hidden="true">&#9733;</span>' : ''}
        </div>
        ${ev.time ? `<div class="eu-meta">${GZ.esc(ev.time)}</div>` : ''}
      </div>
      <div class="eu-info">
        <div class="eu-name"${ev.boardNoShrink ? ' data-noshrink="1"' : ''}>${closure ? 'Closed: ' : ''}${GZ.esc(name.replace(/^Closed\s*[:—-]\s*/, ''))}</div>
      </div>
    </div>${descHtml}`;
  }

  // Chronological order, closures included in their real date slot rather
  // than grouped and listed first — `remaining` is already date-sorted
  // above, so rendering it directly (instead of splitting into a closures
  // list and a specials list and concatenating) is what keeps e.g. an
  // Aug 29 closure listed AFTER an Aug 28 tournament instead of before it.
  const rows = remaining.map(e => row(e, { closure: e.type === 'closed' }));

  list.innerHTML = rows.length
    ? rows.join('')
    : '<div class="calendar-empty">Just the weekly theme this week, no closures or special events on the books.</div>';

  // The title column matches the date's oversized font, so a long title
  // (e.g. "Gamer Zone Anniversary") would otherwise wrap to a second line.
  // Shrink each title just enough to read on one line instead, stopping at
  // a floor size rather than shrinking into illegibility — if it truly
  // can't fit even there, it wraps normally rather than clipping.
  //
  // The floor is deliberately tight (85% of the date's size, not the far
  // more permissive 55% this used to allow): a title that needs a bigger
  // cut than that to fit on one line reads as visibly mismatched against
  // the date next to it (e.g. "XP League Fortnite Tournament" was shrinking
  // to ~70% to fit, looking like a different type scale entirely). Titles
  // that only need a small trim still tuck onto one line; anything longer
  // just wraps to two lines at the date's full size instead of looking
  // undersized.
  function fitBoardTitles() {
    document.querySelectorAll('.eu-board .eu-name').forEach(el => {
      el.style.fontSize = '';
      // data-noshrink (set via ev.boardNoShrink) opts a title out of the
      // auto-fit-to-one-line behavior entirely — e.g. "XP League: Fortnite
      // Training" easily shrinks into one line on its own, but sits right
      // next to "XP League Fortnite Tournament" most weeks, which is too
      // long to shrink into one line and therefore always wraps to two —
      // left alone, the pair renders at two different sizes/line-counts
      // despite being a matched series. Skipping the shrink for Training
      // lets it wrap to two lines at full size too, matching Tournament's
      // fallback look exactly.
      if (el.dataset.noshrink) return;
      const baseSize = parseFloat(getComputedStyle(el).fontSize);
      if (!baseSize) return;
      const minSize = baseSize * 0.85;
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

  // The Weekly Lineup section is also a `.reveal` block (see main.js): it
  // sits rotated/translated/hidden (opacity:0) until scrolled into view,
  // then animates to its resting state over .7s. Both calls above normally
  // run before that reveal ever happens (data usually loads well before a
  // visitor scrolls this far down), so they measure titles against that
  // rotated/hidden geometry — an unreliable basis for "does this wrap?"
  // that could leave a title stuck at the wrong size once the section
  // actually becomes visible. Re-measuring once the reveal transition
  // finishes guarantees at least one correct pass against the section's
  // true resting layout.
  document.querySelectorAll('.eu-section.reveal').forEach(sec => {
    sec.addEventListener('transitionend', fitBoardTitles, { once: true });
  });
})();
