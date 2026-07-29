/* Gamer Zone game library — grouped by platform (Steam, Epic Games, VR,
   Arcade, Racing Simulator), with filter chips and an A-Z view. Flat
   data-driven so filtering is just re-rendering, no duplicated markup. */
(function () {
  const list = document.getElementById('games-list');
  if (!list) return;
  const chipsWrap = document.getElementById('games-filters');

  const PLATFORMS = [
    { key: 'steam', label: 'Steam', emoji: '🖥️' },
    { key: 'epic', label: 'Epic Games', emoji: '🎮' },
    { key: 'vr', label: 'VR', emoji: '🥽' },
    { key: 'arcade', label: 'Arcade', emoji: '🕹️' },
    { key: 'racing-sim', label: 'Racing Simulator', emoji: '🏁' },
  ];
  const PLATFORM_BY_KEY = Object.fromEntries(PLATFORMS.map(p => [p.key, p]));

  const GAMES = [
    ['Fortnite','epic'],['PUBG','steam'],['Fall Guys','epic'],
    ['Super Animal Royale','steam'],['Naraka: Bladepoint','steam'],
    ['Counterstrike 2','steam'],['Apex Legends','steam'],['Valorant','steam'],
    ['Team Fortress 2','steam'],["Tom Clancy's Rainbow Six Siege",'steam'],
    ['The Finals','steam'],['Overwatch','steam'],['Helldivers 2','steam'],
    ['Left 4 Dead 2','steam'],['Deep Rock Galactic','steam'],['Marvel Rivals','steam'],
    ['League of Legends','steam'],['Dota 2','steam'],
    ['Teamfight Tactics','steam'],['Legends of Runeterra','steam'],
    ['StarCraft','steam'],['StarCraft II','steam'],
    ['Tekken 7','arcade'],['Tekken 8','arcade'],['Street Fighter 6','arcade'],
    ['Street Fighter Collection 30th Anniversary','arcade'],['Soul Caliber VI','arcade'],
    ['MARVEL vs. CAPCOM Fighting Collection: Arcade Classics','arcade'],
    ['MARVEL Cosmic Invasion','arcade'],['2XKO','arcade'],['Brawlhalla','arcade'],
    ['Among Us','arcade'],['Stumble Guys','arcade'],
    ['Overcooked All You Can Eat','arcade'],['Party Animals','arcade'],
    ['Golf With Your Friends','arcade'],['Ultimate Chicken Horse','arcade'],
    ['Castle Crashers','arcade'],['Drawful 2','arcade'],
    ['Jackbox Party Pack 4','arcade'],['Jackbox Party Pack 6','arcade'],
    ['Jackbox Party Pack 7','arcade'],
    ['Dead By Daylight','steam'],['Repo','steam'],['PEAK','steam'],
    ['PC Building Simulator 2','steam'],['PowerWash Simulator 2','steam'],
    ['Stardew Valley','steam'],['Minecraft','steam'],
    ['Roblox','steam'],['Maple Story','steam'],
    ['Guild Wars 2','steam'],['RV There Yet?','steam'],
    ['Where Winds Meet','steam'],['Mecca Chameleon','steam'],
    ['Bloons TD 6','steam'],
    ['Hogwarts Legacy','steam'],['Cyberpunk 2077','steam'],
    ['Hades 2','steam'],['Claire Obscure: Expedition 33','steam'],
    ['Metal Gear Solid: Snake Eater','steam'],
    ['Beat Saber','vr'],['Taiko no Tatsujin: Rhythm Festival The Setlist Edition','arcade'],
    ['Geometry Dash','arcade'],
    ['Forza Horizon 6','racing-sim'],['Asseto Corsa','racing-sim'],['Trackmania','racing-sim'],
    ['Arizona Sunshine® VR 2','vr'],['The Thrill of the Fight 2','vr'],
    ['Batman: Arkham Shadow','vr'],['Fruit Ninja','vr'],
    ['Teenage Mutant Ninja Turtles Empire City','vr'],['Population One','vr'],
    ['Kill It With Fire VR','vr'],['Among Us 3D: VR','vr'],
    ['Elder Scrolls V: Skyrim VR','vr'],['VRChat','vr'],['Doctor Who: The Edge of Time','vr'],
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
