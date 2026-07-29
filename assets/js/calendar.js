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
  const verkada = (cfg.verkadaDailyUrl && cfg.verkadaDailyDate === today)
    ? cfg.verkadaDailyUrl : (cfg.verkadaUrl || cfg.reservationUrl);

  let data = { events: [] };
  try { data = await (await fetch('data/events.json')).json(); } catch {}
  const byDate = {};
  (data.events || []).forEach(e => { byDate[e.date] = e; });

  const TYPE = { 'theme-night': 'Theme Day', tournament: 'Tournament', vendor: 'Vendor Event', edu: 'Training / EDU', community: 'Community', major: 'Major Event' };
  // Color-code buckets: Closed=red, Free Play=blue, Theme Day=light blue,
  // EDU/Esports=green, Ambassador (vendor/community-hosted)=pink, Major/Tournament=orange.
  const TYPE_COLOR = { 'theme-night': 'cal-theme', tournament: 'cal-major', vendor: 'cal-amb', edu: 'cal-edu', community: 'cal-amb', major: 'cal-major' };
  // Full-bleed card backgrounds, sourced from assets/calendar/BGAssets — chosen
  // per event type so the popup reads as "photo of that kind of event" rather
  // than a generic flyer image.
  // Path is resolved relative to style.css (assets/css/), not this page,
  // since the value is substituted into a CSS custom property.
  const BG_DIR = '../calendar/BGAssets/';
  const TYPE_BG = {
    edu: BG_DIR + 'training-bg.jpg',
    tournament: BG_DIR + 'tournament-major-bg.jpg',
    major: BG_DIR + 'majorevent2-bg.jpg',
    'theme-night': BG_DIR + 'freeplay-bg2.jpg',
    vendor: BG_DIR + 'freeplay-bg3.jpg',
    community: BG_DIR + 'freeplay-bg3.jpg',
  };
  const FREE_PLAY_BG = BG_DIR + 'dailyplay-bg.jpg';
  function setCardBg(url) {
    if (url) detail.style.setProperty('--cd-bg', `url('${url}')`);
    else detail.style.removeProperty('--cd-bg');
  }
  const t0 = new Date(today + 'T12:00:00');
  let view = new Date(t0.getFullYear(), t0.getMonth(), 1);

  const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const pretty = dt => new Date(dt + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

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
      html += `<div class="${cls.join(' ')}" data-d="${dt}"><span class="dn">${d}</span></div>`;
    }
    grid.innerHTML = html;
  }

  function show(dt) {
    const e = byDate[dt], wd = new Date(dt + 'T12:00:00').getDay();
    const closedByType = !!(e && e.type === 'closed');
    const closed = (wd === 0 || wd === 1) || closedByType;
    const isToday = dt === today;
    const preregBlock = isToday
      ? `<p style="margin-top:.8rem"><a class="btn" href="${GZ.esc(verkada)}">Pre-register your visit</a></p><p class="dim" style="font-size:.78rem;margin-top:.4rem">Verkada registration is required — one per visitor.</p>`
      : '';
    if (e && !closedByType) {
      const typeCls = TYPE_COLOR[e.type] || 'cal-edu';
      setCardBg(TYPE_BG[e.type] || FREE_PLAY_BG);
      detail.innerHTML = `<span class="tag ${typeCls}">${GZ.esc(TYPE[e.type] || e.type || 'Event')}</span>
        <h3>${GZ.esc(e.title)}</h3>
        ${e.subtitle ? `<p class="cd-sub">${GZ.esc(e.subtitle)}</p>` : ''}
        <p class="dim">${pretty(dt)} · ${GZ.esc(e.time || '')}</p>
        <div class="cd-body">
          <p>${GZ.esc(e.blurb || '')}</p>
          ${preregBlock}
        </div>`;
    } else if (closed) {
      setCardBg(null);
      const reason = closedByType ? (e.blurb || '') : 'Closed. The Gamer Zone is open Tuesday through Saturday, 10am–7pm. See you then!';
      detail.innerHTML = `<span class="tag cal-closed">Closed</span><h3>${pretty(dt)}</h3><p class="dim">${GZ.esc(reason)}</p>`;
    } else {
      setCardBg(FREE_PLAY_BG);
      detail.innerHTML = `<span class="tag cal-free">Free Play</span><h3>${pretty(dt)}</h3>
        <p class="dim">Open 10am–7pm. Try the latest tech for free — walk in, or pre-register to skip the line at check-in.</p>
        ${preregBlock}`;
    }
    grid.querySelectorAll('.cal-cell.sel').forEach(c => c.classList.remove('sel'));
    const cell = grid.querySelector(`[data-d="${dt}"]`);
    if (cell) cell.classList.add('sel');
  }

  grid.addEventListener('click', e => {
    const c = e.target.closest('.cal-cell[data-d]');
    if (!c || c.classList.contains('closed')) return;
    show(c.dataset.d);
  });
  document.getElementById('cal-prev').addEventListener('click', () => { view.setMonth(view.getMonth() - 1); render(); });
  document.getElementById('cal-next').addEventListener('click', () => { view.setMonth(view.getMonth() + 1); render(); });

  render();
  const up = (data.events || []).filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  show(up ? up.date : today);
})();
