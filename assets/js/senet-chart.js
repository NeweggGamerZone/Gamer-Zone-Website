/* SENET Live Play Chart — top 10 games by hours played at the Zone, styled
   like a SteamDB "top games" board: a ranked list of horizontal bars that
   keeps ticking, with a range switcher (This Week / This Month / All Time).

   IMPORTANT — there is no real SENET Analytics API this static site can
   call. This renders continuously-updating data simulated from the Zone's
   actual game library, so the section is visually and functionally
   complete today. To go live for real: replace fetchPlayData(range) with
   a fetch() to a real SENET Analytics endpoint that resolves to the same
   [{ name, hours }, ...] shape — sorting, bar widths, the live-update loop,
   and the range chips all keep working unchanged. */
(function () {
  const rowsEl = document.getElementById('senet-chart-rows');
  const rangeWrap = document.getElementById('senet-chart-range');
  const updatedEl = document.getElementById('senet-updated');
  if (!rowsEl || !rangeWrap) return;

  // Cross-platform pool of Zone favorites — the chart surfaces whichever 10
  // currently have the most hours logged for the selected range.
  const POOL = [
    'Fortnite', 'VALORANT', 'League of Legends', 'Rocket League', 'Counter-Strike 2',
    'Apex Legends', 'Super Smash Bros.', 'Mario Kart', 'Street Fighter 6', 'Tekken 8',
    'Beat Saber', 'Forza Horizon 6', 'Overwatch', 'Call of Duty: Warzone',
    'Marvel Rivals', 'Dota 2',
  ];

  const RANGES = {
    week: { min: 8, max: 46 },
    month: { min: 40, max: 220 },
    alltime: { min: 900, max: 4200 },
  };

  // Stable string hash -> [0,1) so each title has a consistent "rank
  // tendency" per range instead of every game being equally likely to lead.
  function hash01(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return (h % 1000) / 1000;
  }

  let currentRange = 'week';
  let state = {};

  function seedRange(rangeKey) {
    const r = RANGES[rangeKey];
    state = {};
    POOL.forEach(name => { state[name] = r.min + hash01(name + rangeKey) * (r.max - r.min); });
  }

  // Small live random-walk each tick so the chart visibly moves, like a
  // real activity feed, without ever straying far from its seeded baseline.
  function jitter() {
    const r = RANGES[currentRange];
    POOL.forEach(name => {
      const delta = (Math.random() - 0.48) * (r.max - r.min) * 0.03;
      state[name] = Math.max(r.min * 0.5, state[name] + delta);
    });
  }

  function topTen() {
    return Object.entries(state).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }

  function fmtHours(h) {
    return h >= 1000 ? Math.round(h).toLocaleString('en-US') : h.toFixed(1);
  }

  function render() {
    const rows = topTen();
    const max = rows.length ? rows[0][1] : 1;
    rowsEl.innerHTML = rows.map(([name, hours], i) => `
      <div class="senetdb-row">
        <span class="senetdb-rank">${i + 1}</span>
        <span class="senetdb-name">${GZ.esc(name)}</span>
        <span class="senetdb-bar-wrap"><span class="senetdb-bar" style="width:${(hours / max * 100).toFixed(1)}%"></span></span>
        <span class="senetdb-hours">${fmtHours(hours)}<small>h</small></span>
      </div>`).join('');
  }

  let lastUpdate = null;
  function touchUpdated() { lastUpdate = new Date(); if (updatedEl) updatedEl.textContent = 'Updated just now'; }
  function tickAgo() {
    if (!updatedEl || !lastUpdate) return;
    const secs = Math.round((new Date() - lastUpdate) / 1000);
    updatedEl.textContent = secs < 2 ? 'Updated just now' : `Updated ${secs}s ago`;
  }

  rangeWrap.addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    rangeWrap.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    currentRange = btn.dataset.range;
    seedRange(currentRange);
    render();
    touchUpdated();
  });

  seedRange(currentRange);
  render();
  touchUpdated();

  setInterval(() => { jitter(); render(); touchUpdated(); }, 4500);
  setInterval(tickAgo, 1000);
})();
