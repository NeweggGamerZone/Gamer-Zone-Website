/* Renders the Top Visitors leaderboard (top 5) into #home-leaderboard on the home page. */
(async function () {
  const el = document.getElementById('home-leaderboard');
  if (!el) return;
  let data;
  try { data = await (await fetch('data/leaderboard.json')).json(); }
  catch { el.innerHTML = '<p class="dim">Leaderboard updating…</p>'; return; }
  const TROPHY = ['🥇','🥈','🥉'];
  const rows = (data.players||[]).slice(0,3).map((p,i)=>`<div class="lbx-row${i===0?' top':''}">
    <span class="lbx-rank" aria-label="Rank ${i+1}">${TROPHY[i] || (i+1)}</span>
    <span class="lbx-user">${GZ.esc(p.username)}</span>
    <span class="lbx-meta">${p.sessions} sessions · ${p.totalHours}h</span>
    <span class="lbx-pts">${p.zonePoints.toLocaleString()}<small>pts</small></span>
  </div>`).join('');
  el.innerHTML = `<div class="lbx">${rows}</div>`;
})();
