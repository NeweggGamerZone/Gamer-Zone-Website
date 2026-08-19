/* Renders the Most Dedicated Gamers leaderboard (top 3) into #home-leaderboard
   on the home page. Sessions and hours played are the highlighted (blue)
   numbers here — not Zone Points, which stays out of the spotlight. */
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
    <span class="lbx-stats">
      <span class="lbx-stat"><strong>${p.sessions}</strong><small>sessions</small></span>
      <span class="lbx-stat"><strong>${p.totalHours}</strong><small>hrs played</small></span>
    </span>
  </div>`).join('');
  el.innerHTML = `<div class="lbx">${rows}</div>`;
})();
