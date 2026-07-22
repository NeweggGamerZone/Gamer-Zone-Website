/* Renders the Zone Points leaderboard from data/leaderboard.json.
   #lb-full = full Top 10 table (leaderboard page); #lb-teaser = top 3 (home). */
(async function () {
  const full = document.getElementById('lb-full');
  const teaser = document.getElementById('lb-teaser');
  const period = document.getElementById('lb-period');
  if (!full && !teaser) return;
  let data;
  try { data = await (await fetch('data/leaderboard.json')).json(); }
  catch { if (full) full.innerHTML = '<p class="dim">Leaderboard updating…</p>'; return; }

  if (period && data.period) period.textContent = data.period;
  const medal = i => ['🥇', '🥈', '🥉'][i] || '';

  if (full) {
    const rows = data.players.map((p, i) => `<tr>
      <td class="rank">${i + 1}</td>
      <td class="user">${GZ.esc(p.username)}</td>
      <td class="game">${p.sessions} sessions · ${p.totalHours}h</td>
      <td class="pts">${p.zonePoints.toLocaleString()}</td>
    </tr>`).join('');
    full.innerHTML = `<table class="lb-table">
      <thead><tr><th>#</th><th>Gamer</th><th>Play</th><th style="text-align:right">Zone Points</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
  }
  if (teaser) {
    teaser.innerHTML = data.players.slice(0, 3).map((p, i) => `<div class="card tilt">
      <div style="font-family:var(--head);font-weight:800;font-size:1.6rem;color:var(--ne-orange)">${medal(i)} #${i + 1}</div>
      <h3 style="margin:.3rem 0 0">${GZ.esc(p.username)}</h3>
      <p class="dim" style="margin:0">${p.zonePoints.toLocaleString()} Zone Points</p>
    </div>`).join('');
  }
})();
