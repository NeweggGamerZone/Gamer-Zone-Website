/* Gamer Zone game library — organized by physical device/station (PC,
   Consoles, VR, Racing Simulators, Arcade), with an A-Z view and a second
   set of genre tags (Co-op, Single Player, Competitive) that filter across
   every device. Flat data-driven so filtering is just re-rendering, no
   duplicated markup, no emoji — flat SVG icons from the shared icon set and
   plain bulleted lists. Every list is automatically alphabetized. */
(function () {
  const list = document.getElementById('games-list');
  if (!list) return;
  const chipsWrap = document.getElementById('games-filters');
  const genreWrap = document.getElementById('games-genre-filters');
  const top5El = document.getElementById('games-top5');

  // Top 5 most-played games this month, by total hours logged at the Zone.
  const TOP5 = [
    { name: 'Valorant', hours: '151h 8m' },
    { name: 'League of Legends', hours: '96h 14m' },
    { name: 'Overwatch 2', hours: '78h 17m' },
    { name: 'Fortnite', hours: '71h 43m' },
    { name: 'Marvel Rivals', hours: '33h 51m' },
  ];

  if (top5El) {
    top5El.innerHTML = `<div class="lbx">${TOP5.map((g, i) => `<div class="lbx-row${i === 0 ? ' top' : ''}">
      <span class="lbx-rank" aria-label="Rank ${i + 1}">${i + 1}</span>
      <span class="lbx-user">${GZ.esc(g.name)}</span>
      <span class="lbx-meta">Total hours played this month</span>
      <span class="lbx-pts">${GZ.esc(g.hours)}</span>
    </div>`).join('')}</div>`;
  }

  const PLATFORMS = [
    { key: 'pc', label: 'PC', icon: 'pc' },
    { key: 'console', label: 'Consoles', icon: 'gamepad' },
    { key: 'vr', label: 'VR', icon: 'vr' },
    { key: 'racing-sim', label: 'Racing Simulators', icon: 'wheel' },
    { key: 'arcade', label: 'Arcade', icon: 'zero' },
  ];
  const PLATFORM_BY_KEY = Object.fromEntries(PLATFORMS.map(p => [p.key, p]));

  const GENRES = [
    { key: 'coop', label: 'Co-op' },
    { key: 'single', label: 'Single Player' },
    { key: 'competitive', label: 'Competitive' },
  ];
  const GENRE_BY_KEY = Object.fromEntries(GENRES.map(g => [g.key, g]));

  // Physical systems/notes shown alongside a platform's game list.
  const PLATFORM_NOTE = {
    pc: '25 gaming PCs available.',
    console: 'Systems: Xbox &middot; Nintendo Switch 2 &middot; PlayStation 5 &middot; Retro Games Emulator',
  };

  // VR sub-label — which headset/storefront each title runs on.
  const VR_SYSTEM = {
    'Beat Saber': 'Meta Quest & Steam VR',
    'Kill It With Fire VR': 'Meta Quest & Steam VR',
    'Dumb Ways to Die VR': 'Meta Quest only',
  };

  // [name, platform, genre?]
  const GAMES = [
    // PC — every launcher on the gaming PCs (Epic, Steam, Riot, Roblox, Battle.net, Microsoft Store).
    ['Fortnite', 'pc', 'competitive'], ['Rocket League', 'pc', 'competitive'], ['Fall Guys', 'pc', 'competitive'],
    ['PC Building Simulator 2', 'pc', 'single'], ['Hogwarts Legacy', 'pc', 'single'],
    ['Dota 2', 'pc', 'competitive'], ['Marvel Rivals', 'pc', 'competitive'], ['Naraka: Bladepoint', 'pc', 'competitive'],
    ['Aimlabs', 'pc'], ['Brawlhalla', 'pc', 'competitive'], ['Where Winds Meet', 'pc', 'single'],
    ['Team Fortress 2', 'pc', 'competitive'], ['Counter-Strike 2', 'pc', 'competitive'], ['Stumble Guys', 'pc', 'competitive'],
    ['Super Animal Royale', 'pc', 'competitive'], ['Helldivers 2', 'pc', 'coop'], ['REPO', 'pc', 'coop'],
    ['Among Us', 'pc', 'coop'], ['Clair Obscur: Expedition 33', 'pc', 'single'],
    ['Metal Gear Solid: Snake Eater', 'pc', 'single'], ['Hades 2', 'pc', 'single'],
    ['Deep Rock Galactic', 'pc', 'coop'], ['Arc Raiders', 'pc', 'competitive'],
    ['Overcooked! All You Can Eat', 'pc', 'coop'], ['Stardew Valley', 'pc', 'single'],
    ['The Finals', 'pc', 'competitive'], ['MapleStory', 'pc'], ['Apex Legends', 'pc', 'competitive'],
    ['Trackmania', 'pc', 'competitive'], ["Tom Clancy's Rainbow Six Siege", 'pc', 'competitive'],
    ['Mecha Chameleon', 'pc'], ['Dead by Daylight', 'pc', 'competitive'], ['Cyberpunk 2077', 'pc', 'single'],
    ['PUBG', 'pc', 'competitive'], ['Geometry Dash', 'pc', 'single'],
    ['League of Legends', 'pc', 'competitive'], ['VALORANT', 'pc', 'competitive'], ['Teamfight Tactics', 'pc', 'competitive'],
    ['Legends of Runeterra', 'pc', 'competitive'],
    ['Roblox', 'pc'],
    ['Call of Duty: Warzone', 'pc', 'competitive'], ['Overwatch', 'pc', 'competitive'],
    // Party titles — played on the PCs, tagged Co-op.
    ['Taiko no Tatsujin: Rhythm Festival The Setlist Edition', 'pc', 'coop'],
    ['Jackbox Party Pack 4', 'pc', 'coop'], ['Jackbox Party Pack 6', 'pc', 'coop'],
    ['Jackbox Party Pack 7', 'pc', 'coop'], ['Drawful 2', 'pc', 'coop'],
    ['Castle Crashers', 'pc', 'coop'],

    // Consoles — Nintendo Switch station.
    ['Super Smash Bros.', 'console', 'competitive'], ['Mario Party', 'console', 'coop'],
    ['Super Mario 3D World', 'console', 'coop'], ['Mario Kart', 'console', 'competitive'],

    // VR headsets.
    ['Dumb Ways to Die VR', 'vr'], ['Kill It With Fire VR', 'vr'], ['Beat Saber', 'vr'],

    // Racing Simulator rigs.
    ['Forza Horizon 6', 'racing-sim'], ['Assetto Corsa', 'racing-sim'],

    // Arcade — fighting games only.
    ['2XKO', 'arcade', 'competitive'], ['Street Fighter 6', 'arcade', 'competitive'],
    ['Street Fighter Collection 30th Anniversary', 'arcade', 'competitive'],
    ['MARVEL vs. CAPCOM Fighting Collection: Arcade Classics', 'arcade', 'competitive'],
    ['MARVEL Cosmic Invasion', 'arcade', 'competitive'], ['Tekken 7', 'arcade', 'competitive'],
    ['Tekken 8', 'arcade', 'competitive'], ['SoulCalibur VI', 'arcade', 'competitive'],
  ].map(([name, platform, genre]) => ({ name, platform, genre: genre || null }));

  function byName(a, b) { return a.name.localeCompare(b.name); }

  function itemLine(g) {
    const subText = g.platform === 'vr' && VR_SYSTEM[g.name] ? ` — ${VR_SYSTEM[g.name]}` : '';
    const sub = subText ? ` <span class="dim" style="font-size:.82em">${GZ.esc(subText)}</span>` : '';
    // Full name (+ VR system, if any) truncates to one line with an ellipsis so
    // every row is the same length regardless of title length; data-full
    // drives a pure-CSS hover popup showing the untruncated text.
    return `<li data-full="${GZ.esc(g.name + subText)}"><span class="gl-name">${GZ.esc(g.name)}</span>${sub}</li>`;
  }

  function panel(title, iconName, games, note) {
    const items = games.slice().sort(byName).map(itemLine).join('');
    const icon = iconName ? GZ.icon(iconName, 'ic') : '';
    return `<section class="reveal in" style="margin-top:1.6rem">
      <h2>${icon} ${GZ.esc(title)}</h2>
      ${note ? `<p class="dim console-systems">${note}</p>` : ''}
      <div class="game-list-panel" style="margin-top:1rem"><ul class="game-list">${items}</ul></div>
    </section>`;
  }

  function renderByPlatform() {
    list.innerHTML = PLATFORMS.map(p => {
      const games = GAMES.filter(x => x.platform === p.key);
      return games.length ? panel(p.label, p.icon, games, PLATFORM_NOTE[p.key]) : '';
    }).join('');
  }

  function renderAZ() {
    list.innerHTML = panel('A–Z', null, GAMES);
  }

  function renderPlatform(key) {
    const p = PLATFORM_BY_KEY[key];
    const games = GAMES.filter(x => x.platform === key);
    list.innerHTML = panel(p.label, p.icon, games, PLATFORM_NOTE[key]);
  }

  function renderGenre(key) {
    const g = GENRE_BY_KEY[key];
    const games = GAMES.filter(x => x.genre === key);
    list.innerHTML = panel(g.label, null, games);
  }

  function setActive(wrap, btn) {
    wrap.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
  }

  chipsWrap.addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    setActive(chipsWrap, btn);
    if (genreWrap) genreWrap.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    const mode = btn.dataset.mode;
    if (mode === 'platform') renderByPlatform();
    else if (mode === 'az') renderAZ();
    else renderPlatform(btn.dataset.platform);
  });

  if (genreWrap) {
    genreWrap.addEventListener('click', e => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      setActive(genreWrap, btn);
      chipsWrap.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      renderGenre(btn.dataset.genre);
    });
  }

  renderByPlatform();
})();
