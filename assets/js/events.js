/* Events & calendar v2:
   - Weekly section = event flyers from events.json (image if present, styled
     fallback card from event data otherwise) + extra images from the manifest.
   - Monthly calendar images from manifest. Past content auto-archives. */

async function loadJSON(path) {
  try { const r = await fetch(path); return r.ok ? await r.json() : null; }
  catch { return null; }
}

function mondayOf(dateISO) {
  const d = new Date(dateISO + 'T12:00:00');
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

const TYPE_LABEL = { 'theme-night': 'Theme Day', tournament: 'Tournament', vendor: 'Vendor Event', edu: 'Training / EDU', community: 'Community', major: 'Major Event' };
const TYPE_ICON = { 'theme-night': 'gamepad', tournament: 'trophy', vendor: 'chip', edu: 'grad', community: 'users', major: 'medal' };

function flyerFallback(ev) {
  const d = new Date(ev.date + 'T12:00:00');
  const day = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const mon = d.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  return `<div class="flyer-card" style="--fc:${GZ.esc(ev.accent || '#FA9D28')}">
      <div class="fc-day">${day} · ${mon} <span class="fc-date">${d.getDate()}</span></div>
      <span class="fc-time">${GZ.esc(ev.time || '')}</span>
      <div class="fc-title">${GZ.esc(ev.title)}</div>
      <div class="fc-sub">${GZ.esc(ev.subtitle || '')}</div>
      <div class="fc-foot"><span><b>Always free</b> to play</span><span>walk-ins welcome</span><span>bring your squad</span></div>
    </div>`;
}

function flyerHTML(ev, past = false) {
  const fallback = flyerFallback(ev);
  const src = ev.flyerWeb || ev.flyer;
  const img = src
    ? `<img src="${GZ.esc(src)}" data-full="${GZ.esc(ev.flyer || src)}" alt="${GZ.esc(ev.title)} — ${GZ.esc(GZ.fmtDate(ev.date))} ${GZ.esc(ev.time || '')}" loading="lazy"
         onerror="this.closest('.flyer').innerHTML = this.closest('.flyer').dataset.fb">`
    : fallback;
  return `<div class="flyer${past ? ' past' : ''}" data-fb="${GZ.esc(fallback)}">${img}</div>`;
}

function calImg(item, folder) {
  return `<img class="calendar-img" src="assets/calendar/${folder}/${GZ.esc(item.file)}" alt="Gamer Zone ${folder} schedule ${GZ.esc(item.date)}" loading="lazy">`;
}

function eventCard(ev) {
  return `<div class="card tilt event-card" style="border-left-color:${GZ.esc(ev.accent || '#FA9D28')}">
    <span class="tag orange">${GZ.icon(TYPE_ICON[ev.type] || 'gamepad')} ${GZ.esc(TYPE_LABEL[ev.type] || ev.type)}</span>
    <h3>${GZ.esc(ev.title)}</h3>
    <p class="meta">${GZ.icon('cal')} ${GZ.fmtDate(ev.date)}${ev.time ? ' · ' + GZ.esc(ev.time) : ''} · ${ev.reservation ? 'Reservation recommended' : 'Walk-ins welcome'}</p>
    <p class="dim">${GZ.esc(ev.blurb)}</p>
  </div>`;
}

async function renderAll() {
  const [manifest, data] = await Promise.all([
    loadJSON('data/calendar-manifest.json'),
    loadJSON('data/events.json')
  ]);
  const events = (data && data.events || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const today = GZ.todayISO();
  const curMonth = today.slice(0, 7);
  const weekStart = mondayOf(today);
  const weekEndD = new Date(weekStart + 'T12:00:00'); weekEndD.setDate(weekEndD.getDate() + 6);
  const weekEnd = weekEndD.toISOString().slice(0, 10);

  const thisWeek = events.filter(e => e.date >= today && e.date <= weekEnd);
  const upcoming = events.filter(e => e.date >= today);
  const comingUp = events.filter(e => e.date > weekEnd);
  const past = events.filter(e => e.date < today).sort((a, b) => b.date.localeCompare(a.date));

  const elWeekly = document.getElementById('weekly-current');
  if (elWeekly) {
    let html = '';
    if (thisWeek.length) html += `<p class="kicker">This week</p><div class="flyer-rail">${thisWeek.map(e => flyerHTML(e)).join('')}</div>`;
    if (comingUp.length) html += `<p class="kicker" style="margin-top:1rem">Coming up</p><div class="flyer-rail">${comingUp.map(e => flyerHTML(e)).join('')}</div>`;
    elWeekly.innerHTML = html || `<div class="calendar-empty">This week's lineup drops soon — free play is always on.</div>`;
  }

  const elHome = document.getElementById('home-weekly');
  if (elHome) {
    elHome.innerHTML = upcoming.length
      ? `<div class="flyer-rail">${upcoming.slice(0, 6).map(e => flyerHTML(e)).join('')}</div>`
      : `<div class="calendar-empty">This week's lineup drops soon — free play is always on. <a href="events.html">See the calendar</a></div>`;
  }

  const monthly = (manifest && manifest.monthly || []);
  const monthlyCur = monthly.filter(x => x.date >= curMonth).sort((a, b) => a.date.localeCompare(b.date));
  const monthlyOld = monthly.filter(x => x.date < curMonth).sort((a, b) => b.date.localeCompare(a.date));
  const elMonthly = document.getElementById('monthly-current');
  if (elMonthly) {
    elMonthly.innerHTML = monthlyCur.length
      ? monthlyCur.map(x => calImg(x, 'monthly')).join('')
      : `<div class="calendar-empty">This month's calendar graphic is being cooked up — the event lineup above is live. Follow <a href="https://www.instagram.com/newegggamerzone/">@newegggamerzone</a> for drops.</div>`;
  }

  const elUp = document.getElementById('events-upcoming');
  if (elUp) elUp.innerHTML = upcoming.length ? upcoming.map(eventCard).join('') : '<p class="dim">New events posting soon.</p>';

  const elFeat = document.getElementById('home-featured-event');
  if (elFeat) {
    const feat = upcoming.find(e => e.featured) || upcoming[0];
    elFeat.innerHTML = feat ? eventCard(feat) : '<p class="dim">Big things brewing — check <a href="events.html">the calendar</a>.</p>';
  }

  const elArch = document.getElementById('calendar-archive');
  if (elArch) {
    const groups = {};
    past.forEach(e => { (groups[e.date.slice(0, 7)] = groups[e.date.slice(0, 7)] || { f: [], m: [] }).f.push(e); });
    monthlyOld.forEach(x => { (groups[x.date.slice(0, 7)] = groups[x.date.slice(0, 7)] || { f: [], m: [] }).m.push(x); });
    const keys = Object.keys(groups).sort().reverse();
    elArch.innerHTML = keys.length
      ? keys.map(k => {
          const label = new Date(k + '-15T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          const g = groups[k];
          return `<details class="archive-month"><summary>${label} (${g.f.length + g.m.length})</summary>
            ${g.m.length ? `<div class="grid cols-2">${g.m.map(x => calImg(x, 'monthly')).join('')}</div>` : ''}
            ${g.f.length ? `<div class="flyer-rail" style="margin-top:1rem">${g.f.map(e => flyerHTML(e, true)).join('')}</div>` : ''}
          </details>`;
        }).join('')
      : '<p class="dim">Past events and calendars will collect here automatically as weeks go by.</p>';
  }
}

document.addEventListener('DOMContentLoaded', renderAll);
