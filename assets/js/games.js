/* Gamer Zone game library — grouped by platform/station type (PC, Consoles,
   VR, Racing Simulator, Arcade, Party Games), with filter chips and an A-Z
   view. Flat data-driven so filtering is just re-rendering, no duplicated
   markup. PC folds together every launcher on the gaming PCs (Epic, Steam,
   Riot, Roblox, Battle.net, Microsoft Store); Consoles is the Nintendo
   Switch station; Arcade is fighting games only; Party Games covers the
   Jackbox/rhythm/party titles that used to live under Arcade. */
(function () {
  const list = document.getElementById('games-list');
  if (!list) return;
  const chipsWrap = document.getElementById('games-filters');

  const PLATFORMS = [
    { key: 'pc', label: 'PC', emoji: '🖥️' },
    { key: 'console', label: 'Consoles', emoji: '🎮' },
    { key: 'vr', label: 'VR', emoji: '🥽' },
    { key: 'racing-sim', label: 'Racing Simulator', emoji: '🏁' },
    { key: 'arcade', label: 'Arcade', emoji: '🕹️' },
    { key: 'party', label: 'Party Games', emoji: '🎉' },
  ];
  const PLATFORM_BY_KEY = Object.fromEntries(PLATFORMS.map(p => [p.key, p]));

  const GAMES = [
    // PC — Epic, Steam, Riot, Roblox, Battle.net, and Microsoft Store titles
    // on the gaming PCs.
    ['Fortnite', 'pc'], ['Rocket League', 'pc'], ['Fall Guys', 'pc'],
    ['PC Building Simulator 2', 'pc'], ['Hogwarts Legacy', 'pc'],
    ['Dota 2', 'pc'], ['Marvel Rivals', 'pc'], ['Naraka: Bladepoint', 'pc'],
    ['Aimlabs', 'pc'], ['Brawlhalla', 'pc'], ['Where Winds Meet', 'pc'],
    ['Team Fortress 2', 'pc'], ['Counter-Strike 2', 'pc'], ['Stumble Guys', 'pc'],
    ['Super Animal Royale', 'pc'], ['Helldivers 2', 'pc'], ['REPO', 'pc'],
    ['Among Us', 'pc'], ['Clair Obscur: Expedition 33', 'pc'],
    ['Metal Gear Solid: Snake Eater', 'pc'], ['Hades 2', 'pc'],
    ['Deep Rock Galactic', 'pc'], ['Arc Raiders', 'pc'],
    ['Overcooked! All You Can Eat', 'pc'], ['Stardew Valley', 'pc'],
    ['The Finals', 'pc'], ['MapleStory', 'pc'], ['Apex Legends', 'pc'],
    ['Trackmania', 'pc'], ["Tom Clancy's Rainbow Six Siege", 'pc'],
    ['Mecha Chameleon', 'pc'], ['Dead by Daylight', 'pc'], ['Cyberpunk 2077', 'pc'],
    ['PUBG', 'pc'], ['Geometry Dash', 'pc'],
    ['League of Legends', 'pc'], ['VALORANT', 'pc'], ['Teamfight Tactics', 'pc'],
    ['Legends of Runeterra', 'pc'],
    ['Roblox', 'pc'],
    ['Call of Duty: Warzone', 'pc'], ['Overwatch', 'pc'],
    ['Minecraft', 'pc'],

    // Consoles — Nintendo Switch station.
    ['Super Smash Bros.', 'console'], ['Mario Party', 'console'],
    ['Super Mario 3D World', 'console'], ['Mario Kart', 'console'],

    // VR headsets.
    ['Dumb Ways to Die VR', 'vr'], ['Dentist Game', 'vr'],
    ['Kill It With Fire VR', 'vr'], ['Beat Saber', 'vr'],

    // Racing Simulator rigs.
    ['Forza Horizon 6', 'racing-sim'], ['Assetto Corsa', 'racing-sim'],

    // Arcade — fighting games only.
    ['2XKO', 'arcade'], ['Street Fighter 6', 'arcade'],
    ['Street Fighter Collection 30th Anniversary', 'arcade'],
    ['MARVEL vs. CAPCOM Fighting Collection: Arcade Classics', 'arcade'],
    ['MARVEL Cosmic Invasion', 'arcade'], ['Tekken 7', 'arcade'],
    ['Tekken 8', 'arcade'], ['SoulCalibur VI', 'arcade'],

    // Party Games — Jackbox/rhythm/party titles, split out from Arcade.
    ['Taiko no Tatsujin: Rhythm Festival The Setlist Edition', 'party'],
    ['Jackbox Party Pack 4', 'party'], ['Jackbox Party Pack 6', 'party'],
    ['Jackbox Party Pack 7', 'party'], ['Drawful 2', 'party'],
    ['Castle Crashers', 'party'],
  ].map(([name, platform]) => ({ name, platform }));

  function panel(title, emoji, games) {
    const items = games.map(g => `<li><span class="gl-emoji" aria-hidden="true">${emoji}</span>${GZ.esc(g.name)}</li>`).join('');
    return `<section class="reveal in" style="margin-top:1.6rem">
      <h2>${emoji} ${GZ.esc(title)}</h2>
      <div class="game-list-panel" style="margin-top:1rem"><ul class="game-list">${items}</ul></div>
    </section>`;
  }

  function renderByPlatform() {
    list.innerHTML = PLATFORMS.map(p => {
      const games = GAMES.filter(x => x.platform === p.key);
      return games.length ? panel(p.label, p.emoji, games) : '';
    }).join('');
  }

  function renderAZ() {
    const sorted = GAMES.slice().sort((a, b) => a.name.localeCompare(b.name));
    list.innerHTML = panel('A–Z', '🔤', sorted);
  }

  function renderPlatform(key) {
    const p = PLATFORM_BY_KEY[key];
    const games = GAMES.filter(x => x.platform === key);
    list.innerHTML = panel(p.label, p.emoji, games);
  }

  function setActive(btn) {
    chipsWrap.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
  }

  chipsWrap.addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    setActive(btn);
    const mode = btn.dataset.mode;
    if (mode === 'platform') renderByPlatform();
    else if (mode === 'az') renderAZ();
    else renderPlatform(btn.dataset.platform);
  });

  renderByPlatform();
})();
